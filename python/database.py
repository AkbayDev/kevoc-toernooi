# python/database.py
import os
import shutil
import sqlite3

DATABASE_NAAM = '/data/users.db'

def init_volume_data():
    """Copy initial database files from the repo to the persistent volume on first startup."""
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    files_to_copy = [('users.db',  '/data/users.db')]
    for src_name, dst_path in files_to_copy:
        if not os.path.exists(dst_path):
            src_path = os.path.join(repo_root, src_name)
            try:
                shutil.copy(src_path, dst_path)
                print(f"Gekopieerd: {src_path} → {dst_path}")
            except Exception as e:
                print(f"Kon {src_name} niet kopiëren naar {dst_path}: {e}")

def merge_preset_users():
    """Merge preset user accounts from the repo's users.db into the persistent volume database.

    For each user in /app/users.db, insert them into /data/users.db only if their
    email does not already exist there. Existing runtime accounts are never overwritten.
    """
    src_path = '/app/users.db'
    if not os.path.exists(src_path):
        print(f"Geen preset gebruikers gevonden op {src_path}, overgeslagen.")
        return

    try:
        src_conn = sqlite3.connect(src_path)
        src_conn.row_factory = sqlite3.Row
        src_cursor = src_conn.cursor()
        src_cursor.execute("SELECT email, password, role, reset_code FROM users")
        preset_users = src_cursor.fetchall()
        src_conn.close()
    except Exception as e:
        print(f"Kon preset gebruikers niet lezen uit {src_path}: {e}")
        return

    if not preset_users:
        print("Geen preset gebruikers gevonden in de bronbestanden.")
        return

    try:
        dst_conn = sqlite3.connect(DATABASE_NAAM, timeout=5.0)
        dst_cursor = dst_conn.cursor()
        inserted = 0
        skipped = 0
        for user in preset_users:
            dst_cursor.execute("SELECT 1 FROM users WHERE email = ?", (user['email'],))
            if dst_cursor.fetchone() is None:
                dst_cursor.execute(
                    "INSERT INTO users (email, password, role, reset_code) VALUES (?, ?, ?, ?)",
                    (user['email'], user['password'], user['role'], user['reset_code'])
                )
                inserted += 1
            else:
                skipped += 1
        dst_conn.commit()
        dst_conn.close()
        print(f"Preset gebruikers samengevoegd: {inserted} toegevoegd, {skipped} overgeslagen (bestaan al).")
    except Exception as e:
        print(f"Fout bij samenvoegen van preset gebruikers in {DATABASE_NAAM}: {e}")

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
                    tijdsblok TEXT DEFAULT NULL,
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
        ('vrijwilligers', 'tijdsblok',    'TEXT DEFAULT NULL'),
        ('wedstrijden',   'score_thuis',  'INTEGER'),
        ('wedstrijden',   'score_uit',    'INTEGER'),
        ('ploegen',       'reeks',        'TEXT DEFAULT NULL'),
        ('acties',        'beheerder_email', 'TEXT DEFAULT NULL'),
    ]
    for tabel, kolom, definitie in migraties:
        try:
            cursor.execute(f"ALTER TABLE {tabel} ADD COLUMN {kolom} {definitie}")
        except Exception:
            pass  # Kolom bestaat al

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS acties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            omschrijving TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            beheerder_email TEXT DEFAULT NULL,
            datum TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Reeksen tabel
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reeksen (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            naam TEXT NOT NULL UNIQUE,
            geslacht TEXT NOT NULL,
            categorie TEXT NOT NULL,
            actief INTEGER NOT NULL DEFAULT 0
        )
    ''')

    ALLE_REEKSEN = [
        # Senioren Heren
        ("Superligue Heren",        "Heren",  "Senior"),
        ("Liga A Heren",            "Heren",  "Senior"),
        ("Liga B Heren",            "Heren",  "Senior"),
        ("Nationale 1 Heren",       "Heren",  "Senior"),
        ("Nationale 2 Heren",       "Heren",  "Senior"),
        ("Nationale 3 Heren",       "Heren",  "Senior"),
        ("Provinciale 1 Heren",     "Heren",  "Senior"),
        ("Provinciale 2 Heren",     "Heren",  "Senior"),
        ("Provinciale 3 Heren",     "Heren",  "Senior"),
        # Senioren Dames
        ("Superligue Dames",        "Dames",  "Senior"),
        ("Liga A Dames",            "Dames",  "Senior"),
        ("Liga B Dames",            "Dames",  "Senior"),
        ("Nationale 1 Dames",       "Dames",  "Senior"),
        ("Nationale 2 Dames",       "Dames",  "Senior"),
        ("Nationale 3 Dames",       "Dames",  "Senior"),
        ("Provinciale 1 Dames",     "Dames",  "Senior"),
        ("Provinciale 2 Dames",     "Dames",  "Senior"),
        ("Provinciale 3 Dames",     "Dames",  "Senior"),
        # Jeugd Heren
        ("U21 Heren",               "Heren",  "Jeugd"),
        ("U19 Heren",               "Heren",  "Jeugd"),
        ("U17 Heren",               "Heren",  "Jeugd"),
        ("U15 Heren",               "Heren",  "Jeugd"),
        ("U13 Heren",               "Heren",  "Jeugd"),
        ("U11 Heren",               "Heren",  "Jeugd"),
        ("U9 Heren",                "Heren",  "Jeugd"),
        # Jeugd Dames
        ("U21 Dames",               "Dames",  "Jeugd"),
        ("U19 Dames",               "Dames",  "Jeugd"),
        ("U17 Dames",               "Dames",  "Jeugd"),
        ("U15 Dames",               "Dames",  "Jeugd"),
        ("U13 Dames",               "Dames",  "Jeugd"),
        ("U11 Dames",               "Dames",  "Jeugd"),
        ("U9 Dames",                "Dames",  "Jeugd"),
        # Mix/Recreatief
        ("Recreatief Mix",          "Mix",    "Recreatief"),
        ("U13 Mix",                 "Mix",    "Jeugd"),
        ("U11 Mix",                 "Mix",    "Jeugd"),
        ("U9 Mix",                  "Mix",    "Jeugd"),
    ]

    for naam, geslacht, categorie in ALLE_REEKSEN:
        try:
            cursor.execute(
                "INSERT OR IGNORE INTO reeksen (naam, geslacht, categorie, actief) VALUES (?, ?, ?, 0)",
                (naam, geslacht, categorie)
            )
        except Exception:
            pass

    conn.commit()
    conn.close()

init_volume_data()
merge_preset_users()
init_db()
print("Database succesvol geïnitialiseerd!")