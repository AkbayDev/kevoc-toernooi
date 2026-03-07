import { CONFIG } from './api.js';

const TIJDSLOTEN = ['08:00', '10:00', '12:15', '14:30', '16:15', '18:30', '20:50', '22:55'];
const JOBROLLEN = [
    'Coordinator',
    'Opzetten tafel & T-shirts',
    'Klaarzetten Velden',
    'Verwelkoming & Score keeping',
    'Afbreken velden & opruimen zaal'
];

async function laadWerkrooster() {
    const roosterContainer = document.getElementById('werkrooster-grid');
    if (!roosterContainer) return;

    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/werkrooster`);
        const data = await res.json();

        const beschikbareRes = await fetch(`${CONFIG.apiBaseUrl}/werkrooster/beschikbaar`);
        const beschikbare = await beschikbareRes.json();

        renderWerkrooster(data, beschikbare, roosterContainer);
    } catch (err) {
        console.error("Fout bij laden werkrooster:", err);
    }
}

function renderWerkrooster(roosterData, beschikbareVrijwilligers, container) {
    let html = '<table class="data-table" style="width: 100%; border-collapse: collapse;">';
    
    html += '<thead><tr><th>Jobrol</th>';
    TIJDSLOTEN.forEach(tijdslot => {
        html += `<th>${tijdslot}</th>`;
    });
    html += '</tr></thead><tbody>';

    JOBROLLEN.forEach(jobrol => {
        html += `<tr><td style="font-weight: bold; background-color: #f9fafb;">${jobrol}</td>`;
        
        TIJDSLOTEN.forEach(tijdslot => {
            const toewijzing = roosterData.find(r => r.jobrol === jobrol && r.tijdslot === tijdslot);
            const vrijwilligerId = toewijzing ? toewijzing.vrijwilliger_id : null;
            const vrijwilligerNaam = toewijzing ? toewijzing.naam : '';
            const roosterId = toewijzing ? toewijzing.id : null;

            html += `<td style="padding: 10px; border: 1px solid #d1d5db; text-align: center; min-height: 60px; vertical-align: middle;">`;
            
            if (roosterId) {
                html += `<div id="rooster-${roosterId}" style="margin-bottom: 8px;">
                    <span>${vrijwilligerNaam}</span>
                    <br>
                    <button class="btn-secondary btn-verwijder-toewijzing" data-id="${roosterId}" style="padding: 4px 8px; font-size: 12px; margin-top: 4px;">Verwijderen</button>
                </div>`;
            } else {
                html += `<div id="leeg-${jobrol}-${tijdslot}">
                    <select class="rol-select werkrooster-select" data-jobrol="${jobrol}" data-tijdslot="${tijdslot}" style="width: 100%; padding: 6px;">
                        <option value="">-- Selecteer --</option>`;
                
                beschikbareVrijwilligers.forEach(v => {
                    html += `<option value="${v.id}">${v.naam}</option>`;
                });
                
                html += `</select>
                    <br>
                    <button class="btn-primary btn-toewijzen-vrijwilliger" data-jobrol="${jobrol}" data-tijdslot="${tijdslot}" style="padding: 4px 8px; font-size: 12px; margin-top: 4px; width: 100%;">+</button>
                </div>`;
            }
            
            html += '</td>';
        });
        
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

export function initWerkrooster() {
    laadWerkrooster();
    const roosterContainer = document.getElementById('werkrooster-grid');
    const werkroosterMsg = document.getElementById('werkrooster-msg');

    if (roosterContainer) {
        roosterContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-toewijzen-vrijwilliger')) {
                const jobrol = e.target.getAttribute('data-jobrol');
                const tijdslot = e.target.getAttribute('data-tijdslot');
                const select = document.querySelector(`.werkrooster-select[data-jobrol="${jobrol}"][data-tijdslot="${tijdslot}"]`);
                const vrijwilligerId = select.value;

                if (!vrijwilligerId) {
                    if (werkroosterMsg) {
                        werkroosterMsg.style.color = '#e74c3c';
                        werkroosterMsg.textContent = 'Selecteer een vrijwilliger.';
                    }
                    return;
                }

                try {
                    const res = await fetch(`${CONFIG.apiBaseUrl}/werkrooster`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            vrijwilliger_id: parseInt(vrijwilligerId),
                            jobrol: jobrol,
                            tijdslot: tijdslot
                        })
                    });

                    const result = await res.json();
                    if (!res.ok) throw new Error(result.error);

                    if (werkroosterMsg) {
                        werkroosterMsg.style.color = '#27ae60';
                        werkroosterMsg.textContent = result.message;
                    }
                    setTimeout(() => { if (werkroosterMsg) werkroosterMsg.textContent = ''; }, 3000);
                    laadWerkrooster();
                } catch (err) {
                    if (werkroosterMsg) {
                        werkroosterMsg.style.color = '#e74c3c';
                        werkroosterMsg.textContent = err.message;
                    }
                }
            }

            if (e.target.classList.contains('btn-verwijder-toewijzing')) {
                const roosterId = e.target.getAttribute('data-id');

                try {
                    const res = await fetch(`${CONFIG.apiBaseUrl}/werkrooster/${roosterId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    const result = await res.json();
                    if (!res.ok) throw new Error(result.error);

                    if (werkroosterMsg) {
                        werkroosterMsg.style.color = '#27ae60';
                        werkroosterMsg.textContent = result.message;
                    }
                    setTimeout(() => { if (werkroosterMsg) werkroosterMsg.textContent = ''; }, 3000);
                    laadWerkrooster();
                } catch (err) {
                    if (werkroosterMsg) {
                        werkroosterMsg.style.color = '#e74c3c';
                        werkroosterMsg.textContent = err.message;
                    }
                }
            }
        });
    }
}
