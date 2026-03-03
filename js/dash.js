document.addEventListener('DOMContentLoaded', () => {

    // 1. Elementen selecteren
    const cards = document.querySelectorAll('.dash-card');
    const roleTester = document.getElementById('role-tester');
    const userDisplay = document.getElementById('user-display');
    const logoutBtn = document.getElementById('logout-btn');

    // 2. Bepaal de rol (In het echt haal je dit uit localStorage of je database)
    // Voorbeeld: let currentRole = localStorage.getItem('userRole') || 'gebruiker';
    let currentRole = 'gebruiker'; // Standaardwaarde bij het inladen

    // 3. De Hoofdfunctie: Update de zichtbaarheid van de containers
    function updateDashboardUI(role) {
        userDisplay.textContent = `Welkom, ${role === 'beheerder' ? 'Beheerder' : 'Gebruiker'}`;

        cards.forEach(card => {
            const requiredRole = card.getAttribute('data-role');

            if (requiredRole === 'all') {
                // Altijd zichtbaar
                card.classList.remove('hidden');
            } else if (requiredRole === role) {
                // Zichtbaar als de rol overeenkomt (bijv. 'beheerder')
                card.classList.remove('hidden');
            } else {
                // Verbergen voor mensen zonder rechten
                card.classList.add('hidden');
            }
        });
    }

    // 4. Test functionaliteit (Verander de dropdown bovenaan om het effect te zien)
    if (roleTester) {
        roleTester.addEventListener('change', (e) => {
            currentRole = e.target.value;
            updateDashboardUI(currentRole);
        });
    }

    // 5. Uitloggen functionaliteit
    logoutBtn.addEventListener('click', () => {
        // Wis de data (later wanneer we localStorage gebruiken)
        // localStorage.removeItem('userRole'); 
        // localStorage.removeItem('userEmail');
        
        // Verwijs terug naar de inlogpagina
        window.location.href = 'index.html'; 
    });

    // Run de functie direct bij het laden van de pagina
    updateDashboardUI(currentRole);
});