import { CONFIG, escapeHtml } from './api.js';
import { laadActieveReeksen } from './reeksen.js';

async function laadPloegen() {
    const ploegenLijst = document.getElementById('ploegen-lijst');
    if (!ploegenLijst) return;
    try {
        const res  = await fetch(`${CONFIG.apiBaseUrl}/ploegen`);
        const data = await res.json();

        if (data.length === 0) {
            ploegenLijst.innerHTML = '<li class="text-muted">Er zijn nog geen ploegen ingeschreven.</li>';
            return;
        }

        ploegenLijst.innerHTML = data.map(p => {
            const reeksLabel = p.reeks || `${p.niveau} - ${p.categorie}`;
            const isSenior = String(p.niveau).toLowerCase() === 'senior';
            const badgeColor = isSenior ? 'var(--color-error)' : 'var(--color-brand)';
            const betaalKleur = p.betaalstatus === 'betaald' ? 'var(--color-success)' : 'var(--color-error)';
            return `<li class="ploeg-item">
                <strong>${escapeHtml(p.naam)}</strong>
                <span class="ploeg-badges">
                    <span class="badge" style="background-color:${badgeColor};">${escapeHtml(reeksLabel)}</span>
                    <span class="badge" style="background-color:${betaalKleur};">${escapeHtml(p.betaalstatus)}</span>
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
            if (ploegMsg) { ploegMsg.style.color = 'var(--color-info)'; ploegMsg.textContent = "Bezig met inschrijven..."; }

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

                if (ploegMsg) { ploegMsg.style.color = 'var(--color-success)'; ploegMsg.textContent = result.message; }
                formPloeg.reset();
                laadPloegen();
                await laadActieveReeksen();
            } catch (err) {
                if (ploegMsg) { ploegMsg.style.color = 'var(--color-error)'; ploegMsg.textContent = err.message; }
            }
        });
    }
}