import sqlite3
import os
import contextlib

# Gebruik een environment variable voor het database pad op Railway.
# Lokaal valt hij netjes terug op 'kevoc.db'.
DATABASE_NAME = os.getenv('DATABASE_PATH', 'kevoc.db')

@contextlib.contextmanager
def get_db_connection():
    """
    Opent een verbinding met de database en sluit deze automatisch.
    """
    conn = sqlite3.connect(DATABASE_NAME, timeout=5.0)
    conn.row_factory = sqlite3.Row 
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            email TEXT UNIQUE NOT NULL, 
            password TEXT NOT NULL, 
            role TEXT NOT NULL, 
            reset_code TEXT
        )''')
        
        cursor.execute('''CREATE TABLE IF NOT EXISTS financien (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            omschrijving TEXT NOT NULL, 
            bedrag REAL NOT NULL, 
            type TEXT NOT NULL, 
            datum TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS ploegen (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            ploeg TEXT NOT NULL, 
            betaalstatus TEXT NOT NULL,
            niveau TEXT NOT NULL,
            categorie TEXT NOT NULL
        )''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS rollen (
                id INTEGER PRIMARY KEY AUTOINCREMENT, 
                rol TEXT UNIQUE NOT NULL
            )''')

        cursor.execute('''
                INSERT OR IGNORE INTO rollen (rol) 
                VALUES ('beheerder'), ('gebruiker'), ('hulp')
            ''')
    
        cursor.execute('''
                INSERT OR IGNORE INTO rollen (rol) 
                VALUES ('dev')
            ''')

        # Vrijwilligers tabel met email kolom
        cursor.execute("""
                CREATE TABLE IF NOT EXISTS vrijwilligers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    naam TEXT NOT NULL,
                    email TEXT DEFAULT NULL,
                    tijdslot TEXT NOT NULL,
                    job TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'afwachtend',
                    wedstrijd_id INTEGER DEFAULT NULL,
                    inschrijfdatum DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (wedstrijd_id) REFERENCES wedstrijden(id)
                )
            """)
    
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS wedstrijden (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tijdsblok TEXT NOT NULL,
            starttijd TEXT,
            reeks TEXT NOT NULL,
            ronde INTEGER NOT NULL,
            veld INTEGER NOT NULL,
            thuis_ploeg TEXT NOT NULL,
            uit_ploeg TEXT NOT NULL,
            scheidsrechter TEXT,
            uitslag TEXT DEFAULT '-'
        )
    ''')
    
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS werkrooster (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vrijwilliger_id INTEGER,
            tijdslot TEXT NOT NULL,
            jobrol TEXT NOT NULL,
            opmerking TEXT,
            FOREIGN KEY (vrijwilliger_id) REFERENCES vrijwilligers(id)
        )
    ''')
    
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS acties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            omschrijving TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            datum TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

        # Update bestaande jobrollen
        cursor.execute(
            "UPDATE vrijwilligers SET job = ? WHERE job = ?",
            ('Scheidsrechter', 'Verwelkoming & Score keeping')
        )
        cursor.execute(
            "UPDATE werkrooster SET jobrol = ? WHERE jobrol = ?",
            ('Scheidsrechter', 'Verwelkoming & Score keeping')
        )
        
        # Voeg kolommen toe voor bestaande databases die ze nog niet hebben
        for kolom, definitie in [
            ('wedstrijd_id', 'INTEGER DEFAULT NULL'),
            ('email', 'TEXT DEFAULT NULL')
        ]:
            try:
                cursor.execute(f"ALTER TABLE vrijwilligers ADD COLUMN {kolom} {definitie}")
            except:
                pass  # Kolom bestaat al
        
        conn.commit()

# Run deze functie direct bij het inladen om te zorgen dat 
# tabellen altijd bestaan (zowel lokaal als op Railway)
init_db()
print("Database succesvol geïnitialiseerd!")