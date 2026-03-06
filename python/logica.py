# python/dash.py
from flask import Blueprint, request, jsonify
from database import get_db_connection
import logica  # Importeer jouw logica bestand!

dash_bp = Blueprint('dash', __name__)

# ==========================================
# ROOSTER / DAGPLANNING ENDPOINTS
# ==========================================

@dash_bp.route('api/rooster', methods=['POST'])
def genereer_rooster():
    """
    Dit is de 'magische' knop voor de beheerder.
    Haalt ploegen op, berekent het rooster, en slaat het op in de database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Haal alle ploegen op
    cursor.execute("SELECT naam, niveau FROM ploegen")
    ploegen_db = cursor.fetchall()
    
    # Maak er een handige lijst van dicts van voor de logica
    alle_ploegen = [{"naam": row["naam"], "niveau": row["niveau"]} for row in ploegen_db]
    
    if not alle_ploegen:
        conn.close()
        return jsonify({"error": "Er zijn nog geen ploegen ingeschreven!"}), 400

    # 2. Laat logica.py het zware rekenwerk doen!
    dagplanning = logica.genereer_volledige_dagplanning(alle_ploegen)
    
    # 3. Opslaan in de database
    try:
        # Wis eerst het oude rooster zodat we met een schone lei beginnen
        cursor.execute("DELETE FROM wedstrijden")
        
        # Loop door de planning en sla elke wedstrijd op
        for blok in dagplanning:
            if blok["status"] == "fout":
                continue # Sla blokken met te veel ploegen even over
                
            tijdsblok = blok["tijdsblok"]
            starttijd = blok["starttijd"]
            
            for reeks in blok["reeksen"]:
                reeks_naam = reeks["reeks"]
                for match in reeks["wedstrijden"]:
                    cursor.execute('''
                        INSERT INTO wedstrijden (tijdsblok, starttijd, reeks, ronde, veld, thuis_ploeg, uit_ploeg, scheidsrechter)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        tijdsblok, starttijd, reeks_naam, match["ronde"], match["veld"], 
                        match["thuis"], match["uit"], match["scheids"]
                    ))
                    
        conn.commit()
        return jsonify({"message": "Het toernooischema is succesvol berekend en opgeslagen!"}), 200
        
    except Exception as e:
        return jsonify({"error": f"Fout bij opslaan: {str(e)}"}), 500
    finally:
        conn.close()


@dash_bp.route('/api/rooster', methods=['GET'])
def get_rooster():
    """
    Haalt het actuele rooster uit de database om te tonen op het dashboard.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Haal alles netjes gesorteerd op
    cursor.execute('''
        SELECT id, tijdsblok, starttijd, reeks, ronde, veld, thuis_ploeg, uit_ploeg, scheidsrechter, uitslag 
        FROM wedstrijden 
        ORDER BY starttijd ASC, veld ASC, ronde ASC
    ''')
    wedstrijden = cursor.fetchall()
    conn.close()
    
    # Zet om naar JSON
    resultaat = [dict(row) for row in wedstrijden]
    return jsonify(resultaat), 200