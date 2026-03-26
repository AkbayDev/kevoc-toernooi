import { CONFIG } from './api.js';
import { laadActieveReeksen } from './reeksen.js';

async function laadPloegen() {
    const ploegenLijst = document.getElementById('ploegen-lijst');
    if (!ploegenLijst) return;
    try {
        const res  = await fetch(`${CONFIG.apiBaseUrl}/ploegen`);
        const data = await res.json();

        if (data.length === 0) {
            ploegenLijst.innerHTML = '<li>Er zijn nog geen ploegen ingeschreven.</li>';
            return;
        }

        ploegenLijst.innerHTML = data.map(p => {
            const reeksLabel = p.reeks || `${p.niveau} - ${p.categorie}`;
            const badgeColor = (p.niveau === 'Senior' || p.niveau === 'senior') ? '#e74c3c' : '#3498db';
            const betaalKleur = p.betaalstatus === 'betaald' ? '#059669' : '#dc2626';
            return `<li style="display: flex; justify-content: space-between; align-items: center;">
                <strong>${p.naam}</strong>
                <span style="display: flex; gap: 6px;">
                    <span style="background-color: ${badgeColor}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px;">${reeksLabel}</span>
                    <span style="background-color: ${betaalKleur}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px;">${p.betaalstatus}</span>
                </span>
            </li>`;
        }).join('');
    } catch (err) { console.error("Fout bij laden ploegen:", err); }
}

export function initPloegen() {
    laadPloegen();
    laadActieveReeksen();

    const formPloeg = document.getElementById('form-ploeg');
    const ploegMsg  = document.getElementById('ploeg-msg');

    if (formPloeg) {
        formPloeg.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (ploegMsg) { ploegMsg.style.color = "#2980b9"; ploegMsg.textContent = "Bezig met inschrijven..."; }

            const payload = {
                naam:         document.getElementById('ploeg-naam').value,
                reeks:        document.getElementById('ploeg-reeks').value,
                betaalstatus: document.getElementById('ploeg-betaalstatus').value,
            };

            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/ploegen`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);

                if (ploegMsg) { ploegMsg.style.color = "#27ae60"; ploegMsg.textContent = result.message; }
                formPloeg.reset();
                laadPloegen();
                await laadActieveReeksen();
            } catch (err) {
                if (ploegMsg) { ploegMsg.style.color = "#e74c3c"; ploegMsg.textContent = err.message; }
            }
        });
    }
}