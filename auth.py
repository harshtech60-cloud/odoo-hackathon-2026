"""Login, roles, password rules, reset links and staff management.

Roles
-----
admin     Controls the whole system and is the only one who can add staff,
          products, plans and discounts.
staff     Day-to-day work: customers, subscriptions, invoices, payments and
          reports. Can look at products, plans and discounts but not change
          them.
customer  Uses the portal to see and manage their own subscriptions and
          invoices. Cannot see anything that belongs to someone else.
"""

import hashlib
import os
import re
import secrets
import smtplib
import sqlite3
import time
from datetime import datetime, timedelta
from email.message import EmailMessage
from functools import wraps
from pathlib import Path

from flask import (
    Blueprint, abort, current_app, g, redirect, render_template, request,
    session, url_for
)
from werkzeug.security import check_password_hash, generate_password_hash

from database import get_db_connection

auth = Blueprint("auth", __name__)

ADMIN = ("admin",)
TEAM = ("admin", "staff")
CUSTOMER = ("customer",)
EVERYONE = ("admin", "staff", "customer")

# endpoint -> (roles that may view it, roles that may change things)
# Anything not listed here is refused, so new pages are private by default.
ACCESS = {
    "dashboard": (TEAM, TEAM),
    "customers": (TEAM, TEAM),
    "products": (TEAM, ADMIN),
    "add_product_variant": (ADMIN, ADMIN),
    "plans": (TEAM, ADMIN),
    "subscriptions": (TEAM, TEAM),
    "create_quotation_template": (ADMIN, ADMIN),
    "delete_quotation_template": (ADMIN, ADMIN),
    "update_subscription_status": (TEAM, TEAM),
    "invoices": (TEAM, TEAM),
    "generate_due_invoices": (TEAM, TEAM),
    "invoice_action": (TEAM, TEAM),
    "print_invoice": (EVERYONE, EVERYONE),
    "payments": (TEAM, TEAM),
    "add_payment": (TEAM, TEAM),
    "reports": (TEAM, TEAM),
    "discounts": (TEAM, ADMIN),
    "add_discount": (ADMIN, ADMIN),
    "toggle_discount": (ADMIN, ADMIN),
    "delete_discount": (ADMIN, ADMIN),
    "portal": (CUSTOMER, CUSTOMER),
    "portal_subscription_action": (CUSTOMER, CUSTOMER),
    "auth.staff": (ADMIN, ADMIN),
    "auth.delete_staff": (ADMIN, ADMIN),
    "auth.account": (EVERYONE, EVERYONE),
    "auth.logout": (EVERYONE, EVERYONE),
}

# Pages anyone can open without signing in
PUBLIC = {
    "static",
    "auth.login",
    "auth.register",
    "auth.forgot_password",
    "auth.reset_password",
}

RESET_MINUTES = 60
MAX_FAILED_LOGINS = 5
LOCKOUT_SECONDS = 300
_failed_logins = {}


# ---------------------------------------------------------------
# Password rules
# ---------------------------------------------------------------

def password_problem(password):
    """Return a message when the password breaks the rules, else None."""

    if len(password) <= 8:
        return "Password must be more than 8 characters."

    if not re.search(r"[A-Z]", password):
        return "Password needs at least one uppercase letter."

    if not re.search(r"[a-z]", password):
        return "Password needs at least one lowercase letter."

    if not re.search(r"[^A-Za-z0-9]", password):
        return "Password needs at least one special character, such as ! or @."

    return None


def valid_email(email):
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email))


# ---------------------------------------------------------------
# Secret key and CSRF
# ---------------------------------------------------------------

def load_secret_key():
    """Use SECRET_KEY if set, else keep a random key in a local file."""

    configured = os.environ.get("SECRET_KEY")

    if configured:
        return configured

    key_file = Path(__file__).resolve().parent / ".secret_key"

    try:
        if key_file.exists():
            return key_file.read_text().strip()

        key = secrets.token_hex(32)
        key_file.write_text(key)
        return key

    except OSError:
        # Read-only disk: sessions then reset when the app restarts.
        return secrets.token_hex(32)


def csrf_token():
    """Return this session's CSRF token, creating it if needed."""

    if "csrf" not in session:
        session["csrf"] = secrets.token_urlsafe(32)

    return session["csrf"]


# ---------------------------------------------------------------
# Users
# ---------------------------------------------------------------

