import uuid
import calendar
from datetime import date, timedelta
import math
import sqlite3
from datetime import date
from datetime import date
from decimal import Decimal, InvalidOperation
from decimal import Decimal, InvalidOperation
from flask import Flask, render_template, request, redirect, url_for
from database import get_db_connection, init_db
import sqlite3
import re


app = Flask(__name__)


# =====================================
# DASHBOARD
# =====================================
def parse_price(value):
    """Convert a valid non-negative price into a number."""

    try:
        amount = Decimal(value)

        if not amount.is_finite() or amount < 0:
            return None

        return float(amount)

    except (InvalidOperation, TypeError, ValueError):
        return None


@app.route("/")
def dashboard():

    connection = get_db_connection()

    try:
        total_customers = connection.execute(
            "SELECT COUNT(*) AS total FROM customers"
        ).fetchone()["total"]

    finally:
        connection.close()

    return render_template(
        "dashboard.html",
        total_customers=total_customers
    )


# =====================================
# CUSTOMER MANAGEMENT
# =====================================

@app.route("/customers", methods=["GET", "POST"])
def customers():

    message = None
    error = None

    # Handle customer registration
    if request.method == "POST":

        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        company = request.form.get("company", "").strip()
        phone = request.form.get("phone", "").strip()

        # Validate required fields
        if not name or not email:

            error = "Customer name and email are required."

        elif not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):

            error = "Please enter a valid email address."

        else:

            connection = get_db_connection()

            try:

                connection.execute("""
                    INSERT INTO customers
                    (name, email, company, phone)
                    VALUES (?, ?, ?, ?)
                """, (name, email, company, phone))

                connection.commit()

            except sqlite3.IntegrityError:

                error = "This customer email already exists."

            finally:
                connection.close()

            if error is None:
                return redirect(url_for("customers", added="1"))

    # Success message after registration
    if request.args.get("added") == "1":
        message = "Customer added successfully!"

    # Retrieve customers
    search = request.args.get("q", "").strip()

    connection = get_db_connection()

    try:

        if search:

            keyword = f"%{search}%"

            customer_list = connection.execute("""
                SELECT * FROM customers
                WHERE name LIKE ?
                OR email LIKE ?
                OR company LIKE ?
                ORDER BY id DESC
            """, (keyword, keyword, keyword)).fetchall()

        else:

            customer_list = connection.execute("""
                SELECT * FROM customers
                ORDER BY id DESC
            """).fetchall()

    finally:
        connection.close()

    return render_template(
        "customers.html",
        customers=customer_list,
        search=search,
        message=message,
        error=error
    )


# =====================================
# START APPLICATION
# =====================================
# =====================================
# PRODUCT MANAGEMENT
# =====================================

