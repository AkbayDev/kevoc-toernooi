// Haal de rol op en zorg dat deze veilig en altijd in kleine letters is
const rawRole = localStorage.getItem('userRole');
export const currentRole = (rawRole && rawRole !== 'undefined' && rawRole !== 'null') 
    ? rawRole.trim().toLowerCase() 
    : null;

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
        const res = await fetch(`/api/mijn-rol?email=${encodeURIComponent(email)}`);
        if (!res.ok) return;

        const data = await res.json();
        const huidigeRolInDB = data.role ? data.role.toLowerCase() : 'gebruiker';
        const huidigeRolInStorage = currentRole; // Gebruik de al opgeschoonde variant

        if (huidigeRolInDB && huidigeRolInDB !== huidigeRolInStorage) {
            localStorage.setItem('userRole', huidigeRolInDB);
            window.location.reload();
        }
    } catch (err) {
        console.warn('Rol sync mislukt:', err);
    }
}

export function initAuthUI() {
    syncRolMetDatabase();

    const roleTranslations = {
        'beheerder': 'Beheerder',
        'hulp':      'Vrijwilliger',
        'scheids':   'Scheidsrechter',
        'gebruiker': 'Gebruiker',
        'dev':       'Developer'
    };

    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.textContent = `Welkom, ${roleTranslations[currentRole] || 'Gast'}`;
    }

    // Rollen die beheerder-niveau toegang hebben
    const BEHEERDER_ROLLEN = ['beheerder', 'dev'];
    // Rollen die hulp-niveau toegang hebben (+ omhoog)
    const HULP_ROLLEN = ['hulp', 'scheids', 'beheerder', 'dev'];

    const cards = document.querySelectorAll('.dash-card');
    cards.forEach(card => {
        const requiredRole = card.getAttribute('data-role');
        if (!requiredRole) return;

        // Splits komma-gescheiden rollen (bijv. "scheids,beheerder")
        const vereistRollen = requiredRole.split(',').map(r => r.trim());

        let isVisible = false;

        if (vereistRollen.includes('all')) {
            isVisible = true;
        } else if (vereistRollen.includes(currentRole)) {
            // Directe rol match
            isVisible = true;
        } else if (vereistRollen.includes('beheerder') && BEHEERDER_ROLLEN.includes(currentRole)) {
            // Dev mag alles zien wat voor beheerder is
            isVisible = true;
        } else if (vereistRollen.includes('hulp') && HULP_ROLLEN.includes(currentRole)) {
            // Beheerder, dev en scheids mogen alles zien wat voor hulp is
            isVisible = true;
        }

        card.classList.toggle('hidden', !isVisible);
    });

    // Verberg actie knoppen voor hulp en scheids rol
    if (currentRole === 'hulp' || currentRole === 'scheids') {
        document.querySelectorAll('.btn-status').forEach(btn => {
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