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

// Hulpfunctie om minuten op te tellen bij een tijd (bijv. "10:00" + 10 = "10:10")
function berekenTijd(startTijdStr, extraMinuten) {
    const [uren, minuten] = startTijdStr.split(':').map(Number);
    const datum = new Date();
    datum.setHours(uren, minuten + extraMinuten, 0, 0);
    return datum.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function renderRooster(gegroepeerdeData, container) {
    let html = '<div class="kalender-grid">';

    for (const [tijd, wedstrijden] of Object.entries(gegroepeerdeData)) {
        // We pakken de exacte starttijd van de eerste wedstrijd in dit blok
        const startOpwarming = wedstrijden[0].starttijd; 
        const startMatch = berekenTijd(startOpwarming, 10);
        const eindeMatch = berekenTijd(startOpwarming, 55);

        html += `
            <div class="tijd-slot">
                <div class="slot-header">
                    <div class="slot-title"> Blok: ${startOpwarming} - ${eindeMatch}</div>
                    
                    <div class="slot-agenda">
                        <span><span class="tijd-highlight text-orange">${startOpwarming}</span>  Opwarming (10 min)</span>
                        <span><span class="tijd-highlight text-green">${startMatch}</span>  Start Wedstrijd (45 min)</span>
                        <span><span class="tijd-highlight text-gray">${eindeMatch}</span>  Veld Vrijmaken</span>
                    </div>
                </div>
                
                <div class="match-cards">
                    ${wedstrijden.map(match => {
                        const isSenior = match.reeks.toLowerCase().includes('senior');
                        const badgeColor = isSenior ? '#e74c3c' : '#3498db';
                        
                        return `
                        <div class="match-card">
                            <div class="match-info">
                                <span class="badge-veld">Veld ${match.veld || '?'}</span>
                                <span style="background: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 6px; font-size: 0.8em; float: right;">
                                    ${match.reeks} (R. ${match.ronde})
                                </span>
                            </div>
                            <div class="match-teams">
                                <div>${match.thuis_ploeg}</div>
                                <div style="color: #9ca3af; font-size: 0.8em; margin: 4px 0;">VS</div>
                                <div>${match.uit_ploeg}</div>
                            </div>
                            <div class="match-info mt-2" style="border-top: 1px solid #f3f4f6; padding-top: 8px;">
                                Scheids: <strong>${match.scheidsrechter || 'TBD'}</strong>
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