import sqlite3
from pathlib import Path

# Keep the database in the main project folder
DB_PATH = Path(_file_).resolve().parent / "database.db"


def get_db_connection():
    """Create a connection to the SQLite database."""

    connection = sqlite3.connect(DB_PATH)

    # Allow us to access columns using their names
    connection.row_factory = sqlite3.Row

    return connection


def init_db():
    """Create the customers table if it does not exist."""

    connection = get_db_connection()

    try:
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

        connection.commit()

    finally:
        connection.close()
