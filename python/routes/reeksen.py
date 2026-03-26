from flask import Blueprint, request, jsonify
from database import get_db_connection

reeksen_bp = Blueprint('reeksen', __name__)

@reeksen_bp.route('/reeksen', methods=['GET'])
def get_reeksen():
    """Alle reeksen, gesorteerd op categorie dan geslacht dan naam."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reeksen ORDER BY categorie ASC, geslacht ASC, naam ASC")
        rows = cursor.fetchall()
    return jsonify([dict(r) for r in rows]), 200


@reeksen_bp.route('/reeksen/actief', methods=['GET'])
def get_actieve_reeksen():
    """Alleen actieve reeksen — voor het inschrijfformulier."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reeksen WHERE actief = 1 ORDER BY categorie ASC, geslacht ASC, naam ASC")
        rows = cursor.fetchall()
    return jsonify([dict(r) for r in rows]), 200


@reeksen_bp.route('/reeksen/<int:id>/actief', methods=['PATCH'])
def toggle_reeks_actief(id):
    """Zet een reeks aan of uit."""
    data = request.json
    actief = data.get('actief')  # 0 of 1

    if actief not in (0, 1):
        return jsonify({"error": "Ongeldig waarde voor actief (0 of 1)."}), 400

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE reeksen SET actief = ? WHERE id = ?", (actief, id))
        conn.commit()

    return jsonify({"message": "Reeks bijgewerkt."}), 200