@app.route("/products", methods=["GET", "POST"])
def products():

    message = None
    error = None

    # Handle new product submission
    if request.method == "POST":

        name = request.form.get("name", "").strip()
        product_type = request.form.get("product_type", "").strip()
        sales_price = parse_price(request.form.get("sales_price", ""))
        cost_price = parse_price(request.form.get("cost_price", ""))
        notes = request.form.get("notes", "").strip()

        if not name or not product_type:
            error = "Product name and type are required."

        elif sales_price is None or cost_price is None:
            error = "Enter valid, non-negative product prices."

        else:

            connection = get_db_connection()

            try:

                connection.execute("""
                    INSERT INTO products
                    (name, product_type, sales_price, cost_price, notes)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    name,
                    product_type,
                    sales_price,
                    cost_price,
                    notes
                ))

                connection.commit()

            except sqlite3.IntegrityError:
                error = "Unable to save this product."

            finally:
                connection.close()

            if error is None:
                return redirect(url_for("products", added="1"))

    if request.args.get("added") == "1":
        message = "Product added successfully!"

    if request.args.get("variant_added") == "1":
        message = "Product variant added successfully!"

    if request.args.get("variant_error"):
        error = request.args.get("variant_error")

    # Retrieve products and their variants
    connection = get_db_connection()

    try:

        rows = connection.execute("""
            SELECT
                p.id,
                p.name,
                p.product_type,
                p.sales_price,
                p.cost_price,
                p.notes,
                p.created_at,
                v.id AS variant_id,
                v.variant_name,
                v.extra_price

            FROM products p

            LEFT JOIN product_variants v
            ON p.id = v.product_id

            ORDER BY p.id DESC, v.id ASC
        """).fetchall()

        product_map = {}

        for row in rows:

            product_id = row["id"]

            if product_id not in product_map:

                product_map[product_id] = {
                    "id": product_id,
                    "name": row["name"],
                    "product_type": row["product_type"],
                    "sales_price": row["sales_price"],
                    "cost_price": row["cost_price"],
                    "notes": row["notes"],
                    "variants": []
                }

            if row["variant_id"] is not None:

                product_map[product_id]["variants"].append({
                    "name": row["variant_name"],
                    "extra_price": row["extra_price"]
                })

        product_list = list(product_map.values())

    finally:
        connection.close()

    return render_template(
        "products.html",
        products=product_list,
        message=message,
        error=error
    )


# =====================================
# ADD PRODUCT VARIANT
# =====================================

@app.route("/products/<int:product_id>/variants", methods=["POST"])
def add_product_variant(product_id):

    variant_name = request.form.get("variant_name", "").strip()

    extra_price = parse_price(
        request.form.get("extra_price", "")
    )

    if not variant_name:
        return redirect(url_for(
            "products",
            variant_error="Variant name is required."
        ))

    if extra_price is None:
        return redirect(url_for(
            "products",
            variant_error="Enter a valid, non-negative additional price."
        ))

    connection = get_db_connection()

    try:

        connection.execute("""
            INSERT INTO product_variants
            (product_id, variant_name, extra_price)
            VALUES (?, ?, ?)
        """, (product_id, variant_name, extra_price))

        connection.commit()

    except sqlite3.IntegrityError:

        return redirect(url_for(
            "products",
            variant_error="This variant already exists or its product is unavailable."
        ))

    finally:
        connection.close()

    return redirect(url_for("products", variant_added="1"))
    # =====================================
# SUBSCRIPTION PLANS MANAGEMENT
# =====================================

@app.route("/plans", methods=["GET", "POST"])
def plans():

    message = None
    error = None

    if request.method == "POST":

        name = request.form.get("name", "").strip()

        price_text = request.form.get("price", "").strip()

        frequency = request.form.get(
            "billing_frequency", ""
        ).strip()

        quantity_text = request.form.get(
            "minimum_quantity", "1"
        ).strip()

        available_from = request.form.get(
            "available_from", ""
        )

        available_until = request.form.get(
            "available_until", ""
        )

        auto_close = int(
            request.form.get("auto_close") == "on"
        )

        allow_early_close = int(
            request.form.get("allow_early_close") == "on"
        )

        allow_pause = int(
            request.form.get("allow_pause") == "on"
        )

        allow_renewal = int(
            request.form.get("allow_renewal") == "on"
        )

        # Validate plan name
        if not name:

            error = "Plan name is required."

        # Validate plan price
        if error is None:

            try:

                price = Decimal(price_text)

                if not price.is_finite() or price < 0:
                    error = "Enter a valid non-negative plan price."

            except (InvalidOperation, ValueError):
                error = "Invalid plan price."

        # Validate billing frequency
        if error is None:

            valid_frequencies = [
                "daily", "weekly", "monthly", "yearly"
            ]

            if frequency not in valid_frequencies:
                error = "Please select a valid billing frequency."

        # Validate minimum quantity
        if error is None:

            try:

                minimum_quantity = int(quantity_text)

                if minimum_quantity < 1:
                    error = "Minimum quantity must be at least 1."

            except ValueError:
                error = "Enter a valid minimum quantity."

        # Validate dates
        if error is None:

            try:

                start_date = date.fromisoformat(available_from)

                end_date = (
                    date.fromisoformat(available_until)
                    if available_until else None
                )

                if end_date and end_date < start_date:
                    error = "End date cannot be before start date."

            except ValueError:
                error = "Please enter valid availability dates."

        # Save plan
        if error is None:

            connection = get_db_connection()

            try:

                connection.execute("""
                    INSERT INTO subscription_plans (
                        name,
                        price,
                        billing_frequency,
                        minimum_quantity,
                        available_from,
                        available_until,
                        auto_close,
                        allow_early_close,
                        allow_pause,
                        allow_renewal
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    name,
                    float(price),
                    frequency,
                    minimum_quantity,
                    available_from,
                    available_until or None,
                    auto_close,
                    allow_early_close,
                    allow_pause,
                    allow_renewal
                ))

                connection.commit()

            except sqlite3.IntegrityError:

                error = "Unable to save the subscription plan."

            finally:
                connection.close()

            if error is None:
                return redirect(url_for("plans", added="1"))

    if request.args.get("added") == "1":
        message = "Subscription plan created successfully!"

    # Retrieve saved plans
    connection = get_db_connection()

    try:

        plan_list = connection.execute("""
            SELECT *
            FROM subscription_plans
            ORDER BY id DESC
        """).fetchall()

    finally:
        connection.close()

    return render_template(
        "plans.html",
        plans=plan_list,
        message=message,
        error=error
    )
    # =============================================
