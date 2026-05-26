import { apiRequest } from './api.js';

const ui = {
    toggleLogin: document.getElementById('toggle-login'),
    toggleRegister: document.getElementById('toggle-register'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    forgotForm: document.getElementById('forgot-form'),
    messageBox: document.getElementById('message-box'),
    loginSubmit: document.getElementById('form-login'),
    registerSubmit: document.getElementById('form-register'),
    goToForgotBtn: document.getElementById('go-to-forgot'),
    backToLoginBtn: document.getElementById('back-to-login'),
    formForgotEmail: document.getElementById('form-forgot-email'),
    formForgotCode: document.getElementById('form-forgot-code'),
    formNewPassword: document.getElementById('form-new-password')
};

function showMessage(msg, type = 'info') {
    ui.messageBox.textContent = msg;
    ui.messageBox.style.color =
        type === 'error'   ? 'var(--color-error)' :
        type === 'success' ? 'var(--color-success)' :
                             'var(--color-info)';
}

function switchTab(tabName) {
    ui.messageBox.textContent = "";
    ui.loginForm.classList.add('hidden');
    ui.registerForm.classList.add('hidden');
    ui.forgotForm.classList.add('hidden');
    ui.toggleLogin.classList.remove('active');
    ui.toggleRegister.classList.remove('active');

    if (tabName === 'login') {
        ui.loginForm.classList.remove('hidden');
        ui.toggleLogin.classList.add('active');
    } else if (tabName === 'register') {
        ui.registerForm.classList.remove('hidden');
        ui.toggleRegister.classList.add('active');
    } else if (tabName === 'forgot') {
        ui.forgotForm.classList.remove('hidden');
        ui.formForgotEmail.classList.remove('hidden');
        ui.formForgotCode.classList.add('hidden');
        ui.formNewPassword.classList.add('hidden');
        document.getElementById('reset-email').value = '';
        document.getElementById('reset-code').value = '';
        document.getElementById('new-password').value = '';
    }
}

// Event Listeners Tabs
ui.toggleLogin.addEventListener('click', () => switchTab('login'));
ui.toggleRegister.addEventListener('click', () => switchTab('register'));
ui.goToForgotBtn.addEventListener('click', () => switchTab('forgot'));
ui.backToLoginBtn.addEventListener('click', () => switchTab('login'));

// Login
ui.loginSubmit.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    showMessage("Bezig met inloggen...", "info");
    try {
        const res = await apiRequest('/login', {
            method: 'POST',
            body: { email, password }
        });
        showMessage("Succesvol ingelogd! Je wordt doorgestuurd...", "success");

        localStorage.setItem('userRole', res.role);
        localStorage.setItem('userEmail', res.email);
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (err) { showMessage(err.message, "error"); }
});

// Registratie
ui.registerSubmit.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    showMessage("Bezig met registreren...", "info");
    try {
        const res = await apiRequest('/register', {
            method: 'POST',
            body: { email, password }
        });
        showMessage(res.message, "success");
        document.getElementById('form-register').reset();
    } catch (err) { showMessage(err.message, "error"); }
});

// Wachtwoord Herstel Logica
let herstelEmail = "";

ui.formForgotEmail.addEventListener('submit', async (e) => {
    e.preventDefault();
    herstelEmail = document.getElementById('reset-email').value;
    showMessage("Code aanvragen...", "info");
    try {
        const res = await apiRequest('/forgot-password', {
            method: 'POST',
            body: { email: herstelEmail }
        });
        showMessage(res.message, "success");
        ui.formForgotEmail.classList.add('hidden');
        ui.formForgotCode.classList.remove('hidden');
    } catch (err) { showMessage(err.message, "error"); }
});

ui.formForgotCode.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('reset-code').value;
    showMessage("Code controleren...", "info");
    try {
        const res = await apiRequest('/verify-code', {
            method: 'POST',
            body: { email: herstelEmail, code: code }
        });
        showMessage(res.message, "success");
        ui.formForgotCode.classList.add('hidden');
        ui.formNewPassword.classList.remove('hidden');
    } catch (err) { showMessage(err.message, "error"); }
});

ui.formNewPassword.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const code = document.getElementById('reset-code').value;
    showMessage("Wachtwoord opslaan...", "info");
    try {
        const res = await apiRequest('/reset-password', {
            method: 'POST',
            body: { email: herstelEmail, code: code, new_password: newPassword }
        });
        showMessage(res.message, "success");
        setTimeout(() => { switchTab('login'); }, 2000);
    } catch (err) { showMessage(err.message, "error"); }
});