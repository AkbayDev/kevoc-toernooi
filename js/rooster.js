import { CONFIG } from './api.js';

export async function laadRooster() {
    const roosterContainer = document.getElementById('rooster-container');
    if (!roosterContainer) return; 
    
    roosterContainer.innerHTML = '<p class="text-muted">Rooster wordt geladen...</p>';
    
    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/rooster`);
        const data = await res.json();

        if (!res.ok) throw new Error(`Fout: ${res.status}`);

        if (data.length === 0) {
            roosterContainer.innerHTML = '<div class="alert alert-warning">Er is nog geen rooster gegenereerd. Klik op de knop om te starten.</div>';
            return;
        }

        // Groepeer alle wedstrijden op hun starttijd/tijdsblok
        const gegroepeerd = data.reduce((acc, match) => {
            // Gebruik tijdsblok als hoofding (bijv. "10:00-10:30")
            const tijd = match.tijdsblok || match.starttijd; 
            if (!acc[tijd]) acc[tijd] = [];
            acc[tijd].push(match);
            return acc;
        }, {});

        renderRooster(gegroepeerd, roosterContainer);
    } catch (err) {
        console.error("Fout bij ophalen rooster:", err);
        roosterContainer.innerHTML = `<div class="alert alert-danger">Kon het rooster niet laden: ${err.message}</div>`;
    }
}

function renderRooster(gegroepeerdeData, container) {
    let html = '<div class="kalender-grid">';

    // Loop door elk tijdsblok (bijv. 10:00, 10:30, 11:00)
    for (const [tijd, wedstrijden] of Object.entries(gegroepeerdeData)) {
        html += `
            <div class="tijd-slot" style="margin-bottom: 20px;">
                <h3 class="slot-header" style="background: #34495e; color: white; padding: 10px; border-radius: 5px;">
                    Tijd: ${tijd}
                </h3>
                <div class="match-cards" style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 10px;">
                    ${wedstrijden.map(match => {
                        // Geef reeksen een leuk kleurtje als label
                        const badgeColor = match.reeks.toLowerCase().includes('senior') ? '#e74c3c' : '#3498db';
                        
                        return `
                        <div class="match-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; width: 100%; max-width: 300px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <div class="match-info" style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.9em; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                                <strong style="color: #2c3e50;">Veld ${match.veld || '?'}</strong>
                                <span style="background: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.8em;">
                                    ${match.reeks} (Ronde ${match.ronde})
                                </span>
                            </div>
                            <div class="match-teams" style="text-align: center; font-size: 1.1em; font-weight: bold; margin: 15px 0;">
                                <div>${match.thuis_ploeg}</div>
                                <div style="color: #95a5a6; font-size: 0.8em; margin: 5px 0;">VS</div>
                                <div>${match.uit_ploeg}</div>
                            </div>
                            <div class="match-footer" style="text-align: right; font-size: 0.8em; color: #7f8c8d; border-top: 1px solid #eee; padding-top: 5px;">
                                Scheids: ${match.scheidsrechter || 'Nog te bepalen'}
                            </div>
                        </div>
                        `;
                    }).join('')}
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
            const bevestig = confirm("Weet je zeker dat je een nieuw rooster wilt genereren? Het oude rooster wordt overschreven.");
            if (!bevestig) return;

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
                console.error(err);
            } finally {
                btnGenereer.disabled = false;
                btnGenereer.innerText = "Genereer Nieuw Rooster";
            }
        });
    }
    
    if (btnVervers) {
        btnVervers.addEventListener('click', laadRooster);
    }
}