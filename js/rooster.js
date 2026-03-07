import { CONFIG } from './api.js';

async function laadRooster() {
    const roosterContainer = document.getElementById('rooster-container');
    if (!roosterContainer) return; 
    roosterContainer.innerHTML = '<p class="text-muted">Rooster wordt geladen...</p>';
    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/rooster`);
        const data = await res.json();

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        if (data.length === 0) {
            roosterContainer.innerHTML = '<div class="alert alert-warning">Er is nog geen rooster. Klik op "Genereer Nieuw Rooster" om te starten.</div>';
            return;
        }

        const gegroepeerd = data.reduce((acc, match) => {
            const tijd = match.starttijd || match.tijdsblok;
            if (!acc[tijd]) acc[tijd] = [];
            acc[tijd].push(match);
            return acc;
        }, {});

        renderRooster(gegroepeerd, roosterContainer);
    } catch (err) {
        roosterContainer.innerHTML = `<div class="alert alert-danger">Kon het rooster niet laden: ${err.message}</div>`;
    }
}

function renderRooster(gegroepeerdeData, container) {
    let html = '<div class="kalender-grid">';
    for (const [tijd, wedstrijden] of Object.entries(gegroepeerdeData)) {
        html += `
            <div class="tijd-slot">
                <div class="slot-header">🕒 ${tijd}</div>
                <div class="match-cards">
                    ${wedstrijden.map(match => `
                        <div class="match-card">
                            <div class="match-info">
                                <span class="badge-veld">Veld ${match.veld || '-'}</span>
                                <span style="float: right;">${match.reeks || '-'} (R. ${match.ronde || '-'})</span>
                            </div>
                            <div class="match-teams">
                                ${match.thuis_ploeg || '-'} <br>
                                <span style="color:#9ca3af; font-size:12px;">vs</span> <br>
                                ${match.uit_ploeg || '-'}
                            </div>
                            <div class="match-info mt-2">
                                Scheids: ${match.scheidsrechter || '-'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
}

export function initRooster() {
    laadRooster();
    const btnGenereer = document.getElementById('btn-genereer');
    const btnVervers = document.getElementById('btn-ververs');

    if (btnGenereer) {
        btnGenereer.addEventListener('click', async () => {
            btnGenereer.disabled = true;
            btnGenereer.innerText = "Bezig met berekenen...";
            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/rooster`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const result = await res.json();
                if (res.ok) {
                    alert(result.message);
                    laadRooster(); 
                } else {
                    alert(`Fout: ${result.error}`);
                }
            } catch (err) {
                alert("Er is een netwerkfout opgetreden tijdens het genereren.");
            } finally {
                btnGenereer.disabled = false;
                btnGenereer.innerText = "Genereer Nieuw Rooster";
            }
        });
    }
    if (btnVervers) btnVervers.addEventListener('click', laadRooster);
}