# SUBSCRIPTION MANAGEMENT
# =============================================

@app.route("/subscriptions", methods=["GET", "POST"])
def subscriptions():

    message = None
    error = request.args.get("error")

    if request.args.get("created") == "1":
        message = "Subscription created successfully!"

    if request.args.get("updated") == "1":
        message = "Subscription status updated successfully!"

    if request.args.get("renewed"):
        message = request.args.get("renewed")

    # -----------------------------------------
    # CREATE NEW SUBSCRIPTION
    # -----------------------------------------

    if request.method == "POST":

        try:

            customer_id = int(request.form.get("customer_id", ""))
            plan_id = int(request.form.get("plan_id", ""))
            product_id = int(request.form.get("product_id", ""))
            quantity = int(request.form.get("quantity", "1"))
            payment_terms_days = int(
                request.form.get("payment_terms_days", "7")
            )
            variant_text = request.form.get("variant_id", "").strip()
            variant_id = int(variant_text) if variant_text else None

            tax_rate = float(request.form.get("tax_rate", "18"))

            start_date_text = request.form.get("start_date", "")
            expiry_date_text = request.form.get("expiry_date", "")

            start_date = date.fromisoformat(start_date_text)
            expiry_date = date.fromisoformat(expiry_date_text)

            if quantity < 1:
                raise ValueError("Quantity must be at least 1.")

            if not 0 <= payment_terms_days <= 365:
                raise ValueError("Payment terms must be between 0 and 365 days.")

            if not math.isfinite(tax_rate) or not 0 <= tax_rate <= 100:
                raise ValueError("Tax rate must be between 0 and 100.")

            if expiry_date < start_date:
                raise ValueError("Expiry date cannot be before start date.")

        except (ValueError, TypeError, OverflowError):

            error = (
                "Please enter valid customer, plan, product, "
                "quantity, dates and payment details."
            )

        if error is None:

            connection = get_db_connection()

            try:

                customer = connection.execute(
                    "SELECT * FROM customers WHERE id = ?",
                    (customer_id,)
                ).fetchone()

                plan = connection.execute(
                    "SELECT * FROM subscription_plans WHERE id = ?",
                    (plan_id,)
                ).fetchone()

                product = connection.execute(
                    "SELECT * FROM products WHERE id = ?",
                    (product_id,)
                ).fetchone()

                if not customer:
                    error = "Selected customer does not exist."

                elif not plan:
                    error = "Selected subscription plan does not exist."

                elif not product:
                    error = "Selected product does not exist."

                elif quantity < plan["minimum_quantity"]:
                    error = (
                        f"This plan requires a minimum quantity "
                        f"of {plan['minimum_quantity']}."
                    )

                elif plan["available_from"] and (
                    start_date_text < plan["available_from"]
                ):
                    error = "Subscription starts before plan availability."

                elif plan["available_until"] and (
                    start_date_text > plan["available_until"]
                ):
                    error = "The selected plan is no longer available."

                variant_extra_price = 0.0
                variant = None

                if error is None and variant_id is not None:

                    variant = connection.execute("""
                        SELECT *
                        FROM product_variants
                        WHERE id = ?
                        AND product_id = ?
                    """, (variant_id, product_id)).fetchone()

                    if not variant:
                        error = "Selected variant does not belong to this product."

                    else:
                        variant_extra_price = float(variant["extra_price"])

                if error is None:

                    # Calculate product line price
                    unit_price = (
                        float(product["sales_price"])
                        + variant_extra_price
                    )

                    product_subtotal = round(
                        unit_price * quantity, 2
                    )

                    # Add recurring plan fee
                    plan_price = float(plan["price"])

                    subtotal = round(
                        plan_price + product_subtotal, 2
                    )

                    tax_amount = round(
                        subtotal * tax_rate / 100, 2
                    )

                    total_amount = round(
                        subtotal + tax_amount, 2
                    )

                    # Start database transaction
                    connection.execute("BEGIN")

                    cursor = connection.execute("""
                        INSERT INTO subscriptions (
                            subscription_number,
                            customer_id,
                            plan_id,
                            start_date,
                            expiry_date,
                            payment_terms_days,
                            status,
                            plan_price,
                            subtotal,
                            tax_amount,
                            total_amount
                        )
                        VALUES (
                            NULL, ?, ?, ?, ?, ?,
                            'Draft', ?, ?, ?, ?
                        )
                    """, (
                        customer_id,
                        plan_id,
                        start_date_text,
                        expiry_date_text,
                        payment_terms_days,
                        plan_price,
                        subtotal,
                        tax_amount,
                        total_amount
                    ))

                    subscription_id = cursor.lastrowid

                    subscription_number = (
                        f"SUB-{subscription_id:05d}"
                    )

                    connection.execute("""
                        UPDATE subscriptions
                        SET subscription_number = ?
                        WHERE id = ?
                    """, (subscription_number, subscription_id))

                    # Save product line
                    connection.execute("""
                        INSERT INTO subscription_lines (
                            subscription_id,
                            product_id,
                            variant_id,
                            quantity,
                            unit_price,
                            tax_rate,
                            line_subtotal
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        subscription_id,
                        product_id,
                        variant_id,
                        quantity,
                        unit_price,
                        tax_rate,
                        product_subtotal
                    ))

                    connection.commit()

            except sqlite3.IntegrityError:

                connection.rollback()
                error = "Unable to create subscription. Please check the selected records."

            except Exception:

                connection.rollback()
                raise

            finally:
                connection.close()

            if error is None:
                return redirect(
                    url_for("subscriptions", created="1")
                )

    # -----------------------------------------
    # RETRIEVE DATA FOR PAGE
    # -----------------------------------------

    connection = get_db_connection()

    try:

        customer_list = connection.execute("""
            SELECT id, name, email
            FROM customers
            ORDER BY name
        """).fetchall()

        plan_list = connection.execute("""
            SELECT *
            FROM subscription_plans
            ORDER BY name
        """).fetchall()

        product_list = connection.execute("""
            SELECT *
            FROM products
            ORDER BY name
        """).fetchall()

        variant_list = connection.execute("""
            SELECT v.*, p.name AS product_name
            FROM product_variants v
            JOIN products p ON p.id = v.product_id
            ORDER BY p.name, v.variant_name
        """).fetchall()

        subscription_rows = connection.execute("""
            SELECT
                s.*,
                c.name AS customer_name,
                p.name AS plan_name,
                p.billing_frequency,
                p.allow_pause,
                p.allow_early_close,
                p.allow_renewal

            FROM subscriptions s

            JOIN customers c ON c.id = s.customer_id

            JOIN subscription_plans p ON p.id = s.plan_id

            ORDER BY s.id DESC
        """).fetchall()

        subscription_list = []

        for row in subscription_rows:

            subscription = dict(row)

            lines = connection.execute("""
                SELECT
                    sl.*,
                    p.name AS product_name,
                    v.variant_name

                FROM subscription_lines sl

                JOIN products p ON p.id = sl.product_id

                LEFT JOIN product_variants v
                ON v.id = sl.variant_id

                WHERE sl.subscription_id = ?

            """, (row["id"],)).fetchall()

            subscription["lines"] = [
                dict(line) for line in lines
            ]

            subscription_list.append(subscription)

    finally:
        connection.close()

    return render_template(
        "subscriptions.html",
        customers=customer_list,
        plans=plan_list,
        products=product_list,
        variants=variant_list,
        subscriptions=subscription_list,
        message=message,
        error=error,
        today=date.today().isoformat()
    )


# =============================================
# SUBSCRIPTION STATUS MANAGEMENT
# =============================================

@app.route(
    "/subscriptions/<int:subscription_id>/status",
    methods=["POST"]
)
def update_subscription_status(subscription_id):

    action = request.form.get("action", "")

    connection = get_db_connection()

    try:

        subscription = connection.execute("""
            SELECT
                s.*,
                p.allow_pause,
                p.allow_early_close

            FROM subscriptions s

            JOIN subscription_plans p
            ON p.id = s.plan_id

            WHERE s.id = ?

        """, (subscription_id,)).fetchone()

        if not subscription:
            return redirect(
                url_for("subscriptions", error="Subscription not found.")
            )

        current_status = subscription["status"]
        new_status = None

        if action == "send_quotation" and current_status == "Draft":
            new_status = "Quotation"

        elif action == "confirm" and current_status == "Quotation":
            new_status = "Confirmed"

        elif action == "activate" and current_status == "Confirmed":
            new_status = "Active"

        elif action == "pause" and current_status == "Active":

            if subscription["allow_pause"]:
                new_status = "Paused"

        elif action == "resume" and current_status == "Paused":
            new_status = "Active"

        elif action == "close" and current_status in ("Active", "Paused"):

            expired = (
                subscription["expiry_date"] <= date.today().isoformat()
            )

            if subscription["allow_early_close"] or expired:
                new_status = "Closed"

        if new_status is None:

            return redirect(
                url_for(
                    "subscriptions",
                    error="This status change is not permitted."
                )
            )

        connection.execute("""
            UPDATE subscriptions
            SET status = ?
            WHERE id = ?
        """, (new_status, subscription_id))

        connection.commit()

    finally:
        connection.close()

    return redirect(
        url_for("subscriptions", updated="1")
    )
    # =====================================
# BILLING DATE HELPERS
# =====================================

def add_months(start_date, months):
    """Add calendar months while keeping dates valid."""

    month_index = start_date.month - 1 + months

    year = start_date.year + month_index // 12

    month = month_index % 12 + 1

    day = min(
        start_date.day,
        calendar.monthrange(year, month)[1]
    )

    return date(year, month, day)


def get_period_end(start_date, frequency):
    """Calculate the inclusive end date of a billing period."""

    if frequency == "daily":
        next_date = start_date + timedelta(days=1)

    elif frequency == "weekly":
        next_date = start_date + timedelta(days=7)

    elif frequency == "monthly":
        next_date = add_months(start_date, 1)

    elif frequency == "yearly":
        next_date = add_months(start_date, 12)

    else:
        raise ValueError("Unsupported billing frequency")

    return next_date - timedelta(days=1)


def get_next_billing_date(connection, subscription):
    """Find the next billing date for a subscription."""

    last_invoice = connection.execute("""
        SELECT billing_period_end
        FROM invoices
        WHERE subscription_id = ?
        ORDER BY billing_period_end DESC
        LIMIT 1
    """, (subscription["id"],)).fetchone()

    if last_invoice:

        return (
            date.fromisoformat(last_invoice["billing_period_end"])
            + timedelta(days=1)
        )

    return date.fromisoformat(subscription["start_date"])


# =====================================
# FIND SUBSCRIPTIONS DUE FOR BILLING
# =====================================

def find_due_subscriptions(connection, today):

    active_subscriptions = connection.execute("""
        SELECT
            s.*,
            c.name AS customer_name,
            p.name AS plan_name,
            p.billing_frequency

        FROM subscriptions s

        JOIN customers c
        ON c.id = s.customer_id

        JOIN subscription_plans p
        ON p.id = s.plan_id

        WHERE s.status = 'Active'

        ORDER BY s.id
    """).fetchall()

    due_list = []

    for subscription in active_subscriptions:

        next_date = get_next_billing_date(
            connection,
            subscription
        )

        expiry_date = date.fromisoformat(
            subscription["expiry_date"]
        )

        if next_date <= today and next_date <= expiry_date:

            due_list.append({
                "subscription_number":
                    subscription["subscription_number"],

                "customer_name":
                    subscription["customer_name"],

                "plan_name":
                    subscription["plan_name"],

                "next_due_date":
                    next_date.isoformat()
            })

    return due_list
    # =====================================
# INVOICE MANAGEMENT PAGE
# =====================================

@app.route("/invoices")
def invoices():

    connection = get_db_connection()

    try:

        invoice_list = connection.execute("""
            SELECT
                i.*,
                c.name AS customer_name,
                c.email AS customer_email,
                s.subscription_number

            FROM invoices i

            JOIN customers c
            ON c.id = i.customer_id

            JOIN subscriptions s
            ON s.id = i.subscription_id

            ORDER BY i.id DESC
        """).fetchall()

        today = date.today()

        due_subscriptions = find_due_subscriptions(
            connection,
            today
        )

        total_outstanding = connection.execute("""
            SELECT COALESCE(SUM(total_amount), 0) AS total
            FROM invoices
            WHERE status = 'Confirmed'
              total_outstanding = connection.execute("""     SELECT COALESCE(SUM(total_amount), 0) AS total     FROM invoices     WHERE status = 'Confirmed' """).fetchone()["total"]
        """).fetchone()["total"]

        overdue_total = connection.execute("""
            SELECT COALESCE(SUM(total_amount), 0) AS total
            FROM invoices
            WHERE status = 'Confirmed'
              AND due_date < ?
        """, (today.isoformat(),)).fetchone()["total"]

    finally:
        connection.close()

    return render_template(
        "invoices.html",
        invoices=invoice_list,
        due_subscriptions=due_subscriptions,
        total_outstanding=total_outstanding,
        overdue_total=overdue_total,
        today=today.isoformat(),
        generated=request.args.get("generated"),
        message=request.args.get("message"),
        error=request.args.get("error")
    )


# =====================================
# GENERATE ALL DUE INVOICES
# =====================================

@app.route("/billing/generate", methods=["POST"])
def generate_due_invoices():

    connection = get_db_connection()

    created_count = 0

    today = date.today()

    try:

        # Find all active subscriptions
        active_subscriptions = connection.execute("""
            SELECT
                s.*,
                p.name AS plan_name,
                p.billing_frequency

            FROM subscriptions s

            JOIN subscription_plans p
            ON p.id = s.plan_id

            WHERE s.status = 'Active'

            ORDER BY s.id
        """).fetchall()

        # Process every due subscription
        for subscription in active_subscriptions:

            expiry_date = date.fromisoformat(
                subscription["expiry_date"]
            )

            # Catch up on any missed billing periods
            while True:

                period_start = get_next_billing_date(
                    connection,
                    subscription
                )

                if period_start > today or period_start > expiry_date:
                    break

                period_end = get_period_end(
                    period_start,
                    subscription["billing_frequency"]
                )

                # Do not bill after subscription expiry
                if period_end > expiry_date:
                    period_end = expiry_date

                period_start_text = period_start.isoformat()
                period_end_text = period_end.isoformat()

                # Check for an existing invoice
                existing = connection.execute("""
                    SELECT id
                    FROM invoices
                    WHERE subscription_id = ?
                      AND billing_period_start = ?
                """, (
                    subscription["id"],
                    period_start_text
                )).fetchone()

                if existing:
                    continue

                # Retrieve subscription product lines
                lines = connection.execute("""
                    SELECT
                        sl.*,
                        p.name AS product_name,
                        v.variant_name

                    FROM subscription_lines sl

                    JOIN products p
                    ON p.id = sl.product_id

                    LEFT JOIN product_variants v
                    ON v.id = sl.variant_id

                    WHERE sl.subscription_id = ?

                    ORDER BY sl.id
                """, (subscription["id"],)).fetchall()

                # Calculate plan and product charges
                invoice_items = []

                # Use the subscription's existing product tax rate
                # for the recurring plan fee.
                plan_tax_rate = (
                    float(lines[0]["tax_rate"])
                    if lines else 0
                )

                plan_price = float(subscription["plan_price"])

                plan_tax = round(
                    plan_price * plan_tax_rate / 100, 2
                )

                invoice_items.append({
                    "description": (
                        f"{subscription['plan_name']} "
                        f"({subscription['billing_frequency']} plan)"
                    ),
                    "quantity": 1,
                    "unit_price": plan_price,
                    "tax_rate": plan_tax_rate,
                    "line_subtotal": plan_price,
                    "tax_amount": plan_tax
                })

                for line in lines:

                    quantity = int(line["quantity"])

                    unit_price = float(line["unit_price"])

                    tax_rate = float(line["tax_rate"])

                    line_subtotal = round(
                        quantity * unit_price, 2
                    )

                    line_tax = round(
                        line_subtotal * tax_rate / 100, 2
                    )

                    description = line["product_name"]

                    if line["variant_name"]:
                        description += (
                            " - " + line["variant_name"]
                        )

                    invoice_items.append({
                        "description": description,
                        "quantity": quantity,
                        "unit_price": unit_price,
                        "tax_rate": tax_rate,
                        "line_subtotal": line_subtotal,
                        "tax_amount": line_tax
                    })

                subtotal = round(
                    sum(item["line_subtotal"] for item in invoice_items),
                    2
                )

                tax_amount = round(
                    sum(item["tax_amount"] for item in invoice_items),
                    2
                )

                total_amount = round(
                    subtotal + tax_amount, 2
                )

                invoice_date = period_start

                due_date = (
                    invoice_date
                    + timedelta(days=subscription["payment_terms_days"])
                )

                # Start an atomic invoice transaction
                connection.execute("SAVEPOINT create_invoice")

                try:

                    cursor = connection.execute("""
                        INSERT INTO invoices (
                            invoice_number,
                            subscription_id,
                            customer_id,
                            billing_period_start,
                            billing_period_end,
                            invoice_date,
                            due_date,
                            subtotal,
                            tax_amount,
                            total_amount,
                            status
                        )
                        VALUES (
                            NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft'
                        )
                    """, (
                        subscription["id"],
                        subscription["customer_id"],
                        period_start_text,
                        period_end_text,
                        invoice_date.isoformat(),
                        due_date.isoformat(),
                        subtotal,
                        tax_amount,
                        total_amount
                    ))

                    invoice_id = cursor.lastrowid

                    invoice_number = f"INV-{invoice_id:05d}"

                    connection.execute("""
                        UPDATE invoices
                        SET invoice_number = ?
                        WHERE id = ?
                    """, (invoice_number, invoice_id))

                    for item in invoice_items:

                        connection.execute("""
                            INSERT INTO invoice_lines (
                                invoice_id,
                                description,
                                quantity,
                                unit_price,
                                tax_rate,
                                line_subtotal,
                                tax_amount,
                                line_total
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            invoice_id,
                            item["description"],
                            item["quantity"],
                            item["unit_price"],
                            item["tax_rate"],
                            item["line_subtotal"],
                            item["tax_amount"],
                            round(
                                item["line_subtotal"]
                                + item["tax_amount"], 2
                            )
                        ))

                    connection.execute(
                        "RELEASE SAVEPOINT create_invoice"
                    )

                    created_count += 1

                except sqlite3.IntegrityError:

                    connection.execute(
                        "ROLLBACK TO SAVEPOINT create_invoice"
                    )

                    connection.execute(
                        "RELEASE SAVEPOINT create_invoice"
                    )

                # The next loop finds the next unbilled period.

        connection.commit()

    except Exception:

        connection.rollback()
        raise

    finally:
        connection.close()

    return redirect(
        url_for("invoices", generated=created_count)
    )


