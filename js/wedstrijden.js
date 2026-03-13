import { CONFIG } from './api.js';

export async function initWedstrijden() {
    const scoresContainer  = document.getElementById('scores-container');
    const scheidsContainer = document.getElementById('scheids-matches');
    const userRole         = localStorage.getItem('userRole');
    const userEmail        = localStorage.getItem('userEmail');

    try {
        const res     = await fetch(`${CONFIG.apiBaseUrl}/rooster`);
        const matches = await res.json();

        // --- 1. Actuele Scores (zichtbaar voor iedereen) ---
        if (scoresContainer) {
            if (!matches || matches.length === 0) {
                scoresContainer.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">Nog geen wedstrijden gepland.</p>';
            } else {
                scoresContainer.innerHTML = renderScoreGrid(matches);
            }
        }

        // --- 2. Scheidsrechter Dashboard ---
        if (scheidsContainer && (userRole === 'scheids' || userRole === 'beheerder' || userRole === 'dev')) {
            await renderScheidsDashboard(scheidsContainer, userRole, userEmail);
        }

    } catch (err) {
        console.error("Fout bij laden wedstrijden:", err);
        if (scoresContainer) {
            scoresContainer.innerHTML = '<p style="color: #e74c3c;">Kon wedstrijden niet laden.</p>';
        }
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// Groepeer wedstrijden per tijdsblok en sorteer chronologisch op starttijd
function groepeerOpTijdsblok(matches) {
    const gegroepeerd = matches.reduce((acc, match) => {
        const sleutel = match.tijdsblok || match.starttijd;
        if (!acc[sleutel]) acc[sleutel] = [];
        acc[sleutel].push(match);
        return acc;
    }, {});

    // Sorteer tijdsblokken op starttijd van de eerste wedstrijd in elk blok
    return Object.fromEntries(
        Object.entries(gegroepeerd).sort(([, a], [, b]) => {
            const tijdA = a[0].starttijd || '';
            const tijdB = b[0].starttijd || '';
            return tijdA.localeCompare(tijdB);
        })
    );
}

// Reeks badge kleur
function reeksBadge(reeks) {
    const isSenior = reeks.toLowerCase().includes('senior');
    const kleur    = isSenior ? '#e74c3c' : '#3498db';
    return `<span style="background: ${kleur}; color: white; padding: 2px 8px; border-radius: 6px; font-size: 0.8em; float: right;">${reeks}</span>`;
}

// Score display
function renderScore(match) {
    if (match.score_thuis !== null && match.score_thuis !== undefined &&
        match.score_uit   !== null && match.score_uit   !== undefined) {
        return `<strong style="font-size: 16px; color: #111827;">${match.score_thuis} - ${match.score_uit}</strong>`;
    }
    return `<span style="color: #9ca3af;">-</span>`;
}

// ─── Scorebord (iedereen) ────────────────────────────────────────────────────

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

// ─── Scheids Dashboard ───────────────────────────────────────────────────────

async function renderScheidsDashboard(container, userRole, userEmail) {

    // Beheerder/dev ziet alle wedstrijden met score-formulieren
    if (userRole === 'beheerder' || userRole === 'dev') {
        try {
            const res     = await fetch(`${CONFIG.apiBaseUrl}/rooster`);
            const matches = await res.json();

            if (!matches || matches.length === 0) {
                container.innerHTML = '<p style="color: #6b7280;">Nog geen wedstrijden gepland.</p>';
                return;
            }

            container.innerHTML = renderScheidsGrid(matches);
            koppelScheidsEvents(container, userEmail);
        } catch (err) {
            container.innerHTML = '<p style="color: #e74c3c;">Kon wedstrijden niet laden.</p>';
        }
        return;
    }

    // Scheids: haal eigen tijdsblok op
    if (!userEmail) {
        container.innerHTML = '<p style="color: #6b7280;">Niet ingelogd.</p>';
        return;
    }

    try {
        const res  = await fetch(`${CONFIG.apiBaseUrl}/scheids/mijn-blok?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();

        if (!data.tijdsblok || data.wedstrijden.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; background: #f9fafb; border-radius: 10px; border: 2px dashed #d1d5db;">
                    <p style="color: #6b7280; font-weight: 500;">Je bent nog niet ingepland als scheidsrechter, of je aanvraag is nog in behandeling.</p>
                </div>`;
            return;
        }

        container.innerHTML = renderScheidsBlok(data.tijdsblok, data.wedstrijden, data.naam);
        koppelScheidsEvents(container, userEmail);

    } catch (err) {
        console.error("Fout bij laden scheids blok:", err);
        container.innerHTML = '<p style="color: #e74c3c;">Kon jouw tijdsblok niet laden.</p>';
    }
}

// Render voor scheids: één tijdsblok met claim-knoppen + score formulieren
function renderScheidsBlok(tijdsblok, wedstrijden, scheidsNaam) {
    return `
        <div class="kalender-grid">
            <div class="tijd-slot">
                <div class="slot-header">
                    <div class="slot-title">🕒 Jouw tijdsblok: ${tijdsblok}</div>
                    <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
                        Kies hieronder welke wedstrijd je wilt leiden. Je kunt maar één wedstrijd per blok claimen.
                    </div>
                </div>
                <div class="match-cards">
                    ${wedstrijden.map(match => renderScheidsMatchCard(match, scheidsNaam)).join('')}
                </div>
            </div>
        </div>
    `;
}

// Render voor beheerder/dev: alle tijdsblokken
function renderScheidsGrid(matches) {
    const gegroepeerd = groepeerOpTijdsblok(matches);
    let html = '<div class="kalender-grid">';

    for (const [tijdsblok, wedstrijden] of Object.entries(gegroepeerd)) {
        html += `
            <div class="tijd-slot">
                <div class="slot-header">
                    <div class="slot-title">🕒 ${tijdsblok}</div>
                </div>
                <div class="match-cards">
                    ${wedstrijden.map(match => renderScheidsMatchCard(match, null)).join('')}
                </div>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

// Individuele match-card voor scheids dashboard
function renderScheidsMatchCard(match, scheidsNaam) {
    const heeftScheids = match.scheidsrechter && match.scheidsrechter !== 'TBD';
    const isEigenClaim = scheidsNaam && match.scheidsrechter === scheidsNaam;

    // Claim sectie
    let claimHtml = '';
    if (heeftScheids) {
        const kleur = isEigenClaim ? '#059669' : '#6b7280';
        const tekst = isEigenClaim ? `✓ Jij leidt deze wedstrijd` : `Scheids: ${match.scheidsrechter}`;
        claimHtml = `
            <div style="margin-top: 10px; padding: 8px 12px; background: #f9fafb; border-radius: 8px; font-size: 13px; color: ${kleur}; font-weight: 600;">
                ${tekst}
            </div>`;
    } else {
        claimHtml = `
            <div style="margin-top: 10px;">
                <button class="btn-primary btn-claim-wedstrijd" data-id="${match.id}"
                    style="width: 100%; padding: 8px; font-size: 13px;">
                    Ik leid deze wedstrijd
                </button>
            </div>`;
    }

    return `
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
            ${claimHtml}
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
    `;
}

function koppelScheidsEvents(container, userEmail) {
    // Score formulier submit
    container.addEventListener('submit', async (e) => {
        if (!e.target.classList.contains('score-form')) return;
        e.preventDefault();

        const form       = e.target;
        const id         = form.getAttribute('data-id');
        const scoreThuis = form.querySelector('[name="score_thuis"]').value;
        const scoreUit   = form.querySelector('[name="score_uit"]').value;
        const submitBtn  = form.querySelector('button[type="submit"]');

        submitBtn.disabled    = true;
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

            await initWedstrijden();
        } catch (err) {
            console.error("Fout bij opslaan score:", err);
            alert(`Fout: ${err.message}`);
            submitBtn.disabled    = false;
            submitBtn.textContent = 'Opslaan';
        }
    });

    // Claim wedstrijd knop
    container.addEventListener('click', async (e) => {
        if (!e.target.classList.contains('btn-claim-wedstrijd')) return;

        const wedstrijdId = e.target.getAttribute('data-id');
        const email       = userEmail || localStorage.getItem('userEmail');

        if (!email) {
            alert('Niet ingelogd.');
            return;
        }

        e.target.disabled    = true;
        e.target.textContent = '...';

        try {
            const res = await fetch(`${CONFIG.apiBaseUrl}/scheids/claim-wedstrijd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, wedstrijd_id: parseInt(wedstrijdId) })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Fout bij claimen');

            // Herlaad volledig dashboard zodat scorebord ook bijgewerkt wordt
            await initWedstrijden();
        } catch (err) {
            alert(`Fout: ${err.message}`);
            e.target.disabled    = false;
            e.target.textContent = 'Ik leid deze wedstrijd';
        }
    });
}