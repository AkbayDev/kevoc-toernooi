# python/database.py
import sqlite3

DATABASE_NAAM = 'users.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_NAAM, timeout=5.0)
    conn.row_factory = sqlite3.Row 
    return conn

def init_db():
    conn = get_db_connection()
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

    cursor.execute('''
                INSERT OR IGNORE INTO rollen (rol) 
                VALUES ('scheids')
            ''')

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
    
    # Update bestaande jobrollen
    cursor.execute(
        "UPDATE vrijwilligers SET job = ? WHERE job = ?",
        ('Scheidsrechter', 'Verwelkoming & Score keeping')
    )
    cursor.execute(
        "UPDATE werkrooster SET jobrol = ? WHERE jobrol = ?",
        ('Scheidsrechter', 'Verwelkoming & Score keeping')
    )
    
    # Voeg ontbrekende kolommen toe aan bestaande databases
    migraties = [
        ('vrijwilligers', 'wedstrijd_id', 'INTEGER DEFAULT NULL'),
        ('vrijwilligers', 'email',        'TEXT DEFAULT NULL'),
        ('vrijwilligers', 'tijdsblok',    'TEXT DEFAULT NULL'),  # Nieuw: tijdsblok voor scheids
        ('wedstrijden',   'score_thuis',  'INTEGER'),
        ('wedstrijden',   'score_uit',    'INTEGER'),
    ]
    for tabel, kolom, definitie in migraties:
        try:
            cursor.execute(f"ALTER TABLE {tabel} ADD COLUMN {kolom} {definitie}")
        except Exception:
            pass  # Kolom bestaat al
    
    conn.commit()
    conn.close()

init_db()
print("Database succesvol geïnitialiseerd!")