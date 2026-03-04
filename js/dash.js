document.addEventListener('DOMContentLoaded', () => {
    const CONFIG = { apiBaseUrl: 'http://127.0.0.1:5000/api' };

    const cards = document.querySelectorAll('.dash-card');
    const userDisplay = document.getElementById('user-display');
    const logoutBtn = document.getElementById('logout-btn');
    const boxInkomsten = document.getElementById('box-inkomsten');
    const boxKosten = document.getElementById('box-kosten');
    const formFinance = document.getElementById('form-finance');
    const financeMsg = document.getElementById('finance-msg');

    // Haal de rol op die we bij het inloggen hebben opgeslagen
    let currentRole = localStorage.getItem('userRole'); 
    
    // Als er geen rol is (iemand is niet ingelogd), stuur terug naar login!
    if (!currentRole) {
        window.location.href = 'index.html';
        return;
    }

    // Pas interface aan op basis van rol
  // 1. Maak een vertaalsetje voor de weergave van de namen
const roleTranslations = {
    'beheerder': 'Beheerder',
    'hulp': 'Hulpverlener',
    'gebruiker': 'Gebruiker'
};

// 2. Pas de welkomsttekst aan (gebruik de vertaling of 'Gast' als de rol onbekend is)
const displayName = roleTranslations[currentRole] || 'Gast';
userDisplay.textContent = `Welkom, ${displayName}`;

// 3. Filter de kaarten
cards.forEach(card => {
    const requiredRole = card.getAttribute('data-role');
    
    // De kaart is zichtbaar als:
    // - De rol 'all' is
    // - OF de rol exact overeenkomt met de huidige gebruiker
    if (requiredRole === 'all' || requiredRole === currentRole) {
        card.classList.remove('hidden');
    } else {
        card.classList.add('hidden');
    }
});

    // Uitloggen
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('userRole'); 
        window.location.href = 'index.html'; 
    });

    // Financiën Ophalen
   // --- GRAFIEK & FINANCIËN LOGICA ---
    let financeChart; // We slaan de grafiek hierin op zodat we hem kunnen updaten

    async function laadFinancien() {
        if (currentRole !== 'beheerder') return; 
        try {
            const res = await fetch(`${CONFIG.apiBaseUrl}/financien`);
            const data = await res.json();
            
            // 1. Werk de tekst in het midden bij
            const centerText = document.getElementById('chart-center-text');
            centerText.textContent = `€ ${data.winst.toFixed(2)}`;
            // Maak rood bij verlies, groen bij winst
            centerText.style.color = data.winst >= 0 ? '#27ae60' : '#e74c3c';

            // 2. Teken of update de grafiek
            const ctx = document.getElementById('financeChart').getContext('2d');
            
            if (financeChart) {
                // Als de grafiek al bestaat, pas alleen de data aan
                financeChart.data.datasets[0].data = [data.inkomsten, data.kosten];
                financeChart.update();
            } else {
                // Maak de grafiek voor de eerste keer aan
                financeChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Inkomsten', 'Kosten'],
                        datasets: [{
                            data: [data.inkomsten, data.kosten],
                            backgroundColor: ['#27ae60', '#e74c3c'], // Groen en Rood
                            borderWidth: 0
                        }]
                    },
                    options: {
                        cutout: '75%', // Maakt het gat in het midden groot
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }, // Verberg standaard legenda
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return ` € ${context.raw.toFixed(2)}`;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        } catch (err) { console.error("Fout:", err); }
    }

    // Financiën Toevoegen (Blijft hetzelfde, maar herlaadt nu de grafiek)

    if (formFinance) {
        formFinance.addEventListener('submit', async (e) => {
            e.preventDefault();
            const omschrijving = document.getElementById('fin-omschrijving').value;
            const bedrag = document.getElementById('fin-bedrag').value;
            const type = document.getElementById('fin-type').value;

            financeMsg.style.color = "#2980b9";
            financeMsg.textContent = "Bezig met opslaan...";

            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/financien`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ omschrijving, bedrag, type })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);

                financeMsg.style.color = "#27ae60";
                financeMsg.textContent = result.message;
                formFinance.reset();
                
                laadFinancien(); // Herlaad de grafiek!
                if (!document.getElementById('transacties-lijst').classList.contains('hidden')) {
                    laadTransacties(); // Herlaad de lijst als deze open staat
                }
                
                setTimeout(() => financeMsg.textContent = "", 3000);
            } catch (err) {
                financeMsg.style.color = "#e74c3c";
                financeMsg.textContent = err.message;
            }
        });
    }

    // --- LIJST MET TRANSACTIES LOGICA ---
    const btnToggleTransacties = document.getElementById('btn-toggle-transacties');
    const transactiesLijst = document.getElementById('transacties-lijst');
    const transactiesUl = document.getElementById('transacties-ul');

    async function laadTransacties() {
        try {
            const res = await fetch(`${CONFIG.apiBaseUrl}/transacties`);
            const data = await res.json();
            
            transactiesUl.innerHTML = ''; // Maak lijst eerst leeg
            if (data.length === 0) {
                transactiesUl.innerHTML = '<li>Nog geen transacties.</li>';
                return;
            }

            data.forEach(t => {
                const li = document.createElement('li');
                li.className = 'transactie-item';
                const isKosten = t.type === 'kost';
                const teken = isKosten ? '-' : '+';
                const kleur = isKosten ? 'text-red' : 'text-green';
                
                li.innerHTML = `
                    <span>${t.omschrijving}</span> 
                    <span class="${kleur}">${teken} €${t.bedrag.toFixed(2)}</span>
                `;
                transactiesUl.appendChild(li);
            });
        } catch (err) { console.error("Fout bij laden lijst:", err); }
    }

    btnToggleTransacties.addEventListener('click', () => {
        if (transactiesLijst.classList.contains('hidden')) {
            transactiesLijst.classList.remove('hidden');
            btnToggleTransacties.textContent = "Verberg Transacties";
            laadTransacties(); // Haal data op
        } else {
            transactiesLijst.classList.add('hidden');
            btnToggleTransacties.textContent = "Bekijk Alle Transacties";
        }
    });


    // ==========================================
    // PLOEG INSCHRIJVEN LOGICA
    // ==========================================
    const formPloeg = document.getElementById('form-ploeg');
    const ploegMsg = document.getElementById('ploeg-msg');
    const ploegenLijst = document.getElementById('ploegen-lijst');

    // Functie: Haal de ploegen op en toon ze
    async function laadPloegen() {
        try {
            const res = await fetch(`${CONFIG.apiBaseUrl}/ploegen`);
            const data = await res.json();
            
            ploegenLijst.innerHTML = ''; // Maak de lijst eerst leeg
            
            if (data.length === 0) {
                ploegenLijst.innerHTML = '<li>Er zijn nog geen ploegen ingeschreven.</li>';
                return;
            }

            // Teken elke ploeg op het scherm
            data.forEach(p => {
                const li = document.createElement('li');
                
                // Een leuk detail: blauw label voor recreatief, rood voor competitie
                const badgeColor = p.niveau === 'senior' ? '#e74c3c' : '#3498db';
                
                li.innerHTML = `
                    <strong>${p.naam}</strong> 
                    <span style="background-color: ${badgeColor}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; float: right;">
                        ${p.niveau}
                    </span>
                `;
                ploegenLijst.appendChild(li);
            });
        } catch (err) { console.error("Fout bij laden ploegen:", err); }
    }

    // ==========================================
    //  Functie: Stuur het formulier door naar Python
    // ==========================================
    if (formPloeg) {
        formPloeg.addEventListener('submit', async (e) => {
            e.preventDefault();
            const naam = document.getElementById('ploeg-naam').value;
            const niveau = document.getElementById('ploeg-niveau').value;
            const categorie = document.getElementById('ploeg-categorie').value;

            ploegMsg.style.color = "#2980b9";
            ploegMsg.textContent = "Bezig met inschrijven...";

            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/ploegen`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        naam: naam, 
                        niveau: niveau, 
                        categorie: categorie 
                    })
                });
                const result = await res.json();
                
                if (!res.ok) throw new Error(result.error);

                ploegMsg.style.color = "#27ae60";
                ploegMsg.textContent = result.message;
                formPloeg.reset(); // Maak invulvelden leeg
                
                laadPloegen(); // Herlaad direct de HTML lijst!
                
                setTimeout(() => ploegMsg.textContent = "", 3000);
            } catch (err) {
                ploegMsg.style.color = "#e74c3c";
                ploegMsg.textContent = err.message;
            }
        });
    }


    // ==========================================
    // VRIJWILLIGERS INSCHRIJVEN LOGICA
    // ==========================================

        if (formVrijwilligers) {
        formVrijwilligers.addEventListener('submit', async (e) => {
            e.preventDefault();
            const naam = document.getElementById('vrijwilliger-naam').value;
            const tijdslot = document.getElementById('vrijwilliger-tijdslot').value;
            const job = document.getElementById('vrijwilliger-job').value;

            ploegMsg.style.color = "#2980b9";
            ploegMsg.textContent = "Bezig met inschrijven...";

            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/ploegen`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        naam: naam, 
                        niveau: niveau, 
                        categorie: categorie 
                    })
                });
                const result = await res.json();
                
                if (!res.ok) throw new Error(result.error);

                ploegMsg.style.color = "#27ae60";
                ploegMsg.textContent = result.message;
                formPloeg.reset(); // Maak invulvelden leeg
                
                laadPloegen(); // Herlaad direct de HTML lijst!
                
                setTimeout(() => ploegMsg.textContent = "", 3000);
            } catch (err) {
                ploegMsg.style.color = "#e74c3c";
                ploegMsg.textContent = err.message;
            }
        });
    }

    // Start de applicatie
    laadFinancien();
    laadPloegen();
});
