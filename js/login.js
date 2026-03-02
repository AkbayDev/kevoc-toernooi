// --- 1. Configuratie & Elementen ---
// Zet hier de URL van je toekomstige Python backend (bijv. Flask draait vaak op poort 5000)
const CONFIG = {
    apiBaseUrl: 'http://localhost:5000/api' 
};

// Groepeer alle DOM elementen in een object voor overzichtelijkheid
const ui = {
    toggleLogin: document.getElementById('toggle-login'),
    toggleRegister: document.getElementById('toggle-register'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    messageBox: document.getElementById('message-box'),
    loginSubmit: document.getElementById('form-login'),
    registerSubmit: document.getElementById('form-register')
};

// --- 2. UI Helper Functies ---

// Functie om berichten weer te geven met de juiste kleur
function showMessage(msg, type = 'info') {
    ui.messageBox.textContent = msg;
    if (type === 'error') ui.messageBox.style.color = "#e74c3c"; // Rood voor fouten
    else if (type === 'success') ui.messageBox.style.color = "#27ae60"; // Groen voor succes
    else ui.messageBox.style.color = "#2980b9"; // Blauw voor laden/info
}

// Herbruikbare functie om tussen tabs te wisselen
function switchTab(showLogin) {
    ui.messageBox.textContent = ""; // Wis oude berichten

    if (showLogin) {
        ui.toggleLogin.classList.add('active');
        ui.toggleRegister.classList.remove('active');
        ui.loginForm.classList.remove('hidden');
        ui.registerForm.classList.add('hidden');
    } else {
        ui.toggleRegister.classList.add('active');
        ui.toggleLogin.classList.remove('active');
        ui.registerForm.classList.remove('hidden');
        ui.loginForm.classList.add('hidden');
    }
}

// --- 3. API Communicatie (Backend Koppeling) ---

// Deze herbruikbare functie stuurt data naar je Python backend en wacht op antwoord
async function sendToBackend(endpoint, data) {
    try {
        const response = await fetch(`${CONFIG.apiBaseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // We vertellen Python dat we JSON sturen
            },
            body: JSON.stringify(data) // Zet het JS object om naar tekst (JSON)
        });

        // Wacht op de data die Python terugstuurt
        const result = await response.json();

        // Check of de server een error status code teruggaf (bijv. 400 of 401)
        if (!response.ok) {
            throw new Error(result.error || 'Er is iets misgegaan op de server.');
        }

        return result; 
    } catch (error) {
        console.error("API Communicatie Fout:", error);
        throw error;
    }
}

// --- 4. Event Listeners ---

// Koppel de tab-wisselaar aan de knoppen
ui.toggleLogin.addEventListener('click', () => switchTab(true));
ui.toggleRegister.addEventListener('click', () => switchTab(false));

// --- Login Logica ---
ui.loginSubmit.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    // Haal de waardes op (vergeet het wachtwoord niet voor de backend!)
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value; 

    showMessage("Bezig met inloggen...", "info");

    try {
        // Stuur request naar bijv. http://localhost:5000/api/login
        const responseData = await sendToBackend('/login', { email, password });
        
        // Als we hier zijn, gaf Python een OK (200) status terug!
        showMessage(responseData.message || `Succesvol ingelogd!`, "success");
        
        // Hier kunnen we later een token (JWT) kunnen opslaan of doorverwijzen
        // window.location.href = '/dashboard.html';

    } catch (error) {
        // Als Python een error gooide (bijv. verkeerd wachtwoord), vangen we dat hier op
        showMessage(error.message, "error");
    }
});

// --- Registratie Logica ---
ui.registerSubmit.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value; 
    const role = document.getElementById('reg-role').value;

    showMessage("Bezig met registreren...", "info");

    try {
        // Stuur request naar bijv. http://localhost:5000/api/register
        const responseData = await sendToBackend('/register', { email, password, role });
        
        showMessage(responseData.message || `Account succesvol aangemaakt!`, "success");
        ui.registerSubmit.reset(); // Maak formulier leeg

    } catch (error) {
        showMessage(error.message, "error");
    }
});