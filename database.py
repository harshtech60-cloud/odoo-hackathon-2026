import sqlite3
from pathlib import Path

# Keep the database in the main project folder
DB_PATH = Path(__file__).resolve().parent / "database.db


def get_db_connection():
    """Create a connection to the SQLite database."""

    connection = sqlite3.connect(DB_PATH)

    # Allow us to access columns using their names
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def init_db():
    """Create all database tables if they do not exist."""

    connection = get_db_connection()

    try:
        # Create customers table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                company TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create products table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS products (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        product_type TEXT NOT NULL,

        sales_price REAL NOT NULL CHECK(sales_price >= 0),

        cost_price REAL NOT NULL CHECK(cost_price >= 0),

        notes TEXT DEFAULT '',

        created_at TEXT DEFAULT CURRENT_TIMESTAMP

            )
        """)


        # Create product variants table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS product_variants (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        product_id INTEGER NOT NULL,

        variant_name TEXT NOT NULL COLLATE NOCASE,

        extra_price REAL NOT NULL DEFAULT 0
            CHECK(extra_price >= 0),

        FOREIGN KEY (product_id)
            REFERENCES products(id)
            ON DELETE CASCADE,

        UNIQUE(product_id, variant_name)

            )
        """)
        # Create subscription plans table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS subscription_plans (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        price REAL NOT NULL CHECK(price >= 0),

        billing_frequency TEXT NOT NULL
            CHECK(billing_frequency IN (
                'daily',
                'weekly',
                'monthly',
                'yearly'
            )),

        minimum_quantity INTEGER NOT NULL DEFAULT 1
            CHECK(minimum_quantity >= 1),

        available_from TEXT NOT NULL,

        available_until TEXT,

        auto_close INTEGER NOT NULL DEFAULT 0,

        allow_early_close INTEGER NOT NULL DEFAULT 1,

        allow_pause INTEGER NOT NULL DEFAULT 1,

        allow_renewal INTEGER NOT NULL DEFAULT 1,

        created_at TEXT DEFAULT CURRENT_TIMESTAMP

            )
        """)
        # =====================================
        # SUBSCRIPTIONS TABLE
        # =====================================

        connection.execute("""
            CREATE TABLE IF NOT EXISTS subscriptions (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        subscription_number TEXT UNIQUE,

        customer_id INTEGER NOT NULL,

        plan_id INTEGER NOT NULL,

        start_date TEXT NOT NULL,

        expiry_date TEXT NOT NULL,

        payment_terms_days INTEGER NOT NULL DEFAULT 7,

        status TEXT NOT NULL DEFAULT 'Draft'
            CHECK(status IN (
                'Draft',
                'Quotation',
                'Confirmed',
                'Active',
                'Paused',
                'Closed'
            )),

        plan_price REAL NOT NULL DEFAULT 0,

        subtotal REAL NOT NULL DEFAULT 0,

        tax_amount REAL NOT NULL DEFAULT 0,

        total_amount REAL NOT NULL DEFAULT 0,

        created_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (customer_id)
            REFERENCES customers(id),

        FOREIGN KEY (plan_id)
            REFERENCES subscription_plans(id)

            )
        """)


        # =====================================
        # SUBSCRIPTION PRODUCT LINES
        # =====================================

        connection.execute("""
            CREATE TABLE IF NOT EXISTS subscription_lines (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        subscription_id INTEGER NOT NULL,

        product_id INTEGER NOT NULL,

        variant_id INTEGER,

        quantity INTEGER NOT NULL
            CHECK(quantity >= 1),

        unit_price REAL NOT NULL,

        tax_rate REAL NOT NULL DEFAULT 0,

        line_subtotal REAL NOT NULL,

        FOREIGN KEY (subscription_id)
            REFERENCES subscriptions(id)
            ON DELETE CASCADE,

        FOREIGN KEY (product_id)
            REFERENCES products(id),

        FOREIGN KEY (variant_id)
            REFERENCES product_variants(id)

            )
        """)
        # =====================================
        # INVOICES TABLE
        # =====================================

        connection.execute("""
            CREATE TABLE IF NOT EXISTS invoices (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        invoice_number TEXT UNIQUE,

        subscription_id INTEGER NOT NULL,

        customer_id INTEGER NOT NULL,

        billing_period_start TEXT NOT NULL,

        billing_period_end TEXT NOT NULL,

        invoice_date TEXT NOT NULL,

        due_date TEXT NOT NULL,

        subtotal REAL NOT NULL DEFAULT 0,

        tax_amount REAL NOT NULL DEFAULT 0,

        total_amount REAL NOT NULL DEFAULT 0,

        status TEXT NOT NULL DEFAULT 'Draft'
            CHECK(status IN (
                'Draft',
                'Confirmed',
                'Paid',
                'Cancelled'
            )),

        sent_at TEXT,

        created_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (subscription_id)
            REFERENCES subscriptions(id),

        FOREIGN KEY (customer_id)
            REFERENCES customers(id),

        UNIQUE(subscription_id, billing_period_start)

            )
        """)


        # =====================================
        # INVOICE LINE ITEMS TABLE
        # =====================================

        connection.execute("""
            CREATE TABLE IF NOT EXISTS invoice_lines (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        invoice_id INTEGER NOT NULL,

        description TEXT NOT NULL,

        quantity REAL NOT NULL,

        unit_price REAL NOT NULL,

        tax_rate REAL NOT NULL DEFAULT 0,

        line_subtotal REAL NOT NULL,

        tax_amount REAL NOT NULL,

        line_total REAL NOT NULL,

        FOREIGN KEY (invoice_id)
            REFERENCES invoices(id)
            ON DELETE CASCADE

            )
        """)
        # Indexes for faster invoice searches
        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_invoices_customer
            ON invoices(customer_id)
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_invoices_status
            ON invoices(status)
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_invoices_due_date
            ON invoices(due_date)
        """)
        # Payments Table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_number TEXT UNIQUE NOT NULL,
                invoice_id INTEGER NOT NULL,
                customer_id INTEGER NOT NULL,
                payment_date TEXT NOT NULL,
                amount REAL NOT NULL CHECK(amount > 0),
                payment_method TEXT NOT NULL,
                transaction_reference TEXT,
                notes TEXT,
                status TEXT DEFAULT 'Completed'
                    CHECK(status IN ('Completed', 'Pending', 'Failed', 'Refunded')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (invoice_id)
                    REFERENCES invoices(id),

                FOREIGN KEY (customer_id)
                    REFERENCES customers(id)
            )
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_payments_invoice
            ON payments(invoice_id)
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_payments_customer
            ON payments(customer_id)
        """)
        # Discounts Table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS discounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                description TEXT,
                discount_type TEXT NOT NULL
                    CHECK(discount_type IN ('Percentage', 'Fixed Amount')),
                discount_value REAL NOT NULL
                    CHECK(discount_value > 0),
                min_order_value REAL DEFAULT 0,
                max_discount_amount REAL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                usage_limit INTEGER,
                used_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'Active'
                    CHECK(status IN ('Active', 'Inactive')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_discounts_code
            ON discounts(code)
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_discounts_status
            ON discounts(status)
        """)
        connection.commit()

    finally:
        connection.close()
