import { CONFIG, escapeHtml, showToast } from './api.js';
import { herlaadWerkrooster } from './werkrooster.js';
import { laadRooster } from './rooster.js';
import { currentRole } from './auth.js';

// Laad beschikbare tijdsblokken voor scheidsrechters
async function laadBeschikbareTijdsblokken() {
    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/scheids/beschikbare-blokken`);
        const blokken = await res.json();
        const dropdown = document.getElementById('vrijwilliger-tijdsblok-scheids');
        
        if (dropdown) {
            dropdown.innerHTML = '<option value="" disabled selected>Kies een tijdsblok...</option>';
            if (blokken.length === 0) {
                dropdown.innerHTML += '<option disabled>Geen tijdsblokken beschikbaar</option>';
            } else {
                blokken.forEach(b => {
                    const option = document.createElement('option');
                    option.value = b.tijdsblok;
                    option.textContent = b.tijdsblok;
                    dropdown.appendChild(option);
                });
            }
        }
    } catch (err) {
        console.error("Fout bij laden tijdsblokken:", err);
    }
}

async function laadVrijwilligers() {
    const vrijwilligersLijst = document.getElementById('vrijwilligers-lijst');
    if (!vrijwilligersLijst) return;
    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/vrijwilligers`);
        const data = await res.json();

        if (data.length === 0) {
            vrijwilligersLijst.innerHTML = '<tr><td colspan="6" class="text-muted">Nog geen inschrijvingen.</td></tr>';
            return;
        }

        const isBeheerder = currentRole === 'beheerder' || currentRole === 'dev';

        vrijwilligersLijst.innerHTML = data.map(v => {
            let actionCellHtml = '';
            if (isBeheerder) {
                actionCellHtml = `
                    <button class="btn-secondary btn-sm btn-status" data-id="${v.id}" data-status="geaccepteerd">✓</button>
                    <button class="btn-secondary btn-sm btn-status" data-id="${v.id}" data-status="afgewezen">✗</button>
                `;
            }
            return `
            <tr>
                <td>${escapeHtml(v.naam)}</td>
                <td>${escapeHtml(v.tijdslot)}</td>
                <td>${escapeHtml(v.job)}</td>
                <td>${escapeHtml(v.wedstrijd_info || '-')}</td>
                <td><span class="status-badge status-${v.status}">${escapeHtml(v.status)}</span></td>
                <td>${actionCellHtml}</td>
            </tr>
        `;
        }).join('');
    } catch (err) { console.error("Fout bij laden vrijwilligers:", err); }
}

export function initVrijwilligers() {
    laadVrijwilligers();
    laadBeschikbareTijdsblokken();
    
    const formVrijwilligers    = document.getElementById('form-vrijwilligers');
    const vrijwilligersMsg     = document.getElementById('vrijwilligers-msg');
    const vrijwilligersLijst   = document.getElementById('vrijwilligers-lijst');
    const jobrolDropdown       = document.getElementById('vrijwilliger-job');
    const tijdsblokDropdown    = document.getElementById('vrijwilliger-tijdsblok-scheids');

    // Toon/verberg tijdsblok dropdown op basis van jobrol
    if (jobrolDropdown) {
        jobrolDropdown.addEventListener('change', (e) => {
            if (e.target.value === 'Scheidsrechter') {
                if (tijdsblokDropdown) {
                    tijdsblokDropdown.style.display = 'block';
                    tijdsblokDropdown.required = true;
                    laadBeschikbareTijdsblokken();
                }
            } else {
                if (tijdsblokDropdown) {
                    tijdsblokDropdown.style.display = 'none';
                    tijdsblokDropdown.required = false;
                    tijdsblokDropdown.value = '';
                }
            }
        });
    }

    if (formVrijwilligers) {
        formVrijwilligers.addEventListener('submit', async (e) => {
            e.preventDefault();
            const job = document.getElementById('vrijwilliger-job').value;

            const payload = {
                naam:     document.getElementById('vrijwilliger-naam').value,
                tijdslot: document.getElementById('vrijwilliger-tijdslot').value,
                job:      job,
                email:    localStorage.getItem('userEmail')
            };

            // Voor scheidsrechter: stuur tijdsblok mee
            if (job === 'Scheidsrechter') {
                payload.tijdsblok = tijdsblokDropdown ? tijdsblokDropdown.value : null;
            }

            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/vrijwilligers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);
                
                showToast(result.message, 'success');
                formVrijwilligers.reset();

                if (tijdsblokDropdown) {
                    tijdsblokDropdown.style.display = 'none';
                    tijdsblokDropdown.required = false;
                }

                await laadVrijwilligers();
                await laadBeschikbareTijdsblokken();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // Event delegation voor accepteer/afwijs knoppen
    if (vrijwilligersLijst) {
        vrijwilligersLijst.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-status')) {
                const id     = e.target.getAttribute('data-id');
                const status = e.target.getAttribute('data-status');
                
                try {
                    const res = await fetch(`${CONFIG.apiBaseUrl}/vrijwilligers/${id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status })
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.error);
                    
                    showToast(result.message, 'success');
                    laadVrijwilligers();
                    await herlaadWerkrooster();
                    await laadRooster();
                    await laadBeschikbareTijdsblokken();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            }
        });
    }
}