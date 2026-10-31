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
if __name__ == "__main__":

    init_db()

    app.run(debug=True)
