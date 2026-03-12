export const currentRole = localStorage.getItem('userRole');

export function checkAuth() {
    if (!currentRole) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

export function initAuthUI() {
    const roleTranslations = {
        'beheerder': 'Beheerder',
        'hulp': 'Vrijwilliger',
        'gebruiker': 'Gebruiker'
    };

    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.textContent = `Welkom, ${roleTranslations[currentRole] || 'Gast'}`;
    }

    const cards = document.querySelectorAll('.dash-card');
    cards.forEach(card => {
        const requiredRole = card.getAttribute('data-role');
        if (requiredRole === 'all' || requiredRole === currentRole || (requiredRole === 'beheerder' && currentRole === 'dev') || (requiredRole === 'hulp' && currentRole === 'beheerder')) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });

    // Verberg actie knoppen voor hulp rol
    if (currentRole === 'hulp') {
        const statusButtons = document.querySelectorAll('.btn-status');
        statusButtons.forEach(btn => {
            btn.style.display = 'none';
        });

        const genereerBtn = document.getElementById('btn-genereer');
        if (genereerBtn) {
            genereerBtn.style.display = 'none';
        }
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userRole');
            window.location.href = 'index.html';
        });
    }
}