def get_user_by_id(user_id):

    connection = get_db_connection()

    try:
        return connection.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    finally:
        connection.close()


def get_user_by_email(email):

    connection = get_db_connection()

    try:
        return connection.execute(
            "SELECT * FROM users WHERE email = ?", (email.strip().lower(),)
        ).fetchone()
    finally:
        connection.close()


def create_user(connection, name, email, password, role, customer_id=None):
    """Insert a user. Raises sqlite3.IntegrityError for a repeated email."""

    cursor = connection.execute("""
        INSERT INTO users (name, email, password_hash, role, customer_id)
        VALUES (?, ?, ?, ?, ?)
    """, (
        name.strip(),
        email.strip().lower(),
        generate_password_hash(password),
        role,
        customer_id
    ))

    return cursor.lastrowid


def ensure_first_admin():
    """Create the first admin account when the system has none.

    Set ADMIN_EMAIL and ADMIN_PASSWORD to choose the details. Without a
    password, a random one is generated and printed once.
    """

    connection = get_db_connection()

    try:
        existing = connection.execute(
            "SELECT COUNT(*) FROM users WHERE role = 'admin'"
        ).fetchone()[0]

        if existing:
            return

        email = os.environ.get("ADMIN_EMAIL", "admin@brightloop.com")
        password = os.environ.get("ADMIN_PASSWORD")
        generated = False

        if not password or password_problem(password):
            password = "Bl-" + secrets.token_urlsafe(9) + "a1"
            generated = True

        try:
            create_user(connection, "Administrator", email, password, "admin")
            connection.commit()
        except sqlite3.IntegrityError:
            return

        if generated:
            print(
                "\n  First admin account created\n"
                f"    email:    {email}\n"
                f"    password: {password}\n"
                "  Sign in and change the password from Account.\n",
                flush=True
            )

    finally:
        connection.close()


# ---------------------------------------------------------------
# Email for reset links
# ---------------------------------------------------------------

def send_email(to_address, subject, body):
    """Send through SMTP when configured. Returns True when sent."""

    host = os.environ.get("SMTP_HOST")

    if not host:
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = os.environ.get(
        "SMTP_FROM", os.environ.get("SMTP_USER", "no-reply@brightloop.local")
    )
    message["To"] = to_address
    message.set_content(body)

    try:
        with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587")),
                          timeout=15) as server:
            server.starttls()

            if os.environ.get("SMTP_USER"):
                server.login(
                    os.environ["SMTP_USER"],
                    os.environ.get("SMTP_PASSWORD", "")
                )

            server.send_message(message)

        return True

    except (OSError, smtplib.SMTPException):
        current_app.logger.exception("Could not send reset email")
        return False


# ---------------------------------------------------------------
# Hooks registered on the app
# ---------------------------------------------------------------

