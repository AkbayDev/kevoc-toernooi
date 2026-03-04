from flask import Blueprint, request, jsonify
import sqlite3

dash_bp = Blueprint('dash', __name__)

@dash_bp.route('/api/financien', methods=['GET'])
def get_financien():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("SELECT SUM(bedrag) FROM financien WHERE type = 'inkomst'")
    inkomsten = cursor.fetchone()[0] or 0.0
    cursor.execute("SELECT SUM(bedrag) FROM financien WHERE type = 'kost'")
    kosten = cursor.fetchone()[0] or 0.0
    conn.close()
    return jsonify({"inkomsten": inkomsten, "kosten": kosten, "winst": inkomsten - kosten}), 200

@dash_bp.route('/api/financien', methods=['POST'])
def add_financien():
    data = request.json
    omschrijving, bedrag, transactie_type = data.get('omschrijving'), data.get('bedrag'), data.get('type')
    if not omschrijving or not bedrag or not transactie_type:
        return jsonify({"error": "Vul alle velden in."}), 400
    try: bedrag = float(bedrag)
    except ValueError: return jsonify({"error": "Ongeldig bedrag."}), 400

    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("INSERT INTO financien (omschrijving, bedrag, type) VALUES (?, ?, ?)", (omschrijving, bedrag, transactie_type))
    conn.commit()
    conn.close()
    return jsonify({"message": "Transactie succesvol toegevoegd!"}), 201

# NIEUW: Haal de lijst met alle transacties op
@dash_bp.route('/api/transacties', methods=['GET'])
def get_transacties():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    # Sorteer op id DESC (nieuwste bovenaan)
    cursor.execute("SELECT omschrijving, bedrag, type FROM financien ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    # Maak er een handige lijst van voor JavaScript
    transacties = [{"omschrijving": r[0], "bedrag": r[1], "type": r[2]} for r in rows]
    return jsonify(transacties), 200

# ==========================================
# PLOEGEN ENDPOINTS
# ==========================================

# 1. Haal alle ingeschreven ploegen op
# 1. Haal alle ingeschreven ploegen op
@dash_bp.route('/api/ploegen', methods=['GET'])
def get_ploegen():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # FOUT was: SELECT naam, niveau... ORDER BY naam
    # GOED is:
    cursor.execute("SELECT ploeg, niveau FROM ploegen ORDER BY ploeg ASC")
    rows = cursor.fetchall()
    conn.close()
    
    # We sturen het wel als 'naam' terug naar JavaScript, want daar verwacht je JS code dat (p.naam)
    ploegen = [{"naam": r[0], "niveau": r[1]} for r in rows]
    return jsonify(ploegen), 200


# 2. Schrijf een nieuwe ploeg in

@dash_bp.route('/api/ploegen', methods=['POST'])
def add_ploeg():
    data = request.json
    
    # Gebruik de sleutels die vanuit JavaScript gestuurd worden
    naam = data.get('naam')
    niveau = data.get('niveau')
    categorie = data.get('categorie')

    # Voeg ook validatie toe voor categorie
    if not naam or not niveau or not categorie:
        return jsonify({"error": "Vul alle velden in."}), 400

    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    # In de database heet de kolom 'ploeg', dat is prima
    cursor.execute("INSERT INTO ploegen (ploeg, niveau, categorie) VALUES (?, ?, ?)", (naam, niveau, categorie))
    conn.commit()
    conn.close()

    return jsonify({"message": f"Ploeg '{naam}' is succesvol ingeschreven!"}), 201

# ==========================================
# VRIJWILLIGERS ENDPOINTS
# ==========================================

@dash_bp.route('/api/vrijwilligers', methods=['GET'])
def get_vrijwilligers():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("SELECT naam, tijdslot, job FROM vrijwilligers ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    vrijwilligers = [{"naam": r[0], "tijdslot": r[1], "job": r[2]} for r in rows]
    return jsonify(vrijwilligers), 200

@dash_bp.route('/api/vrijwilligers', methods=['POST'])
def add_vrijwilliger():
    data = request.json
    naam = data.get('naam')
    tijdslot = data.get('tijdslot')
    job = data.get('job')

    if not naam or not tijdslot or not job:
        return jsonify({"error": "Vul alle velden in."}), 400

    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("INSERT INTO vrijwilligers (naam, tijdslot, job) VALUES (?, ?, ?)", (naam, tijdslot, job))
    conn.commit()
    conn.close()

    return jsonify({"message": f"{naam} is succesvol ingeschreven!"}), 201