# =====================================
# CONFIRM / CANCEL / MARK SENT
# =====================================

@app.route(
    "/invoices/<int:invoice_id>/action",
    methods=["POST"]
)
def invoice_action(invoice_id):

    action = request.form.get("action", "")

    connection = get_db_connection()

    error = None

    try:

        invoice = connection.execute("""
            SELECT *
            FROM invoices
            WHERE id = ?
        """, (invoice_id,)).fetchone()

        if not invoice:

            error = "Invoice not found."

        elif action == "confirm" and invoice["status"] == "Draft":

            connection.execute("""
                UPDATE invoices
                SET status = 'Confirmed'
                WHERE id = ?
            """, (invoice_id,))

        elif action == "cancel" and invoice["status"] in (
            "Draft", "Confirmed"
        ):

            connection.execute("""
                UPDATE invoices
                SET status = 'Cancelled'
                WHERE id = ?
            """, (invoice_id,))

        elif action == "mark_sent" and invoice["status"] in (
            "Draft", "Confirmed"
        ):

            connection.execute("""
                UPDATE invoices
                SET sent_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (invoice_id,))

        else:

            error = "This invoice action is not allowed."

        connection.commit()

    finally:
        connection.close()

    if error:
        return redirect(
            url_for("invoices", error=error)
        )

    return redirect(
        url_for("invoices", message="Invoice updated successfully.")
    )


# =====================================
# PRINT INVOICE
# =====================================

@app.route("/invoices/<int:invoice_id>/print")
def print_invoice(invoice_id):

    connection = get_db_connection()

    try:

        invoice = connection.execute("""
            SELECT
                i.*,
                c.name AS customer_name,
                c.email AS customer_email,
                c.company AS customer_company,
                c.phone AS customer_phone,
                s.subscription_number

            FROM invoices i

            JOIN customers c
            ON c.id = i.customer_id

            JOIN subscriptions s
            ON s.id = i.subscription_id

            WHERE i.id = ?
        """, (invoice_id,)).fetchone()

        if not invoice:
            return "Invoice not found.", 404

        lines = connection.execute("""
            SELECT *
            FROM invoice_lines
            WHERE invoice_id = ?
        """, (invoice_id,)).fetchall()

    finally:
        connection.close()

    return render_template(
        "invoice_print.html",
        invoice=invoice,
        lines=lines
    )
    # ==============================
# PAYMENT MANAGEMENT
# ==============================

@app.route("/payments")
def payments():
    conn = get_db_connection()

    # Get all payment records
    payment_list = conn.execute("""
        SELECT
            p.*,
            i.invoice_number,
            i.total_amount,
            c.name AS customer_name
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        JOIN customers c ON p.customer_id = c.id
        ORDER BY p.id DESC
    """).fetchall()

    # Get invoices that still have an outstanding balance
    invoice_list = conn.execute("""
        SELECT
            i.id,
            i.invoice_number,
            i.total_amount,
            i.due_date,
            c.name AS customer_name,
            (
                i.total_amount -
                COALESCE(SUM(
                    CASE WHEN p.status = 'Completed'
                    THEN p.amount ELSE 0 END
                ), 0)
            ) AS balance_due
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        LEFT JOIN payments p ON i.id = p.invoice_id
        WHERE i.status = 'Confirmed'
        GROUP BY i.id
        HAVING balance_due > 0
        ORDER BY i.due_date ASC
    """).fetchall()

    # Payment summary
    total_received = conn.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE status = 'Completed'
    """).fetchone()[0]

    pending_total = conn.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE status = 'Pending'
    """).fetchone()[0]

    failed_count = conn.execute("""
        SELECT COUNT(*)
        FROM payments
        WHERE status = 'Failed'
    """).fetchone()[0]

    conn.close()

    return render_template(
        "payments.html",
        payments=payment_list,
        invoices=invoice_list,
        total_received=total_received,
        pending_total=pending_total,
        failed_count=failed_count
    )


# Add a new payment
@app.route("/payments/add", methods=["POST"])
def add_payment():
    invoice_id = request.form.get("invoice_id")
    amount = request.form.get("amount")
    payment_date = request.form.get("payment_date") or date.today().isoformat()
    payment_method = request.form.get("payment_method")
    transaction_reference = request.form.get("transaction_reference")
    notes = request.form.get("notes")
    status = request.form.get("status", "Completed")

    allowed_methods = [
        "UPI", "Cash", "Bank Transfer", "Card", "Other"
    ]

    allowed_statuses = ["Completed", "Pending", "Failed"]

    try:
        invoice_id = int(invoice_id)
        amount = float(amount)
    except (TypeError, ValueError):
        return redirect(url_for("payments", error="Invalid payment details"))

    if amount <= 0:
        return redirect(url_for("payments", error="Amount must be greater than zero"))

    if payment_method not in allowed_methods or status not in allowed_statuses:
        return redirect(url_for("payments", error="Invalid payment method or status"))

    conn = get_db_connection()

    # Check whether the invoice exists and is awaiting payment
    invoice = conn.execute("""
        SELECT id, total_amount, status, customer_id
        FROM invoices
        WHERE id = ?
    """, (invoice_id,)).fetchone()

    if invoice is None or invoice["status"] != "Confirmed":
        conn.close()
        return redirect(url_for("payments", error="Invoice not available for payment"))

    # Calculate the amount already received
    already_paid = conn.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE invoice_id = ? AND status = 'Completed'
    """, (invoice_id,)).fetchone()[0]

    balance_due = invoice["total_amount"] - already_paid

    if amount > balance_due:
        conn.close()
        return redirect(url_for("payments", error="Payment exceeds outstanding balance"))

    # Generate a unique payment number
    payment_number = "PAY-" + uuid.uuid4().hex[:10].upper()

    # Save payment
    conn.execute("""
        INSERT INTO payments (
            payment_number,
            invoice_id,
            customer_id,
            payment_date,
            amount,
            payment_method,
            transaction_reference,
            notes,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        payment_number,
        invoice_id,
        invoice["customer_id"],
        payment_date,
        amount,
        payment_method,
        transaction_reference,
        notes,
        status
    ))

    # Update invoice when full payment is received
    if status == "Completed":
        new_total_paid = already_paid + amount

        if new_total_paid >= invoice["total_amount"]:
            conn.execute("""
                UPDATE invoices
                SET status = 'Paid'
                WHERE id = ?
            """, (invoice_id,))

    conn.commit()
    conn.close()

    return redirect(url_for("payments"))
if __name__ == "__main__":

    init_db()

    app.run(debug=True)
