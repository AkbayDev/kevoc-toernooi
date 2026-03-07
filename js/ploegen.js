import { CONFIG } from './api.js';

async function laadPloegen() {
    const ploegenLijst = document.getElementById('ploegen-lijst');
    if (!ploegenLijst) return;
    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/ploegen`);
        const data = await res.json();

        if (data.length === 0) {
            ploegenLijst.innerHTML = '<li>Er zijn nog geen ploegen ingeschreven.</li>';
            return;
        }

        ploegenLijst.innerHTML = data.map(p => {
            const badgeColor = p.niveau === 'senior' ? '#e74c3c' : '#3498db';
            return `<li><strong>${p.naam}</strong><span style="background-color: ${badgeColor}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; float: right;">${p.niveau}</span></li>`;
        }).join('');
    } catch (err) { console.error("Fout bij laden ploegen:", err); }
}

export function initPloegen() {
    laadPloegen();
    const formPloeg = document.getElementById('form-ploeg');
    const ploegMsg = document.getElementById('ploeg-msg');

    if (formPloeg) {
        formPloeg.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(ploegMsg) { ploegMsg.style.color = "#2980b9"; ploegMsg.textContent = "Bezig met inschrijven..."; }

            const payload = {
                naam: document.getElementById('ploeg-naam').value,
                niveau: document.getElementById('ploeg-niveau').value,
                categorie: document.getElementById('ploeg-categorie').value,
                betaalstatus: document.getElementById('ploeg-betaalstatus').value
            };

            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/ploegen`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);

                if(ploegMsg) { ploegMsg.style.color = "#27ae60"; ploegMsg.textContent = result.message; }
                formPloeg.reset();
                laadPloegen();
            } catch (err) {
                if(ploegMsg) { ploegMsg.style.color = "#e74c3c"; ploegMsg.textContent = err.message; }
            } finally {
                if(ploegMsg) setTimeout(() => ploegMsg.textContent = "", 3000);
            }
        });
    }
}