def init_auth(app):
    """Attach sessions, CSRF checks and role checks to the Flask app."""

    app.secret_key = load_secret_key()
    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE") == "1",
        PERMANENT_SESSION_LIFETIME=timedelta(hours=12),
    )

    app.register_blueprint(auth)
    app.jinja_env.globals["csrf_token"] = csrf_token

    @app.before_request
    def load_user_and_check_access():

        g.user = None

        user_id = session.get("user_id")

        if user_id:
            g.user = get_user_by_id(user_id)

            if g.user is None:
                session.clear()

        # CSRF: every form that changes data must carry the token
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):

            sent = request.form.get("csrf_token", "")
            expected = session.get("csrf", "")

            if not expected or not secrets.compare_digest(sent, expected):
                abort(400, "Your session expired. Reload the page and try again.")

        endpoint = request.endpoint

        if endpoint is None or endpoint in PUBLIC:
            return None

        if g.user is None:
            return redirect(url_for("auth.login", next=request.full_path.rstrip("?")))

        rule = ACCESS.get(endpoint)

        if rule is None:
            abort(403)

        view_roles, change_roles = rule
        roles = view_roles if request.method in ("GET", "HEAD") else change_roles

        if g.user["role"] not in roles:

            # A customer who opens a team page goes to their portal
            if g.user["role"] == "customer" and request.method == "GET":
                return redirect(url_for("portal"))

            abort(403)

        return None

    @app.context_processor
    def inject_user():
        return {"current_user": g.get("user")}

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "same-origin")
        # Pages show account data, so browsers should not keep copies
        if g.get("user"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    @app.errorhandler(400)
    def bad_request(error):
        return render_template(
            "error.html", code=400, title="Request not accepted",
            message=getattr(error, "description", "")
        ), 400

    @app.errorhandler(403)
    def forbidden(error):
        return render_template(
            "error.html", code=403, title="You don't have access to this page",
            message="Ask an administrator if you need this permission."
        ), 403

    @app.errorhandler(404)
    def not_found(error):
        return render_template(
            "error.html", code=404, title="Page not found",
            message="Check the address, or go back to the dashboard."
        ), 404

    with app.app_context():
        ensure_first_admin()


def home_for(user):
    """Where a person lands after signing in."""

    return url_for("portal") if user["role"] == "customer" else url_for("dashboard")


def safe_next(target):
    """Only follow redirects that stay on this site."""

    if target and target.startswith("/") and not target.startswith("//"):
        return target

    return None


# ---------------------------------------------------------------
# Pages
# ---------------------------------------------------------------

@auth.route("/login", methods=["GET", "POST"])
def login():

    if g.user:
        return redirect(home_for(g.user))

    error = None
    email = ""

    if request.method == "POST":

        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        key = (email, request.remote_addr)

        attempts = [
            moment for moment in _failed_logins.get(key, [])
            if time.time() - moment < LOCKOUT_SECONDS
        ]
        _failed_logins[key] = attempts

        if len(attempts) >= MAX_FAILED_LOGINS:
            error = "Too many failed sign-ins. Wait five minutes and try again."

        else:
            user = get_user_by_email(email) if email else None

            # Compare against a dummy hash so timing does not reveal accounts
            hash_to_check = user["password_hash"] if user else generate_password_hash("x")

            if user and check_password_hash(hash_to_check, password):

                _failed_logins.pop(key, None)
                session.clear()
                session["user_id"] = user["id"]
                session.permanent = True

                return redirect(
                    safe_next(request.args.get("next")) or home_for(user)
                )

            _failed_logins[key].append(time.time())
            error = "Email or password is incorrect."

    return render_template("login.html", error=error, email=email)


@auth.route("/logout", methods=["POST"])
def logout():

    session.clear()

    return redirect(url_for("auth.login"))


@auth.route("/register", methods=["GET", "POST"])
def register():

    if g.user:
        return redirect(home_for(g.user))

    error = None
    form = {"name": "", "email": ""}

    if request.method == "POST":

        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        company = request.form.get("company", "").strip()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm", "")
        form = {"name": name, "email": email, "company": company}

        if not name or not email:
            error = "Name and email are required."

        elif not valid_email(email):
            error = "Enter a valid email address."

        elif password != confirm:
            error = "The two passwords do not match."

        else:
            error = password_problem(password)

        if error is None:

            connection = get_db_connection()

            try:
                if connection.execute(
                    "SELECT 1 FROM users WHERE email = ?", (email,)
                ).fetchone():
                    error = "An account with this email already exists."

                else:
                    # Link to a customer record the team already created
                    customer = connection.execute("""
                        SELECT c.id FROM customers c
                        WHERE c.email = ?
                          AND NOT EXISTS (
                              SELECT 1 FROM users u WHERE u.customer_id = c.id
                          )
                    """, (email,)).fetchone()

                    if customer:
                        customer_id = customer["id"]
                    else:
                        customer_id = connection.execute("""
                            INSERT INTO customers (name, email, company)
                            VALUES (?, ?, ?)
                        """, (name, email, company)).lastrowid

                    user_id = create_user(
                        connection, name, email, password, "customer", customer_id
                    )
                    connection.commit()

                    session.clear()
                    session["user_id"] = user_id
                    session.permanent = True

                    return redirect(url_for("portal"))

            except sqlite3.IntegrityError:
                connection.rollback()
                error = "An account with this email already exists."

            finally:
                connection.close()

    return render_template("register.html", error=error, form=form)


@auth.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():

    sent = False
    demo_link = None

    if request.method == "POST":

        email = request.form.get("email", "").strip().lower()
        user = get_user_by_email(email) if email else None

        if user:

            token = secrets.token_urlsafe(32)
            expires = (
                datetime.utcnow() + timedelta(minutes=RESET_MINUTES)
            ).isoformat(timespec="seconds")

            connection = get_db_connection()

            try:
                # Only a hash of the token is stored
                connection.execute("""
                    UPDATE users
                    SET reset_token_hash = ?, reset_expires = ?
                    WHERE id = ?
                """, (hashlib.sha256(token.encode()).hexdigest(), expires, user["id"]))
                connection.commit()
            finally:
                connection.close()

            link = url_for("auth.reset_password", token=token, _external=True)

            delivered = send_email(
                user["email"],
                "Reset your Brightloop password",
                f"Hello {user['name']},\n\n"
                f"Use this link to choose a new password. It works for "
                f"{RESET_MINUTES} minutes:\n\n{link}\n\n"
                "If you did not ask for this, ignore this email."
            )

            if not delivered:
                current_app.logger.warning("Password reset link for %s: %s", user["email"], link)

                # Showing the link on screen lets anyone reset any account,
                # so it is limited to demo mode.
                if os.environ.get("DEMO_MODE") == "1":
                    demo_link = link

        # The same answer whether or not the account exists
        sent = True

    return render_template("forgot_password.html", sent=sent, demo_link=demo_link)


@auth.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token):

    token_hash = hashlib.sha256(token.encode()).hexdigest()

    connection = get_db_connection()

    try:
        user = connection.execute("""
            SELECT * FROM users
            WHERE reset_token_hash = ?
        """, (token_hash,)).fetchone()

        valid = bool(
            user
            and user["reset_expires"]
            and user["reset_expires"] >= datetime.utcnow().isoformat(timespec="seconds")
        )

        error = None

        if valid and request.method == "POST":

            password = request.form.get("password", "")

            if password != request.form.get("confirm", ""):
                error = "The two passwords do not match."
            else:
                error = password_problem(password)

            if error is None:
                connection.execute("""
                    UPDATE users
                    SET password_hash = ?, reset_token_hash = NULL,
                        reset_expires = NULL
                    WHERE id = ?
                """, (generate_password_hash(password), user["id"]))
                connection.commit()

                return render_template("reset_password.html", done=True, valid=True, error=None)

        return render_template("reset_password.html", done=False, valid=valid, error=error)

    finally:
        connection.close()


