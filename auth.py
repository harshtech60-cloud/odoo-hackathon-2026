"""Accounts, roles, sessions, CSRF protection and the customer portal.

Roles
-----
admin     Controls the whole system. The only role that can add staff,
          products, plans and discount rules.
staff     Day-to-day work: customers, subscriptions, invoices, payments.
customer  Sees only their own subscriptions and invoices (portal).
"""

import hashlib
import logging
import os
import re
import secrets
import smtplib
import time
from datetime import datetime, timedelta
from email.message import EmailMessage
from functools import wraps
from pathlib import Path
from urllib.parse import urlparse

from flask import (
    abort, flash, g, redirect, render_template, request,
    session, url_for
)
from werkzeug.security import check_password_hash, generate_password_hash

from database import get_db_connection

log = logging.getLogger("brightloop.auth")

# ---------------------------------------------------------------------
# Access rules (endpoint names are the Flask view function names)
# ---------------------------------------------------------------------

PUBLIC_ENDPOINTS = {
    "static", "login", "register", "forgot_password", "reset_password"
}

# Endpoints a customer may use (their own data only, checked below)
CUSTOMER_ENDPOINTS = {
    "portal", "print_invoice", "update_subscription_status", "logout"
}

# Customers may only do these things to their own subscription
CUSTOMER_SUBSCRIPTION_ACTIONS = {"pause", "resume", "close"}

# Pages only the admin may open
ADMIN_ONLY_ENDPOINTS = {"staff", "create_staff", "toggle_staff"}

# Pages staff can read, but only the admin may change
ADMIN_WRITE_ENDPOINTS = {
    "products", "add_product_variant", "plans",
    "add_discount", "toggle_discount", "delete_discount",
    "quotation_templates", "add_quotation_template",
    "delete_quotation_template",
}

PASSWORD_RULE = (
    "Use more than 8 characters, with an uppercase letter, "
    "a lowercase letter and a special character."
)

RESET_LINK_MINUTES = 60
MAX_LOGIN_ATTEMPTS = 6
LOGIN_WINDOW_SECONDS = 600

_login_attempts = {}


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def validate_password(password):
    """Return an error message, or None when the password is acceptable."""

    if (
        len(password) <= 8
        or not re.search(r"[A-Z]", password)
        or not re.search(r"[a-z]", password)
        or not re.search(r"[^A-Za-z0-9\s]", password)
    ):
        return PASSWORD_RULE

    return None


def valid_email(email):
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email))


def hash_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


def safe_next(target):
    """Only allow redirects back to this site."""

    if not target:
        return None

    parsed = urlparse(target)

    if parsed.scheme or parsed.netloc or not target.startswith("/"):
        return None

    if target.startswith("//"):
        return None

    return target


def home_for(role):
    return url_for("portal") if role == "customer" else url_for("dashboard")


def get_secret_key(base_dir):
    """Use SECRET_KEY if set, otherwise create and reuse a key file."""

    env_key = os.environ.get("SECRET_KEY")

    if env_key:
        return env_key

    key_file = Path(base_dir) / ".secret_key"

    try:
        if key_file.exists():
            return key_file.read_text().strip()

        key = secrets.token_hex(32)
        key_file.write_text(key)

        try:
            key_file.chmod(0o600)
        except OSError:
            pass

        return key

    except OSError:
        # Read-only disk: fall back to a per-process key
        return secrets.token_hex(32)


def too_many_attempts(key):
    now = time.time()

    recent = [
        t for t in _login_attempts.get(key, [])
        if now - t < LOGIN_WINDOW_SECONDS
    ]

    _login_attempts[key] = recent

    return len(recent) >= MAX_LOGIN_ATTEMPTS


def record_failed_attempt(key):
    _login_attempts.setdefault(key, []).append(time.time())


def send_reset_email(to_email, link):
    """Email the reset link, or print it when SMTP is not configured."""

    host = os.environ.get("SMTP_HOST")

    if not host:
        log.warning(
            "SMTP is not configured. Password reset link for %s: %s",
            to_email, link
        )
        print(f"[Brightloop] Password reset link for {to_email}: {link}")
        return

    message = EmailMessage()
    message["Subject"] = "Reset your Brightloop password"
    message["From"] = os.environ.get(
        "SMTP_FROM", "no-reply@brightloop.example"
    )
    message["To"] = to_email
    message.set_content(
        "We received a request to reset your Brightloop password.\n\n"
        f"Open this link within {RESET_LINK_MINUTES} minutes:\n{link}\n\n"
        "If you did not ask for this, you can ignore this email."
    )

    port = int(os.environ.get("SMTP_PORT", "587"))

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()

            user = os.environ.get("SMTP_USER")

            if user:
                server.login(user, os.environ.get("SMTP_PASSWORD", ""))

            server.send_message(message)

    except (OSError, smtplib.SMTPException):
        log.exception("Could not send reset email to %s", to_email)


