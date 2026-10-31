import sqlite3
from pathlib import Path

# Keep the database in the main project folder
DB_PATH = Path(_file_).resolve().parent / "database.db"


def get_db_connection():
    """Create a connection to the SQLite database."""

    connection = sqlite3.connect(DB_PATH)

    # Allow us to access columns using their names
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def init_db():
    """Create the customers table if it does not exist."""

    connection = get_db_connection()

    try:
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

        connection.commit()

    finally:
        connection.close()
