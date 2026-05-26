import { CONFIG, escapeHtml, showToast, reeksBadge } from './api.js';

// Cache match data to avoid double API calls
let cachedMatches = null;

export async function initWedstrijden() {
    const scoresContainer  = document.getElementById('scores-container');
    const scheidsContainer = document.getElementById('scheids-matches');
    const userRole         = localStorage.getItem('userRole');
    const userEmail        = localStorage.getItem('userEmail');

    try {
        const res     = await fetch(`${CONFIG.apiBaseUrl}/rooster`);
        const matches = await res.json();
        cachedMatches = matches;

        // --- 1. Actuele Scores (zichtbaar voor iedereen) ---
        if (scoresContainer) {
            if (!matches || matches.length === 0) {
                scoresContainer.innerHTML = '<p class="text-muted" style="text-align:center;padding:1.25rem;">Nog geen wedstrijden gepland.</p>';
            } else {
                scoresContainer.innerHTML = renderScoreGrid(matches);
            }
        }

        // --- 2. Scheidsrechter Dashboard ---
        // Reuse cached matches instead of a second fetch
        if (scheidsContainer && (userRole === 'scheids' || userRole === 'beheerder' || userRole === 'dev')) {
            await renderScheidsDashboard(scheidsContainer, userRole, userEmail, matches);
        }

    } catch (err) {
        console.error("Fout bij laden wedstrijden:", err);
        if (scoresContainer) {
            scoresContainer.innerHTML = '<p class="text-error">Kon wedstrijden niet laden.</p>';
        }
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function groepeerOpTijdsblok(matches) {
    const gegroepeerd = matches.reduce((acc, match) => {
        const sleutel = match.tijdsblok || match.starttijd;
        if (!acc[sleutel]) acc[sleutel] = [];
        acc[sleutel].push(match);
        return acc;
    }, {});

    return Object.fromEntries(
        Object.entries(gegroepeerd).sort(([, a], [, b]) => {
            const tijdA = a[0].starttijd || '';
            const tijdB = b[0].starttijd || '';
            return tijdA.localeCompare(tijdB);
        })
    );
}

// Score display
function renderScore(match) {
    if (match.score_thuis != null && match.score_uit != null) {
        return `<strong class="score-display">${match.score_thuis} - ${match.score_uit}</strong>`;
    }
    return '<span class="text-muted">-</span>';
}

// ─── Scorebord (iedereen) ────────────────────────────────────────────────────

function renderScoreGrid(matches) {
    const gegroepeerd = groepeerOpTijdsblok(matches);
    let html = '<div class="kalender-grid">';

    for (const [tijdsblok, wedstrijden] of Object.entries(gegroepeerd)) {
        html += `
            <div class="tijd-slot">
                <div class="slot-header">
                    <div class="slot-title">🕒 ${escapeHtml(tijdsblok)}</div>
                </div>
                <div class="match-cards">
                    ${wedstrijden.map(match => `
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
                            <div class="match-info match-score-row">
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

async function renderScheidsDashboard(container, userRole, userEmail, matches) {

    // Beheerder/dev ziet alle wedstrijden met score-formulieren
    if (userRole === 'beheerder' || userRole === 'dev') {
        if (!matches || matches.length === 0) {
            container.innerHTML = '<p class="text-muted">Nog geen wedstrijden gepland.</p>';
            return;
        }

        container.innerHTML = renderScheidsGrid(matches);
        setupScheidsEvents(container, userEmail);
        return;
    }

    // Scheids: haal eigen tijdsblok op
    if (!userEmail) {
        container.innerHTML = '<p class="text-muted">Niet ingelogd.</p>';
        return;
    }

    try {
        const res  = await fetch(`${CONFIG.apiBaseUrl}/scheids/mijn-blok?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();

        if (!data.tijdsblok || data.wedstrijden.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Je bent nog niet ingepland als scheidsrechter, of je aanvraag is nog in behandeling.</p>
                </div>`;
            return;
        }

        container.innerHTML = renderScheidsBlok(data.tijdsblok, data.wedstrijden, data.naam);
        setupScheidsEvents(container, userEmail);

    } catch (err) {
        console.error("Fout bij laden scheids blok:", err);
        container.innerHTML = '<p class="text-error">Kon jouw tijdsblok niet laden.</p>';
    }
}

function renderScheidsBlok(tijdsblok, wedstrijden, scheidsNaam) {
    return `
        <div class="kalender-grid">
            <div class="tijd-slot">
                <div class="slot-header">
                    <div class="slot-title">🕒 Jouw tijdsblok: ${escapeHtml(tijdsblok)}</div>
                    <div class="text-sm text-muted mt-sm">
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

function renderScheidsGrid(matches) {
    const gegroepeerd = groepeerOpTijdsblok(matches);
    let html = '<div class="kalender-grid">';

    for (const [tijdsblok, wedstrijden] of Object.entries(gegroepeerd)) {
        html += `
            <div class="tijd-slot">
                <div class="slot-header">
                    <div class="slot-title">🕒 ${escapeHtml(tijdsblok)}</div>
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

function renderScheidsMatchCard(match, scheidsNaam) {
    const heeftScheids = match.scheidsrechter && match.scheidsrechter !== 'TBD';
    const isEigenClaim = scheidsNaam && match.scheidsrechter === scheidsNaam;

    let claimHtml = '';
    if (heeftScheids) {
        const kleurClass = isEigenClaim ? 'text-success' : 'text-muted';
        const tekst = isEigenClaim ? '✓ Jij leidt deze wedstrijd' : `Scheids: ${escapeHtml(match.scheidsrechter)}`;
        claimHtml = `
            <div class="scheids-claim-status ${kleurClass}">
                ${tekst}
            </div>`;
    } else {
        claimHtml = `
            <div style="margin-top:0.625rem;">
                <button class="btn-primary btn-claim-wedstrijd" data-id="${match.id}" style="width:100%;padding:0.5rem;font-size:0.8125rem;">
                    Ik leid deze wedstrijd
                </button>
            </div>`;
    }

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
            ${claimHtml}
            <div class="score-entry-section">
                <div class="text-xs text-muted mb-sm fw-bold">Score invoeren</div>
                <form class="score-form" data-id="${match.id}">
                    <input type="number" name="score_thuis" placeholder="Thuis" min="0"
                        value="${match.score_thuis != null ? match.score_thuis : ''}"
                        class="score-input" required>
                    <span class="score-separator">-</span>
                    <input type="number" name="score_uit" placeholder="Uit" min="0"
                        value="${match.score_uit != null ? match.score_uit : ''}"
                        class="score-input" required>
                    <button type="submit" class="btn-primary btn-sm">Opslaan</button>
                </form>
            </div>
        </div>
    `;
}

/**
 * Set up event delegation for scheids dashboard.
 * CRITICAL FIX: This function is called once after rendering, NOT recursively.
 * The old code called initWedstrijden() recursively from event handlers,
 * causing duplicate event listeners and memory leaks.
 */
function setupScheidsEvents(container, userEmail) {
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
                    score_thuis: parseInt(scoreThuis, 10),
                    score_uit:   parseInt(scoreUit, 10)
                })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Fout bij opslaan');

            showToast('Score opgeslagen!', 'success');
            // Re-render instead of recursive init
            await initWedstrijden();
        } catch (err) {
            console.error("Fout bij opslaan score:", err);
            showToast(err.message, 'error');
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
            showToast('Niet ingelogd.', 'error');
            return;
        }

        e.target.disabled    = true;
        e.target.textContent = '...';

        try {
            const res = await fetch(`${CONFIG.apiBaseUrl}/scheids/claim-wedstrijd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, wedstrijd_id: parseInt(wedstrijdId, 10) })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Fout bij claimen');

            showToast('Wedstrijd geclaimd!', 'success');
            await initWedstrijden();
        } catch (err) {
            showToast(err.message, 'error');
            e.target.disabled    = false;
            e.target.textContent = 'Ik leid deze wedstrijd';
        }
    });
}