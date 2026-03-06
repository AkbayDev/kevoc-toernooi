# dash.py
from flask import Blueprint, request, jsonify
from database import get_db_connection  # Importeer je helper

dash_bp = Blueprint('dash', __name__)
# ==========================================
# FINANCIËN ENDPOINTS
# ==========================================

@dash_bp.route('/financien', methods=['GET'])
def get_financien():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT SUM(bedrag) AS totaal FROM financien WHERE type = 'inkomst'")
        inkomsten = cursor.fetchone()['totaal'] or 0.0
        
        cursor.execute("SELECT SUM(bedrag) AS totaal FROM financien WHERE type = 'kost'")
        kosten = cursor.fetchone()['totaal'] or 0.0
        
    return jsonify({"inkomsten": inkomsten, "kosten": kosten, "winst": inkomsten - kosten}), 200


@dash_bp.route('/financien', methods=['POST'])
def add_financien():
    data = request.json
    omschrijving = data.get('omschrijving')
    bedrag = data.get('bedrag')
    transactie_type = data.get('type')
    
    if not omschrijving or not bedrag or not transactie_type:
        return jsonify({"error": "Vul alle velden in."}), 400
        
    try: 
        bedrag = float(bedrag)
    except ValueError: 
        return jsonify({"error": "Ongeldig bedrag."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO financien (omschrijving, bedrag, type) VALUES (?, ?, ?)", 
            (omschrijving, bedrag, transactie_type)
        )
        conn.commit()
        
    return jsonify({"message": "Transactie succesvol toegevoegd!"}), 201


@dash_bp.route('/transacties', methods=['GET'])
def get_transacties():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Sorteer op id DESC (nieuwste bovenaan)
        cursor.execute("SELECT omschrijving, bedrag, type FROM financien ORDER BY id DESC")
        rows = cursor.fetchall()
    
    # Maak er een handige lijst van voor JavaScript (gebruik makend van de row_factory)
    transacties = [{"omschrijving": r["omschrijving"], "bedrag": r["bedrag"], "type": r["type"]} for r in rows]
    return jsonify(transacties), 200

# ==========================================
# PLOEGEN ENDPOINTS
# ==========================================

@dash_bp.route('/ploegen', methods=['GET'])
def get_ploegen():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ploegen")
        rows = cursor.fetchall()
    
    ploegen = [{"naam": r["ploeg"], "niveau": r["niveau"],"categorie": r["categorie"], "betaalstatus": r["betaalstatus"]} for r in rows]
    return jsonify(ploegen), 200


@dash_bp.route('/ploegen', methods=['POST'])
def add_ploeg():
    naam = request.json.get('naam')
    niveau = request.json.get('niveau')
    categorie = request.json.get('categorie')
    betaalstatus = request.json.get('betaalstatus')

    if not naam or not niveau or not categorie:
        return jsonify({"error": "Vul alle velden in."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO ploegen (ploeg, niveau, categorie, betaalstatus) VALUES (?, ?, ?, ?)", 
            (naam, niveau, categorie, betaalstatus)
        )
        conn.commit()

    return jsonify({"message": f"Ploeg '{naam}' is succesvol ingeschreven!"}), 201

# ==========================================
# VRIJWILLIGERS ENDPOINTS
# ==========================================

@dash_bp.route('/vrijwilligers', methods=['GET'])
def get_vrijwilligers():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT naam, tijdslot, job FROM vrijwilligers ORDER BY id DESC")
        rows = cursor.fetchall()

    vrijwilligers = [{"naam": r["naam"], "tijdslot": r["tijdslot"], "job": r["job"]} for r in rows]
    return jsonify(vrijwilligers), 200


@dash_bp.route('/vrijwilligers', methods=['POST'])
def add_vrijwilliger():
    data = request.json
    naam = data.get('naam')
    tijdslot = data.get('tijdslot')
    job = data.get('job')

    if not naam or not tijdslot or not job:
        return jsonify({"error": "Vul alle velden in."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO vrijwilligers (naam, tijdslot, job) VALUES (?, ?, ?)", 
            (naam, tijdslot, job)
        )
        conn.commit()

    return jsonify({"message": f"{naam} is succesvol ingeschreven!"}), 201