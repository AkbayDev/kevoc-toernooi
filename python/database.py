# database.py
import sqlite3
import contextlib

DB_NAME = 'users.db'

@contextlib.contextmanager
def get_db_connection():
    """Beheert de database connectie en sluit deze automatisch af."""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row  # Zorgt dat we resultaten als dicts kunnen lezen
    try:
        yield conn
    finally:
        conn.close()