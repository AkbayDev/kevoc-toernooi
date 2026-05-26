import { apiRequest } from './api.js';

export const currentRole = localStorage.getItem('userRole');

export function checkAuth() {
    if (!currentRole) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Controleer bij laden of de rol in de database overeenkomt met localStorage.
// Als een beheerder de rol gewijzigd heeft, wordt localStorage bijgewerkt en de pagina herladen.
async function syncRolMetDatabase() {
    const email = localStorage.getItem('userEmail');
    if (!email) return;

    try {
        const data = await apiRequest(`/mijn-rol?email=${encodeURIComponent(email)}`);
        const huidigeRolInDB = data.role;
        const huidigeRolInStorage = localStorage.getItem('userRole');

        if (huidigeRolInDB && huidigeRolInDB !== huidigeRolInStorage) {
            localStorage.setItem('userRole', huidigeRolInDB);
            window.location.reload();
        }
    } catch (err) {
        console.warn('Rol sync mislukt:', err);
    }
}

export async function initAuthUI() {
    // Await role sync to prevent flash of incorrect UI
    await syncRolMetDatabase();

    const roleTranslations = {
        'beheerder': 'Beheerder',
        'hulp':      'Vrijwilliger',
        'scheids':   'Scheidsrechter',
        'gebruiker': 'Gebruiker',
        'dev':       'Developer'
    };

    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        const email = localStorage.getItem('userEmail');
        userDisplay.textContent = email || roleTranslations[currentRole] || 'Gast';
    }

    // Rollen die beheerder-niveau toegang hebben
    const BEHEERDER_ROLLEN = ['beheerder', 'dev'];
    // Rollen die hulp-niveau toegang hebben (+ omhoog)
    const HULP_ROLLEN = ['hulp', 'scheids', 'beheerder', 'dev'];

    const cards = document.querySelectorAll('.dash-card, [data-role]');
    cards.forEach(card => {
        const requiredRole = card.getAttribute('data-role');
        if (!requiredRole) return;

        // Splits komma-gescheiden rollen (bijv. "scheids,beheerder")
        const vereistRollen = requiredRole.split(',').map(r => r.trim());

        let isVisible = false;

        if (vereistRollen.includes('all')) {
            isVisible = true;
        } else if (vereistRollen.includes(currentRole)) {
            isVisible = true;
        } else if (vereistRollen.includes('beheerder') && BEHEERDER_ROLLEN.includes(currentRole)) {
            isVisible = true;
        } else if (vereistRollen.includes('hulp') && HULP_ROLLEN.includes(currentRole)) {
            isVisible = true;
        }

        card.classList.toggle('hidden', !isVisible);
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userRole');
            localStorage.removeItem('userEmail');
            window.location.replace('index.html');
        });
    }
}