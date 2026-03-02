// Elementen selecteren
const toggleLogin = document.getElementById('toggle-login');
const toggleRegister = document.getElementById('toggle-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const messageBox = document.getElementById('message-box');

// Wisselen naar Inloggen
toggleLogin.addEventListener('click', () => {
    // Verander de actieve knop stijl
    toggleLogin.classList.add('active');
    toggleRegister.classList.remove('active');
    
    // Toon login, verberg registratie
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    
    // Wis eventuele berichten
    messageBox.textContent = ""; 
});

// Wisselen naar Registreren
toggleRegister.addEventListener('click', () => {
    // Verander de actieve knop stijl
    toggleRegister.classList.add('active');
    toggleLogin.classList.remove('active');
    
    // Toon registratie, verberg login
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    
    // Wis eventuele berichten
    messageBox.textContent = ""; 
});

// Login logica
document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault(); 
    const email = document.getElementById('login-email').value;
    
    messageBox.style.color = "#27ae60"; // Groene tekst
    messageBox.textContent = `Succesvol ingelogd als: ${email}`;
});

// Registratie logica
document.getElementById('form-register').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const role = document.getElementById('reg-role').value;

    messageBox.style.color = "#2980b9"; // Blauwe tekst
    messageBox.textContent = `Account (${role}) succesvol aangemaakt!`;
    
    // Optioneel: formulier leegmaken na succes
    document.getElementById('form-register').reset();
});