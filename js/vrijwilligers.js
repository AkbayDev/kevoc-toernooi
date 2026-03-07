import { CONFIG } from './api.js';

async function laadVrijwilligers() {
    const vrijwilligersLijst = document.getElementById('vrijwilligers-lijst');
    if (!vrijwilligersLijst) return;
    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/vrijwilligers`);
        const data = await res.json();

        if (data.length === 0) {
            vrijwilligersLijst.innerHTML = '<tr><td colspan="5">Nog geen inschrijvingen.</td></tr>';
            return;
        }

        vrijwilligersLijst.innerHTML = data.map(v => `
            <tr>
                <td>${v.naam}</td>
                <td>${v.tijdslot}</td>
                <td>${v.job}</td>
                <td><span class="status-badge status-${v.status}">${v.status}</span></td>
                <td>
                    <button class="btn-secondary btn-status" data-id="${v.id}" data-status="geaccepteerd">✓</button>
                    <button class="btn-secondary btn-status" data-id="${v.id}" data-status="afgewezen">✗</button>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error("Fout bij laden vrijwilligers:", err); }
}

export function initVrijwilligers() {
    laadVrijwilligers();
    const formVrijwilligers = document.getElementById('form-vrijwilligers');
    const vrijwilligersMsg = document.getElementById('vrijwilligers-msg');
    const vrijwilligersLijst = document.getElementById('vrijwilligers-lijst');

    if (formVrijwilligers) {
        formVrijwilligers.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                naam: document.getElementById('vrijwilliger-naam').value,
                tijdslot: document.getElementById('vrijwilliger-tijdslot').value,
                job: document.getElementById('vrijwilliger-job').value
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
                laadVrijwilligers();
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
                    if (res.ok) {
                        laadVrijwilligers(); 
                    } else {
                        const result = await res.json();
                        alert('Fout: ' + result.error);
                    }
                } catch (err) { console.error("Fout bij wijzigen status:", err); }
            }
        });
    }
}