def ensure_admin():
    """Create the first admin account when none exists."""

    connection = get_db_connection()

    try:
        exists = connection.execute(
            "SELECT 1 FROM users WHERE role = 'admin' LIMIT 1"
        ).fetchone()

        if exists:
            return

        email = os.environ.get("ADMIN_EMAIL", "admin@brightloop.com")
        password = os.environ.get("ADMIN_PASSWORD")

        if not password:
            password = "Admin@12345"
            log.warning(
                "Created demo admin %s with the default password. "
                "Set ADMIN_EMAIL and ADMIN_PASSWORD before real use.",
                email
            )

        connection.execute("""
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, 'admin')
        """, ("Administrator", email.lower(),
              generate_password_hash(password)))

        connection.commit()

    finally:
        connection.close()


def login_user(user_id):
    session.clear()
    session["uid"] = user_id
    session["csrf"] = secrets.token_urlsafe(24)
    session.permanent = True


# ---------------------------------------------------------------------
# Wiring
# ---------------------------------------------------------------------

def register_auth(app):

    app.config.update(
        SECRET_KEY=get_secret_key(app.root_path),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE") == "1",
        PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
    )

    # ---------------- CSRF ----------------

    def csrf_token():
        if "csrf" not in session:
            session["csrf"] = secrets.token_urlsafe(24)
        return session["csrf"]

    app.jinja_env.globals["csrf_token"] = csrf_token

    # ---------------- Request guard ----------------

    @app.before_request
    def guard():

        # Load the signed-in user
        g.user = None

        user_id = session.get("uid")

        if user_id:
            connection = get_db_connection()

            try:
                row = connection.execute("""
                    SELECT id, name, email, role, customer_id, is_active
                    FROM users WHERE id = ?
                """, (user_id,)).fetchone()
            finally:
                connection.close()

            if row and row["is_active"]:
                g.user = dict(row)
            else:
                session.clear()

        # CSRF check on every form post
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            sent = request.form.get("csrf_token", "")
            expected = session.get("csrf", "")

            if not expected or not secrets.compare_digest(sent, expected):
                abort(400, description="Your session expired. Reload the page and try again.")

        endpoint = request.endpoint

        if endpoint is None or endpoint in PUBLIC_ENDPOINTS:
            return None

        if g.user is None:
            return redirect(url_for("login", next=request.full_path.rstrip("?")))

        role = g.user["role"]

        # ----- customers: own data only -----
        if role == "customer":

            if endpoint == "dashboard":
                return redirect(url_for("portal"))

            if endpoint not in CUSTOMER_ENDPOINTS:
                abort(403)

            return check_customer_ownership(endpoint)

        # ----- staff and admin -----
        if endpoint == "portal":
            return redirect(url_for("dashboard"))

        if role != "admin":

            if endpoint in ADMIN_ONLY_ENDPOINTS:
                abort(403)

            if (
                endpoint in ADMIN_WRITE_ENDPOINTS
                and request.method != "GET"
            ):
                abort(403)

        return None

    def check_customer_ownership(endpoint):
        customer_id = g.user["customer_id"]
        args = request.view_args or {}

        connection = get_db_connection()

        try:
            if endpoint == "print_invoice":
                row = connection.execute(
                    "SELECT customer_id FROM invoices WHERE id = ?",
                    (args.get("invoice_id"),)
                ).fetchone()

                if not row or row["customer_id"] != customer_id:
                    abort(404)

            elif endpoint == "update_subscription_status":
                row = connection.execute(
                    "SELECT customer_id FROM subscriptions WHERE id = ?",
                    (args.get("subscription_id"),)
                ).fetchone()

                if not row or row["customer_id"] != customer_id:
                    abort(404)

                if (
                    request.form.get("action")
                    not in CUSTOMER_SUBSCRIPTION_ACTIONS
                ):
                    abort(403)
        finally:
            connection.close()

        return None

    @app.context_processor
    def inject_user():
        return {"current_user": getattr(g, "user", None)}

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "same-origin")

        # Pages show private billing data, so keep them out of caches
        if request.endpoint != "static":
            response.headers.setdefault("Cache-Control", "no-store")

        return response

    @app.errorhandler(403)
    def forbidden(error):
        return render_template(
            "error.html", code=403,
            title="You do not have access to this page",
            text="Ask an administrator if you need it."
        ), 403

    @app.errorhandler(404)
    def not_found(error):
        return render_template(
            "error.html", code=404,
            title="We could not find that page",
            text="The link may be old, or the record may not exist."
        ), 404

    @app.errorhandler(400)
    def bad_request(error):
        return render_template(
            "error.html", code=400,
            title="That request could not be processed",
            text=getattr(error, "description", "")
        ), 400

    # ---------------- Sign in / out ----------------

    @app.route("/login", methods=["GET", "POST"])
    def login():

        if g.user:
            return redirect(home_for(g.user["role"]))

        error = None
        email = ""

        if request.method == "POST":
            email = request.form.get("email", "").strip().lower()
            password = request.form.get("password", "")
            key = (request.remote_addr, email)

            if too_many_attempts(key):
                error = "Too many attempts. Wait a few minutes and try again."

            else:
                connection = get_db_connection()

                try:
                    user = connection.execute(
                        "SELECT * FROM users WHERE email = ?", (email,)
                    ).fetchone()
                finally:
                    connection.close()

                # Always run a hash check so timing does not reveal accounts
                stored = user["password_hash"] if user else generate_password_hash("x")
                ok = check_password_hash(stored, password)

                if user and ok and user["is_active"]:
                    login_user(user["id"])
                    target = safe_next(request.args.get("next"))
                    return redirect(target or home_for(user["role"]))

                record_failed_attempt(key)

                if user and ok and not user["is_active"]:
                    error = "This account has been deactivated."
                else:
                    error = "The email or password is not correct."

        return render_template("login.html", error=error, email=email)

    @app.route("/logout", methods=["POST"])
    def logout():
        session.clear()
        return redirect(url_for("login"))

    # ---------------- Customer sign up ----------------

    @app.route("/register", methods=["GET", "POST"])
    def register():

        if g.user:
            return redirect(home_for(g.user["role"]))

        error = None
        form = {"name": "", "email": "", "company": "", "phone": ""}

        if request.method == "POST":
            form = {
                key: request.form.get(key, "").strip()
                for key in form
            }
            form["email"] = form["email"].lower()
            password = request.form.get("password", "")
            confirm = request.form.get("confirm", "")

            if not form["name"] or not form["email"]:
                error = "Your name and email are required."

            elif not valid_email(form["email"]):
                error = "Enter a valid email address."

            elif validate_password(password):
                error = validate_password(password)

            elif password != confirm:
                error = "The two passwords do not match."

            else:
                connection = get_db_connection()

                try:
                    taken = connection.execute(
                        "SELECT 1 FROM users WHERE email = ?",
                        (form["email"],)
                    ).fetchone()

                    if taken:
                        error = "An account with this email already exists."

                    else:
                        # Reuse the customer record staff already created
                        customer = connection.execute(
                            "SELECT id FROM customers WHERE email = ?",
                            (form["email"],)
                        ).fetchone()

                        if customer:
                            customer_id = customer["id"]
                        else:
                            customer_id = connection.execute("""
                                INSERT INTO customers
                                    (name, email, company, phone)
                                VALUES (?, ?, ?, ?)
                            """, (form["name"], form["email"],
                                  form["company"], form["phone"])
                            ).lastrowid

                        user_id = connection.execute("""
                            INSERT INTO users
                                (name, email, password_hash, role, customer_id)
                            VALUES (?, ?, ?, 'customer', ?)
                        """, (form["name"], form["email"],
                              generate_password_hash(password),
                              customer_id)).lastrowid

                        connection.commit()

                        login_user(user_id)
                        return redirect(url_for("portal"))
                finally:
                    connection.close()

        return render_template(
            "register.html", error=error, form=form,
            password_rule=PASSWORD_RULE
        )

    # ---------------- Password reset ----------------

    @app.route("/forgot-password", methods=["GET", "POST"])
    def forgot_password():

        sent = False

        if request.method == "POST":
            email = request.form.get("email", "").strip().lower()

            connection = get_db_connection()

            try:
                user = connection.execute(
                    "SELECT id, email FROM users WHERE email = ? AND is_active = 1",
                    (email,)
                ).fetchone()

                if user:
                    token = secrets.token_urlsafe(32)
                    expires = (
                        datetime.utcnow()
                        + timedelta(minutes=RESET_LINK_MINUTES)
                    ).isoformat()

                    connection.execute("""
                        INSERT INTO password_resets
                            (user_id, token_hash, expires_at)
                        VALUES (?, ?, ?)
                    """, (user["id"], hash_token(token), expires))
                    connection.commit()

                    link = url_for(
                        "reset_password", token=token, _external=True
                    )
                    send_reset_email(user["email"], link)
            finally:
                connection.close()

            # Same answer whether or not the email exists
            sent = True

        return render_template("forgot_password.html", sent=sent)

    @app.route("/reset-password/<token>", methods=["GET", "POST"])
    def reset_password(token):

        connection = get_db_connection()

        try:
            reset = connection.execute("""
                SELECT * FROM password_resets
                WHERE token_hash = ? AND used = 0
            """, (hash_token(token),)).fetchone()

            valid = bool(
                reset
                and datetime.fromisoformat(reset["expires_at"])
                > datetime.utcnow()
            )

            error = None

            if valid and request.method == "POST":
                password = request.form.get("password", "")
                confirm = request.form.get("confirm", "")

                if validate_password(password):
                    error = validate_password(password)

                elif password != confirm:
                    error = "The two passwords do not match."

                else:
                    connection.execute(
                        "UPDATE users SET password_hash = ? WHERE id = ?",
                        (generate_password_hash(password), reset["user_id"])
                    )
                    connection.execute(
                        "UPDATE password_resets SET used = 1 WHERE user_id = ?",
                        (reset["user_id"],)
                    )
                    connection.commit()

                    flash("Your password was changed. Sign in with it now.")
                    return redirect(url_for("login"))

            return render_template(
                "reset_password.html", valid=valid, error=error,
                password_rule=PASSWORD_RULE
            )
        finally:
            connection.close()

    # ---------------- Staff management (admin) ----------------

    @app.route("/staff")
    def staff():

        connection = get_db_connection()

        try:
            members = connection.execute("""
                SELECT id, name, email, role, is_active, created_at
                FROM users
                WHERE role IN ('admin', 'staff')
                ORDER BY role, name
            """).fetchall()
        finally:
            connection.close()

        return render_template(
            "staff.html", members=members,
            password_rule=PASSWORD_RULE,
            error=request.args.get("error"),
            message=request.args.get("message")
        )

    @app.route("/staff/add", methods=["POST"])
    def create_staff():

        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        error = None

        if not name or not email:
            error = "Name and email are required."
        elif not valid_email(email):
            error = "Enter a valid email address."
        elif validate_password(password):
            error = validate_password(password)

        if error is None:
            connection = get_db_connection()

            try:
                taken = connection.execute(
                    "SELECT 1 FROM users WHERE email = ?", (email,)
                ).fetchone()

                if taken:
                    error = "An account with this email already exists."
                else:
                    connection.execute("""
                        INSERT INTO users (name, email, password_hash, role)
                        VALUES (?, ?, ?, 'staff')
                    """, (name, email, generate_password_hash(password)))
                    connection.commit()
            finally:
                connection.close()

        if error:
            return redirect(url_for("staff", error=error))

        return redirect(url_for("staff", message="Staff member added."))

    @app.route("/staff/<int:user_id>/toggle", methods=["POST"])
    def toggle_staff(user_id):

        if user_id == g.user["id"]:
            return redirect(url_for(
                "staff", error="You cannot deactivate your own account."
            ))

        connection = get_db_connection()

        try:
            connection.execute("""
                UPDATE users
                SET is_active = 1 - is_active
                WHERE id = ? AND role = 'staff'
            """, (user_id,))
            connection.commit()
        finally:
            connection.close()

        return redirect(url_for("staff", message="Staff account updated."))

    # ---------------- Customer portal ----------------

    @app.route("/portal")
    def portal():

        customer_id = g.user["customer_id"]

        connection = get_db_connection()

        try:
            subscriptions = connection.execute("""
                SELECT s.*, p.name AS plan_name, p.billing_frequency,
                       p.allow_pause, p.allow_early_close
                FROM subscriptions s
                JOIN subscription_plans p ON p.id = s.plan_id
                WHERE s.customer_id = ?
                ORDER BY s.id DESC
            """, (customer_id,)).fetchall()

            invoices = connection.execute("""
                SELECT i.*,
                       COALESCE((
                           SELECT SUM(amount) FROM payments
                           WHERE invoice_id = i.id AND status = 'Completed'
                       ), 0) AS paid_amount
                FROM invoices i
                WHERE i.customer_id = ? AND i.status != 'Draft'
                ORDER BY i.id DESC
            """, (customer_id,)).fetchall()

            payments = connection.execute("""
                SELECT pay.*, i.invoice_number
                FROM payments pay
                JOIN invoices i ON i.id = pay.invoice_id
                WHERE i.customer_id = ?
                ORDER BY pay.id DESC
                LIMIT 20
            """, (customer_id,)).fetchall()
        finally:
            connection.close()

        today = datetime.now().date().isoformat()

        outstanding = sum(
            max(i["total_amount"] - i["paid_amount"], 0)
            for i in invoices if i["status"] == "Confirmed"
        )

        overdue = sum(
            max(i["total_amount"] - i["paid_amount"], 0)
            for i in invoices
            if i["status"] == "Confirmed" and i["due_date"] < today
        )

        return render_template(
            "portal.html",
            subscriptions=subscriptions,
            invoices=invoices,
            payments=payments,
            outstanding=outstanding,
            overdue=overdue,
            today=today,
            error=request.args.get("error"),
            message=request.args.get("message"),
        )

    ensure_admin()
