# python/database.py
import sqlite3
import contextlib

DATABASE_NAAM = 'users.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_NAAM, timeout=5.0)
    # Zorgt ervoor dat we kolommen bij naam kunnen aanspreken ipv nummers (bijv. row['naam'])
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
            
            # 2. Gebruik INSERT OR IGNORE om duplicaten te voorkomen
    cursor.execute('''
                INSERT OR IGNORE INTO rollen (rol) 
                VALUES ('beheerder'), ('gebruiker'), ('hulp')
            ''')
        
    cursor.execute('''
                INSERT OR IGNORE INTO rollen (rol) 
                VALUES ('dev')
            ''')
           
        
            # 3. maak een vrijwilligers  tabel
    cursor.execute("""
                CREATE TABLE IF NOT EXISTS vrijwilligers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    naam TEXT NOT NULL,
                    tijdslot TEXT NOT NULL,
                    job TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'afwachtend',
                    wedstrijd_id INTEGER DEFAULT NULL,
                    inschrijfdatum  DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (wedstrijd_id) REFERENCES wedstrijden(id)
                )
            """)
    
    # NIEUW: Tabel voor het opgeslagen speelschema
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
    
    # NIEUW: Tabel voor werkrooster
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
    
    # Voeg wedstrijd_id kolom toe as deze nog niet bestaat (voor bestaande databases)
    try:
        cursor.execute("ALTER TABLE vrijwilligers ADD COLUMN wedstrijd_id INTEGER DEFAULT NULL")
    except:
        pass  # Kolom bestaat al
    
    conn.commit()
    conn.close()

init_db()
print("Database succesvol geïnitialiseerd!")