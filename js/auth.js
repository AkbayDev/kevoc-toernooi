export const currentRole = localStorage.getItem('userRole');

export function checkAuth() {
    if (!currentRole) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Controleer bij laden of de rol in de database overeenkomt met localStorage.
// Als een beheerder de rol gewijzigd heeft (bijv. gebruiker -> hulp),
// wordt localStorage bijgewerkt en de pagina herladen.
async function syncRolMetDatabase() {
    const email = localStorage.getItem('userEmail');
    if (!email) return;

    try {
        const res = await fetch(`http://127.0.0.1:5000/api/mijn-rol?email=${encodeURIComponent(email)}`);
        if (!res.ok) return;

        const data = await res.json();
        const huidigeRolInDB = data.role;
        const huidigeRolInStorage = localStorage.getItem('userRole');

        if (huidigeRolInDB && huidigeRolInDB !== huidigeRolInStorage) {
            // Rol is veranderd in de database, update localStorage en herlaad
            localStorage.setItem('userRole', huidigeRolInDB);
            window.location.reload();
        }
    } catch (err) {
        // Stille fout: als de sync mislukt, gewoon doorgaan
        console.warn('Rol sync mislukt:', err);
    }
}

export function initAuthUI() {
    // Sync rol met database bij elke paginabezoek
    syncRolMetDatabase();

    const roleTranslations = {
        'beheerder': 'Beheerder',
        'hulp': 'Vrijwilliger',
        'gebruiker': 'Gebruiker',
        'dev': 'Developer'
    };

    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.textContent = `Welkom, ${roleTranslations[currentRole] || 'Gast'}`;
    }

    const cards = document.querySelectorAll('.dash-card');
    cards.forEach(card => {
        const requiredRole = card.getAttribute('data-role');
        let isVisible = false;

        if (requiredRole === 'all') {
            isVisible = true;
        } else if (requiredRole === currentRole) {
            isVisible = true;
        } else if (requiredRole === 'beheerder' && currentRole === 'dev') {
            // Dev mag alles zien wat voor beheerder is
            isVisible = true;
        } else if (requiredRole === 'hulp' && (currentRole === 'beheerder' || currentRole === 'dev')) {
            // Beheerder en dev mogen alles zien wat voor hulp is
            isVisible = true;
        }

        if (isVisible) {
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
            localStorage.removeItem('userEmail');
            window.location.replace('index.html');
        });
    }
}