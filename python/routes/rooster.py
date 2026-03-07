from flask import Blueprint, request, jsonify
from database import get_db_connection

rooster_bp = Blueprint('rooster', __name__)

def genereer_basis_rooster(alle_ploegen):
    return [
        {
            "tijdsblok": "10:00-12:00",
            "starttijd": "10:00",
            "status": "ok",
            "reeksen": [
                {
                    "reeks": "A",
                    "wedstrijden": [
                        {"ronde": 1, "veld": 1, "thuis": alle_ploegen[0]["naam"] if len(alle_ploegen) > 0 else "TBD",
                         "uit": alle_ploegen[1]["naam"] if len(alle_ploegen) > 1 else "TBD", "scheids": "-"}
                    ]
                }
            ]
        }
    ]

@rooster_bp.route('/rooster', methods=['POST'])
def genereer_rooster():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT ploeg AS naam, niveau FROM ploegen")
        ploegen_db = cursor.fetchall()
        alle_ploegen = [{"naam": row["naam"], "niveau": row["niveau"]} for row in ploegen_db]

        if not alle_ploegen:
            return jsonify({"error": "Er zijn nog geen ploegen ingeschreven!"}), 400

        dagplanning = genereer_basis_rooster(alle_ploegen)

        try:
            cursor.execute("DELETE FROM wedstrijden")
            for blok in dagplanning:
                if blok.get("status") == "fout":
                    continue 

                tijdsblok = blok["tijdsblok"]
                starttijd = blok["starttijd"]

                for reeks in blok.get("reeksen", []):
                    reeks_naam = reeks["reeks"]
                    for match in reeks["wedstrijden"]:
                        cursor.execute('''
                            INSERT INTO wedstrijden (tijdsblok, starttijd, reeks, ronde, veld, thuis_ploeg, uit_ploeg, scheidsrechter)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            tijdsblok, starttijd, reeks_naam, match["ronde"], match["veld"],
                            match["thuis"], match["uit"], match.get("scheids", "-")
                        ))
            conn.commit()
            return jsonify({"message": "Het toernooischema is succesvol berekend en opgeslagen!"}), 200

        except Exception as e:
            return jsonify({"error": f"Fout bij opslaan: {str(e)}"}), 500

# Hier brak je code af, ik heb hem aangevuld:
@rooster_bp.route('/rooster', methods=['GET'])
def get_rooster():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM wedstrijden ORDER BY starttijd ASC, veld ASC")
            rows = cursor.fetchall()
        
        # Zet de database rijen om in een lijst van dictionaries
        rooster = [dict(row) for row in rows]
        return jsonify(rooster), 200
    except Exception as e:
        return jsonify({"error": f"Kon rooster niet laden: {str(e)}"}), 500