import { CONFIG, escapeHtml, showToast } from './api.js';

const TIJDSLOTEN = ['08:00', '10:00', '12:15', '14:30', '16:15', '18:30', '20:50', '22:55'];
const JOBROLLEN = [
    'Coordinator',
    'Opzetten tafel & T-shirts',
    'Klaarzetten Velden',
    'Afbreken velden & opruimen zaal'
];

async function laadWerkrooster() {
    const roosterContainer = document.getElementById('werkrooster-grid');
    if (!roosterContainer) return;

    try {
        const [res, beschikbareRes] = await Promise.all([
            fetch(`${CONFIG.apiBaseUrl}/werkrooster`),
            fetch(`${CONFIG.apiBaseUrl}/werkrooster/beschikbaar`)
        ]);
        const data = await res.json();
        const beschikbare = await beschikbareRes.json();

        renderWerkrooster(data, beschikbare, roosterContainer);
    } catch (err) {
        console.error("Fout bij laden werkrooster:", err);
    }
}

export async function herlaadWerkrooster() {
    await laadWerkrooster();
}

function renderWerkrooster(roosterData, beschikbareVrijwilligers, container) {
    let html = '<table class="data-table" style="width:100%;border-collapse:collapse;">';
    
    html += '<thead><tr><th>Jobrol</th>';
    TIJDSLOTEN.forEach(tijdslot => {
        html += `<th>${tijdslot}</th>`;
    });
    html += '</tr></thead><tbody>';

    JOBROLLEN.forEach(jobrol => {
        html += `<tr><td class="werkrooster-jobrol">${escapeHtml(jobrol)}</td>`;
        
        TIJDSLOTEN.forEach(tijdslot => {
            const toewijzing = roosterData.find(r => r.jobrol === jobrol && r.tijdslot === tijdslot);
            const vrijwilligerNaam = toewijzing ? toewijzing.naam : '';
            const roosterId = toewijzing ? toewijzing.id : null;

            html += '<td class="werkrooster-cel">';
            
            if (roosterId) {
                html += `<div class="werkrooster-toewijzing">
                    <span>${escapeHtml(vrijwilligerNaam)}</span>
                    <button class="btn-secondary btn-sm btn-verwijder-toewijzing" data-id="${roosterId}">Verwijderen</button>
                </div>`;
            } else {
                html += `<div class="werkrooster-leeg">
                    <select class="rol-select werkrooster-select" data-jobrol="${escapeHtml(jobrol)}" data-tijdslot="${tijdslot}">
                        <option value="">-- Selecteer --</option>`;
                
                beschikbareVrijwilligers.forEach(v => {
                    html += `<option value="${v.id}">${escapeHtml(v.naam)}</option>`;
                });
                
                html += `</select>
                    <button class="btn-primary btn-sm btn-toewijzen-vrijwilliger" data-jobrol="${escapeHtml(jobrol)}" data-tijdslot="${tijdslot}">+</button>
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

    if (roosterContainer) {
        roosterContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-toewijzen-vrijwilliger')) {
                const jobrol = e.target.getAttribute('data-jobrol');
                const tijdslot = e.target.getAttribute('data-tijdslot');
                const select = roosterContainer.querySelector(`.werkrooster-select[data-jobrol="${jobrol}"][data-tijdslot="${tijdslot}"]`);
                const vrijwilligerId = select ? select.value : '';

                if (!vrijwilligerId) {
                    showToast('Selecteer een vrijwilliger.', 'warning');
                    return;
                }

                try {
                    const res = await fetch(`${CONFIG.apiBaseUrl}/werkrooster`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            vrijwilliger_id: parseInt(vrijwilligerId, 10),
                            jobrol: jobrol,
                            tijdslot: tijdslot
                        })
                    });

                    const result = await res.json();
                    if (!res.ok) throw new Error(result.error);

                    showToast(result.message, 'success');
                    laadWerkrooster();
                } catch (err) {
                    showToast(err.message, 'error');
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

                    showToast(result.message, 'success');
                    laadWerkrooster();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            }
        });
    }
}