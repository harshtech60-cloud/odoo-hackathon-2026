from flask import Flask, render_template, request, redirect, url_for
import sqlite3
import re

from database import get_db_connection, init_db

app = Flask(__name__)


# ---------------- DASHBOARD ----------------

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


# ---------------- CUSTOMER MANAGEMENT ----------------

@app.route("/customers", methods=["GET", "POST"])
def customers():

    search = request.args.get("q", "").strip()

    message = None
    error = None

    # Handle the customer form submission
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

                error = "A customer with this email already exists."

            finally:
                connection.close()

            if error is None:
                return redirect(url_for("customers", added="1"))

    # Display a success message after saving
    if request.args.get("added") == "1":
        message = "Customer added successfully!"

    # Get customer records
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


# ---------------- START APPLICATION ----------------

if __name__ == "__main__":

    init_db()

    app.run(debug=True)
