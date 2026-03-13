import { CONFIG } from './api.js';
import { currentRole } from './auth.js';

export function initActies() {
    // Veiligheidscheck: alleen beheerders mogen dit script uitvoeren
    if (currentRole !== 'beheerder') return;

    const container = document.getElementById('acties-lijst');
    const form = document.getElementById('form-actie');

    if (!container || !form) return;

    // 1. Acties inladen
    async function laadActies() {
        try {
            const res = await fetch(`${CONFIG.apiBaseUrl}/acties`);
            const acties = await res.json();
            renderActies(acties);
        } catch (err) {
            console.error("Fout bij laden acties:", err);
            container.innerHTML = '<li style="color:red">Kon acties niet laden.</li>';
        }
    }

    // 2. Renderen
    function renderActies(acties) {
        container.innerHTML = '';
        if (acties.length === 0) {
            container.innerHTML = '<li class="text-muted">Geen openstaande acties.</li>';
            return;
        }

        acties.forEach(actie => {
            const li = document.createElement('li');
            li.className = 'actie-item';
            
            // Status styling
            let statusLabel = '';
            if (actie.status === 'bezig') {
                li.classList.add('actie-bezig');
                statusLabel = '<span class="status-badge status-afwachting" style="margin-right: 10px; font-size: 11px;">BEZIG</span>';
            }

            li.innerHTML = `
                <div style="display:flex; align-items:center;">${statusLabel} <span>${actie.omschrijving}</span></div>
                <span style="font-size: 11px; color: #9ca3af;">klik om te wijzigen</span>
            `;

            // Klik event voor status cycle: Open -> Bezig -> Verwijder
            li.addEventListener('click', () => cycleStatus(actie));
            
            container.appendChild(li);
        });
    }

    // 3. Nieuwe toevoegen
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('nieuwe-actie-tekst');
        const tekst = input.value;

        try {
            await fetch(`${CONFIG.apiBaseUrl}/acties`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ omschrijving: tekst })
            });
            input.value = '';
            laadActies();
        } catch (err) {
            alert("Kon actie niet toevoegen.");
        }
    });

    // 4. Status update logic
    async function cycleStatus(actie) {
        let nextStatus = 'bezig';
        // Als hij al bezig is, is de volgende stap verwijderen (klaar)
        if (actie.status === 'bezig') nextStatus = 'verwijder'; 
        
        await fetch(`${CONFIG.apiBaseUrl}/acties/${actie.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
        });
        laadActies();
    }

    // Start direct met laden
    laadActies();
}