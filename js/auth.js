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
        'hulp': 'Hulpverlener',
        'gebruiker': 'Gebruiker'
    };

    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.textContent = `Welkom, ${roleTranslations[currentRole] || 'Gast'}`;
    }

    const cards = document.querySelectorAll('.dash-card');
    cards.forEach(card => {
        const requiredRole = card.getAttribute('data-role');
        if (requiredRole === 'all' || requiredRole === currentRole) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userRole');
            window.location.href = 'index.html';
        });
    }
}