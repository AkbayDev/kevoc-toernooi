import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import resend

# --- Importeer Blueprints ---
from routes.financien import financien_bp
from routes.ploegen import ploegen_bp
from routes.login import login_bp
from routes.rooster import rooster_bp
from routes.vrijwilligers import vrijwilligers_bp
from routes.werkrooster import werkrooster_bp
from routes.acties import acties_bp

# --- App Configuratie ---
# We vertellen Flask om te zoeken naar statische bestanden (zoals index.html, css, js)
# in de bovenliggende map ('../') ten opzichte van de locatie van dit bestand.
app = Flask(__name__, static_folder='../', static_url_path='/')

# --- Environment Variables ---
RESEND_API_KEY = os.getenv('RESEND_API_KEY', 're_NLShZa9R_Ej6QqqpgTqEYTjw178HssxUr')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
else:
    print("WAARSCHUWING: RESEND_API_KEY is niet ingesteld. E-mails voor wachtwoordherstel zullen niet werken.")

# --- CORS Configuratie ---
CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- Registreer Blueprints ---
app.register_blueprint(financien_bp, url_prefix='/api')
app.register_blueprint(ploegen_bp, url_prefix='/api')
app.register_blueprint(login_bp, url_prefix='/api')
app.register_blueprint(rooster_bp, url_prefix='/api')
app.register_blueprint(vrijwilligers_bp, url_prefix='/api')
app.register_blueprint(werkrooster_bp, url_prefix='/api')
app.register_blueprint(acties_bp, url_prefix='/api')

# --- Statische Bestanden Serveren ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Dynamische poort voor deployment (fallback 5000 voor lokaal)
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
