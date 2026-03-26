from flask import Blueprint, request, jsonify
from database import get_db_connection

acties_bp = Blueprint('acties', __name__)

@acties_bp.route('/acties', methods=['GET'])
def get_acties():
    """Geeft actieve acties (open + bezig), gesorteerd: bezig eerst, dan open."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM acties
            WHERE status != 'gedaan'
            ORDER BY CASE WHEN status = 'bezig' THEN 0 ELSE 1 END, id DESC
        """)
        rows = cursor.fetchall()
    return jsonify([dict(r) for r in rows]), 200


@acties_bp.route('/acties/archief', methods=['GET'])
def get_archief():
    """Geeft gedane acties, nieuwste eerst."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM acties WHERE status = 'gedaan' ORDER BY id DESC")
        rows = cursor.fetchall()
    return jsonify([dict(r) for r in rows]), 200


@acties_bp.route('/acties', methods=['POST'])
def add_actie():
    omschrijving = request.json.get('omschrijving')
    if not omschrijving:
        return jsonify({"error": "Omschrijving is verplicht."}), 400
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO acties (omschrijving, status) VALUES (?, 'open')", (omschrijving,))
        conn.commit()
    return jsonify({"message": "Actie toegevoegd."}), 201


@acties_bp.route('/acties/<int:id>/claim', methods=['PATCH'])
def claim_actie(id):
    """Beheerder claimt een actie. Slaat email op en zet status op 'bezig'."""
    email = request.json.get('email')
    if not email:
        return jsonify({"error": "Email is verplicht."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status, beheerder_email FROM acties WHERE id = ?", (id,))
        actie = cursor.fetchone()

        if not actie:
            return jsonify({"error": "Actie niet gevonden."}), 404
        if actie['status'] == 'bezig':
            return jsonify({"error": f"Al geclaimd door {actie['beheerder_email']}."}), 400

        cursor.execute(
            "UPDATE acties SET status = 'bezig', beheerder_email = ? WHERE id = ?",
            (email, id)
        )
        conn.commit()
    return jsonify({"message": "Actie geclaimd!"}), 200


@acties_bp.route('/acties/<int:id>/gedaan', methods=['PATCH'])
def actie_gedaan(id):
    """Claimer markeert actie als gedaan — verplaatst naar archief."""
    email = request.json.get('email')
    if not email:
        return jsonify({"error": "Email is verplicht."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT beheerder_email FROM acties WHERE id = ?", (id,))
        actie = cursor.fetchone()

        if not actie:
            return jsonify({"error": "Actie niet gevonden."}), 404
        if actie['beheerder_email'] != email:
            return jsonify({"error": "Alleen de claimer kan deze actie afsluiten."}), 403

        cursor.execute("UPDATE acties SET status = 'gedaan' WHERE id = ?", (id,))
        conn.commit()
    return jsonify({"message": "Actie afgerond en gearchiveerd."}), 200


@acties_bp.route('/acties/<int:id>', methods=['DELETE'])
def delete_actie(id):
    """Verwijder een actie permanent uit het archief."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM acties WHERE id = ?", (id,))
        conn.commit()
    return jsonify({"message": "Actie verwijderd."}), 200
