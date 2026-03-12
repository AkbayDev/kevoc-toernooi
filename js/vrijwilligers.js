import { CONFIG } from './api.js';
import { herlaadWerkrooster } from './werkrooster.js';
import { laadRooster } from './rooster.js';
import { currentRole } from './auth.js';

// Laad beschikbare wedstrijden voor scheidsrechters
async function laadBeschikbareWedstrijden() {
    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/wedstrijden/beschikbaar`);
        const wedstrijden = await res.json();
        const dropdown = document.getElementById('vrijwilliger-wedstrijd');
        
        if (dropdown) {
            dropdown.innerHTML = '<option value="" disabled selected>Kies een wedstrijd...</option>';
            wedstrijden.forEach(w => {
                const option = document.createElement('option');
                option.value = w.id;
                option.textContent = w.display;
                dropdown.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Fout bij laden wedstrijden:", err);
    }
}

async function laadVrijwilligers() {
    const vrijwilligersLijst = document.getElementById('vrijwilligers-lijst');
    if (!vrijwilligersLijst) return;
    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/vrijwilligers`);
        const data = await res.json();

        if (data.length === 0) {
            vrijwilligersLijst.innerHTML = '<tr><td colspan="6">Nog geen inschrijvingen.</td></tr>';
            return;
        }

        vrijwilligersLijst.innerHTML = data.map(v => {
            let actionCellHtml = '';
            if (currentRole === 'beheerder') {
                actionCellHtml = `
                    <button class="btn-secondary btn-status" data-id="${v.id}" data-status="geaccepteerd">✓</button>
                    <button class="btn-secondary btn-status" data-id="${v.id}" data-status="afgewezen">✗</button>
                `;
            }
            return `
            <tr>
                <td>${v.naam}</td>
                <td>${v.tijdslot}</td>
                <td>${v.job}</td>
                <td>${v.wedstrijd_info || '-'}</td>
                <td><span class="status-badge status-${v.status}">${v.status}</span></td>
                <td>
                    ${actionCellHtml}
                </td>
            </tr>
        `;
        }).join('');
    } catch (err) { console.error("Fout bij laden vrijwilligers:", err); }
}

export function initVrijwilligers() {
    laadVrijwilligers();
    laadBeschikbareWedstrijden();
    
    const formVrijwilligers = document.getElementById('form-vrijwilligers');
    const vrijwilligersMsg = document.getElementById('vrijwilligers-msg');
    const vrijwilligersLijst = document.getElementById('vrijwilligers-lijst');
    const jobrolDropdown = document.getElementById('vrijwilliger-job');
    const wedstrijdDropdown = document.getElementById('vrijwilliger-wedstrijd');

    // Event listener op jobrol dropdown
    if (jobrolDropdown) {
        jobrolDropdown.addEventListener('change', (e) => {
            if (e.target.value === 'Scheidsrechter') {
                if (wedstrijdDropdown) {
                    wedstrijdDropdown.style.display = 'block';
                    wedstrijdDropdown.required = true;
                }
            } else {
                if (wedstrijdDropdown) {
                    wedstrijdDropdown.style.display = 'none';
                    wedstrijdDropdown.required = false;
                    wedstrijdDropdown.value = '';
                }
            }
        });
    }

    if (formVrijwilligers) {
        formVrijwilligers.addEventListener('submit', async (e) => {
            e.preventDefault();
            const job = document.getElementById('vrijwilliger-job').value;
            const wedstrijd_id = job === 'Scheidsrechter' 
                ? document.getElementById('vrijwilliger-wedstrijd').value 
                : null;

            const payload = {
                naam: document.getElementById('vrijwilliger-naam').value,
                tijdslot: document.getElementById('vrijwilliger-tijdslot').value,
                job: job,
                wedstrijd_id: wedstrijd_id ? parseInt(wedstrijd_id) : null,
                email: localStorage.getItem('userEmail')
            };

            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/vrijwilligers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);
                
                if (vrijwilligersMsg) vrijwilligersMsg.textContent = result.message;
                formVrijwilligers.reset();
                if (wedstrijdDropdown) {
                    wedstrijdDropdown.style.display = 'none';
                    wedstrijdDropdown.required = false;
                }
                await laadVrijwilligers();
                await laadBeschikbareWedstrijden();
            } catch (err) {
                if (vrijwilligersMsg) vrijwilligersMsg.textContent = err.message;
            }
        });
    }

    // Luister naar kliks op de status knoppen (Event Delegation)
    if (vrijwilligersLijst) {
        vrijwilligersLijst.addEventListener('click', async (e) => {
            // Check of er op een knop is geklikt
            if (e.target.classList.contains('btn-status')) {
                const id = e.target.getAttribute('data-id');
                const status = e.target.getAttribute('data-status');
                
                try {
                    const res = await fetch(`${CONFIG.apiBaseUrl}/vrijwilligers/${id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status })
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.error);
                    
                    if (vrijwilligersMsg) {
                        vrijwilligersMsg.style.color = '#27ae60';
                        vrijwilligersMsg.textContent = result.message;
                    }
                    setTimeout(() => { if (vrijwilligersMsg) vrijwilligersMsg.textContent = ''; }, 3000);
                    laadVrijwilligers();
                    await herlaadWerkrooster();
                    await laadRooster();
                    await laadBeschikbareWedstrijden();
                } catch (err) {
                    if (vrijwilligersMsg) {
                        vrijwilligersMsg.style.color = '#e74c3c';
                        vrijwilligersMsg.textContent = err.message;
                    }
                }
            }
        });
    }
}