@auth.route("/account", methods=["GET", "POST"])
def account():

    error = None
    message = None

    if request.method == "POST":

        current = request.form.get("current_password", "")
        new = request.form.get("new_password", "")

        if not check_password_hash(g.user["password_hash"], current):
            error = "Your current password is not correct."

        elif new != request.form.get("confirm", ""):
            error = "The two new passwords do not match."

        else:
            error = password_problem(new)

        if error is None:

            connection = get_db_connection()

            try:
                connection.execute("""
                    UPDATE users SET password_hash = ? WHERE id = ?
                """, (generate_password_hash(new), g.user["id"]))
                connection.commit()
            finally:
                connection.close()

            message = "Password changed."

    return render_template("account.html", error=error, message=message)


@auth.route("/staff", methods=["GET", "POST"])
def staff():
    """Only the admin can add members of staff."""

    error = None
    message = request.args.get("message")
    form = {"name": "", "email": ""}

    if request.method == "POST":

        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        form = {"name": name, "email": email}

        if not name or not email:
            error = "Name and email are required."
        elif not valid_email(email):
            error = "Enter a valid email address."
        else:
            error = password_problem(password)

        if error is None:

            connection = get_db_connection()

            try:
                create_user(connection, name, email, password, "staff")
                connection.commit()
                return redirect(url_for("auth.staff", message="Staff member added."))

            except sqlite3.IntegrityError:
                connection.rollback()
                error = "An account with this email already exists."

            finally:
                connection.close()

    connection = get_db_connection()

    try:
        members = connection.execute("""
            SELECT id, name, email, role, created_at
            FROM users
            WHERE role IN ('admin', 'staff')
            ORDER BY role, name
        """).fetchall()
    finally:
        connection.close()

    return render_template(
        "staff.html", members=members, error=error, message=message, form=form
    )


@auth.route("/staff/<int:user_id>/delete", methods=["POST"])
def delete_staff(user_id):

    connection = get_db_connection()

    try:
        target = connection.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()

        if not target or target["role"] != "staff":
            return redirect(url_for("auth.staff", message="Only staff accounts can be removed."))

        connection.execute("DELETE FROM users WHERE id = ?", (user_id,))
        connection.commit()

    finally:
        connection.close()

    return redirect(url_for("auth.staff", message="Staff member removed."))
