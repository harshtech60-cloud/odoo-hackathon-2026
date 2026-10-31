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
if __name__ == "__main__":

    init_db()

    app.run(debug=True)
