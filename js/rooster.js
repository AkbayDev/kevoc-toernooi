import { CONFIG, escapeHtml, showToast, reeksBadge } from './api.js';

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
            const tijd = match.tijdsblok || match.starttijd; 
            if (!acc[tijd]) acc[tijd] = [];
            acc[tijd].push(match);
            return acc;
        }, {});

        renderRooster(gegroepeerd, roosterContainer);
    } catch (err) {
        console.error("Fout bij ophalen rooster:", err);
        roosterContainer.innerHTML = `<div class="alert alert-danger">Kon het rooster niet laden: ${escapeHtml(err.message)}</div>`;
    }
}

// Hulpfunctie om minuten op te tellen bij een tijd
function berekenTijd(startTijdStr, extraMinuten) {
    const [uren, minuten] = startTijdStr.split(':').map(Number);
    const datum = new Date(2000, 0, 1, uren, minuten + extraMinuten);
    return datum.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function renderRooster(gegroepeerdeData, container) {
    let html = '<div class="kalender-grid">';

    for (const [tijd, wedstrijden] of Object.entries(gegroepeerdeData)) {
        const startOpwarming = wedstrijden[0].starttijd; 
        const startMatch = berekenTijd(startOpwarming, 10);
        const eindeMatch = berekenTijd(startOpwarming, 55);

        html += `
            <div class="tijd-slot">
                <div class="slot-header">
                    <div class="slot-title"> Blok: ${escapeHtml(startOpwarming)} - ${escapeHtml(eindeMatch)}</div>
                    
                    <div class="slot-agenda">
                        <span><span class="tijd-highlight text-orange">${escapeHtml(startOpwarming)}</span>  Opwarming (10 min)</span>
                        <span><span class="tijd-highlight text-green">${escapeHtml(startMatch)}</span>  Start Wedstrijd (45 min)</span>
                        <span><span class="tijd-highlight text-gray">${escapeHtml(eindeMatch)}</span>  Veld Vrijmaken</span>
                    </div>
                </div>
                
                <div class="match-cards">
                    ${wedstrijden.map(match => {
                        return `
                        <div class="match-card">
                            <div class="match-info">
                                <span class="badge-veld">Veld ${escapeHtml(String(match.veld || '?'))}</span>
                                ${reeksBadge(match.reeks)}
                            </div>
                            <div class="match-teams">
                                <div>${escapeHtml(match.thuis_ploeg)}</div>
                                <div class="match-vs">VS</div>
                                <div>${escapeHtml(match.uit_ploeg)}</div>
                            </div>
                            <div class="match-info match-scheids">
                                Scheids: <strong>${escapeHtml(match.scheidsrechter || 'TBD')}</strong>
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
                    showToast(result.message, 'success');
                    laadRooster(); 
                } else {
                    showToast(result.error || 'Genereren mislukt.', 'error');
                }
            } catch {
                showToast("Er is een netwerkfout opgetreden tijdens het genereren.", 'error');
            } finally {
                btnGenereer.disabled = false;
                btnGenereer.innerText = "Genereer Nieuw Rooster";
            }
        });
    }
    
    if (btnVervers) {
        btnVervers.addEventListener('click', laadRooster);
    }

    // Import wedstrijden handler
    const btnImportRooster   = document.getElementById('btn-import-rooster');
    const importRoosterInput = document.getElementById('import-rooster-bestand');
    const importRoosterMsg   = document.getElementById('import-rooster-msg');

    if (btnImportRooster && importRoosterInput) {
        btnImportRooster.addEventListener('click', async () => {
            const bestand = importRoosterInput.files[0];
            if (!bestand) {
                if (importRoosterMsg) { importRoosterMsg.className = 'mt-md text-sm fw-bold text-error'; importRoosterMsg.textContent = 'Kies eerst een bestand.'; }
                return;
            }

            const formData = new FormData();
            formData.append('bestand', bestand);

            btnImportRooster.disabled    = true;
            btnImportRooster.textContent = 'Importeren...';

            try {
                const res    = await fetch(`${CONFIG.apiBaseUrl}/rooster/import`, {
                    method: 'POST',
                    body: formData
                });
                const result = await res.json();

                if (importRoosterMsg) {
                    importRoosterMsg.className = `mt-md text-sm fw-bold ${res.ok ? 'text-success' : 'text-error'}`;
                    importRoosterMsg.textContent = result.message;
                }

                if (res.ok) {
                    importRoosterInput.value = '';
                    await laadRooster();
                }
            } catch {
                if (importRoosterMsg) { importRoosterMsg.className = 'mt-md text-sm fw-bold text-error'; importRoosterMsg.textContent = 'Import mislukt — controleer de verbinding.'; }
            } finally {
                btnImportRooster.disabled    = false;
                btnImportRooster.textContent = 'Importeer wedstrijden';
            }
        });
    }
}