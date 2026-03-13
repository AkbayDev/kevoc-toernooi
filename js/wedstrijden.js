import { CONFIG } from './api.js';

export async function initWedstrijden() {
    const scoresContainer = document.getElementById('scores-container');
    const scheidsContainer = document.getElementById('scheids-matches');
    const userRole = localStorage.getItem('userRole');

    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/rooster`);
        const matches = await res.json();

        // --- 1. Actuele Scores (zichtbaar voor iedereen) ---
        if (scoresContainer) {
            if (!matches || matches.length === 0) {
                scoresContainer.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">Nog geen wedstrijden gepland.</p>';
            } else {
                scoresContainer.innerHTML = renderScoreGrid(matches);
            }
        }

        // --- 2. Scheidsrechter Dashboard (alleen scheids en beheerder) ---
        if (scheidsContainer && (userRole === 'scheids' || userRole === 'beheerder' || userRole === 'dev')) {
            if (!matches || matches.length === 0) {
                scheidsContainer.innerHTML = '<p style="color: #6b7280;">Nog geen wedstrijden gepland.</p>';
            } else {
                scheidsContainer.innerHTML = renderScheidsGrid(matches, userRole);
                koppelScoreFormulieren(scheidsContainer);
            }
        }

    } catch (err) {
        console.error("Fout bij laden wedstrijden:", err);
        if (scoresContainer) {
            scoresContainer.innerHTML = '<p style="color: #e74c3c;">Kon wedstrijden niet laden.</p>';
        }
    }
}

// Groepeer wedstrijden per tijdsblok (zelfde logica als rooster.js)
function groepeerOpTijdsblok(matches) {
    return matches.reduce((acc, match) => {
        const sleutel = match.tijdsblok || match.starttijd;
        if (!acc[sleutel]) acc[sleutel] = [];
        acc[sleutel].push(match);
        return acc;
    }, {});
}

// Render reeks badge kleur: rood voor senior, blauw voor jeugd
function reeksBadge(reeks) {
    const isSenior = reeks.toLowerCase().includes('senior');
    const kleur = isSenior ? '#e74c3c' : '#3498db';
    return `<span style="background: ${kleur}; color: white; padding: 2px 8px; border-radius: 6px; font-size: 0.8em; float: right;">${reeks}</span>`;
}

// Render score display
function renderScore(match) {
    if (match.score_thuis !== null && match.score_thuis !== undefined &&
        match.score_uit  !== null && match.score_uit  !== undefined) {
        return `<strong style="font-size: 16px; color: #111827;">${match.score_thuis} - ${match.score_uit}</strong>`;
    }
    return `<span style="color: #9ca3af;">-</span>`;
}

// Scorebord grid (zelfde stijl als toernooi schema)
function renderScoreGrid(matches) {
    const gegroepeerd = groepeerOpTijdsblok(matches);
    let html = '<div class="kalender-grid">';

    for (const [tijdsblok, wedstrijden] of Object.entries(gegroepeerd)) {
        html += `
            <div class="tijd-slot">
                <div class="slot-header">
                    <div class="slot-title">🕒 ${tijdsblok}</div>
                </div>
                <div class="match-cards">
                    ${wedstrijden.map(match => `
                        <div class="match-card">
                            <div class="match-info">
                                <span class="badge-veld">Veld ${match.veld || '?'}</span>
                                ${reeksBadge(match.reeks)}
                            </div>
                            <div class="match-teams">
                                <div>${match.thuis_ploeg}</div>
                                <div style="color: #9ca3af; font-size: 0.8em; margin: 4px 0;">VS</div>
                                <div>${match.uit_ploeg}</div>
                            </div>
                            <div class="match-info" style="border-top: 1px solid #f3f4f6; padding-top: 8px; margin-top: 8px; text-align: center;">
                                Score: ${renderScore(match)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

// Scheidsrechter dashboard grid (zelfde stijl + score formulier)
function renderScheidsGrid(matches, userRole) {
    const gegroepeerd = groepeerOpTijdsblok(matches);
    let html = '<div class="kalender-grid">';

    for (const [tijdsblok, wedstrijden] of Object.entries(gegroepeerd)) {
        html += `
            <div class="tijd-slot">
                <div class="slot-header">
                    <div class="slot-title">🕒 ${tijdsblok}</div>
                </div>
                <div class="match-cards">
                    ${wedstrijden.map(match => `
                        <div class="match-card">
                            <div class="match-info">
                                <span class="badge-veld">Veld ${match.veld || '?'}</span>
                                ${reeksBadge(match.reeks)}
                            </div>
                            <div class="match-teams">
                                <div>${match.thuis_ploeg}</div>
                                <div style="color: #9ca3af; font-size: 0.8em; margin: 4px 0;">VS</div>
                                <div>${match.uit_ploeg}</div>
                            </div>
                            <div class="match-info" style="border-top: 1px solid #f3f4f6; padding-top: 8px; margin-top: 8px;">
                                Scheids: <strong>${match.scheidsrechter || 'TBD'}</strong>
                            </div>
                            <div style="margin-top: 12px; padding-top: 10px; border-top: 2px dashed #f3f4f6;">
                                <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; font-weight: 600;">Score invoeren</div>
                                <form class="score-form" data-id="${match.id}" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                    <input type="number" name="score_thuis" placeholder="Thuis" min="0"
                                        value="${match.score_thuis !== null && match.score_thuis !== undefined ? match.score_thuis : ''}"
                                        style="width: 65px; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; text-align: center;"
                                        required>
                                    <span style="font-weight: 700; color: #374151;">-</span>
                                    <input type="number" name="score_uit" placeholder="Uit" min="0"
                                        value="${match.score_uit !== null && match.score_uit !== undefined ? match.score_uit : ''}"
                                        style="width: 65px; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; text-align: center;"
                                        required>
                                    <button type="submit" class="btn-primary" style="padding: 8px 14px; font-size: 13px;">Opslaan</button>
                                </form>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

// Koppel submit events via event delegation op de container
function koppelScoreFormulieren(container) {
    container.addEventListener('submit', async (e) => {
        if (!e.target.classList.contains('score-form')) return;
        e.preventDefault();

        const form = e.target;
        const id = form.getAttribute('data-id');
        const scoreThuis = form.querySelector('[name="score_thuis"]').value;
        const scoreUit = form.querySelector('[name="score_uit"]').value;
        const submitBtn = form.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.textContent = '...';

        try {
            const res = await fetch(`${CONFIG.apiBaseUrl}/wedstrijden/${id}/score`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    score_thuis: parseInt(scoreThuis),
                    score_uit:   parseInt(scoreUit)
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Fout bij opslaan');

            // Herlaad beide secties zodat scorebord direct bijgewerkt wordt
            await initWedstrijden();
        } catch (err) {
            console.error("Fout bij opslaan score:", err);
            alert(`Fout: ${err.message}`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Opslaan';
        }
    });
}