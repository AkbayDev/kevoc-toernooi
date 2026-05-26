import { CONFIG, escapeHtml } from './api.js';

export async function initFinancien() {
    const container = document.getElementById('betaal-overzicht');
    if (!container) return;

    try {
        const res    = await fetch(`${CONFIG.apiBaseUrl}/ploegen`);
        const ploegen = await res.json();

        if (!ploegen || ploegen.length === 0) {
            container.innerHTML = '<p class="text-muted">Nog geen ploegen ingeschreven.</p>';
            return;
        }

        const betaald     = ploegen.filter(p => p.betaalstatus === 'betaald');
        const nietBetaald = ploegen.filter(p => p.betaalstatus !== 'betaald');

        container.innerHTML = `
            <!-- Samenvatting -->
            <div class="finance-summary">
                <strong>${betaald.length}</strong> van <strong>${ploegen.length}</strong> ploegen hebben betaald.
            </div>

            <!-- Nog te betalen -->
            ${nietBetaald.length > 0 ? `
            <div class="finance-section finance-section--unpaid">
                <div class="finance-section-title finance-section-title--unpaid">
                    ✗ Nog te betalen (${nietBetaald.length})
                </div>
                <ul class="finance-list">
                    ${nietBetaald.map(p => renderPloegRij(p)).join('')}
                </ul>
            </div>` : ''}

            <!-- Betaald -->
            ${betaald.length > 0 ? `
            <div class="finance-section finance-section--paid">
                <div class="finance-section-title finance-section-title--paid">
                    ✓ Betaald (${betaald.length})
                </div>
                <ul class="finance-list">
                    ${betaald.map(p => renderPloegRij(p)).join('')}
                </ul>
            </div>` : ''}
        `;
    } catch (err) {
        console.error("Fout bij laden betaaloverzicht:", err);
        container.innerHTML = '<p class="text-error">Kon ploegen niet laden.</p>';
    }
}

function renderPloegRij(ploeg) {
    const niveauKleur = ploeg.niveau === 'senior' ? 'var(--color-error)' : 'var(--color-brand)';
    return `
        <li class="finance-team-row">
            ${escapeHtml(ploeg.naam)}
            <span class="badge" style="background-color:${niveauKleur};">${escapeHtml(ploeg.niveau)}</span>
            <span class="badge badge--muted">${escapeHtml(ploeg.categorie)}</span>
        </li>
    `;
}