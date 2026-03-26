import { CONFIG } from './api.js';

export async function initFinancien() {
    const container = document.getElementById('betaal-overzicht');
    if (!container) return;

    try {
        const res    = await fetch(`${CONFIG.apiBaseUrl}/ploegen`);
        const ploegen = await res.json();

        if (!ploegen || ploegen.length === 0) {
            container.innerHTML = '<p style="color: #6b7280;">Nog geen ploegen ingeschreven.</p>';
            return;
        }

        const betaald     = ploegen.filter(p => p.betaalstatus === 'betaald');
        const nietBetaald = ploegen.filter(p => p.betaalstatus !== 'betaald');

        container.innerHTML = `
            <!-- Samenvatting -->
            <div style="background: #f9fafb; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; font-size: 15px; color: #111827;">
                <strong>${betaald.length}</strong> van <strong>${ploegen.length}</strong> ploegen hebben betaald.
            </div>

            <!-- Nog te betalen -->
            ${nietBetaald.length > 0 ? `
            <div style="border-left: 4px solid #dc2626; background: #fff5f5; border-radius: 0 10px 10px 0; padding: 14px 18px; margin-bottom: 20px;">
                <div style="font-weight: 700; color: #dc2626; margin-bottom: 10px; font-size: 14px;">
                    ✗ Nog te betalen (${nietBetaald.length})
                </div>
                <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px;">
                    ${nietBetaald.map(p => renderPloegRij(p)).join('')}
                </ul>
            </div>` : ''}

            <!-- Betaald -->
            ${betaald.length > 0 ? `
            <div style="border-left: 4px solid #059669; background: #f0fdf4; border-radius: 0 10px 10px 0; padding: 14px 18px;">
                <div style="font-weight: 700; color: #059669; margin-bottom: 10px; font-size: 14px;">
                    ✓ Betaald (${betaald.length})
                </div>
                <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px;">
                    ${betaald.map(p => renderPloegRij(p)).join('')}
                </ul>
            </div>` : ''}
        `;
    } catch (err) {
        console.error("Fout bij laden betaaloverzicht:", err);
        container.innerHTML = '<p style="color: #e74c3c;">Kon ploegen niet laden.</p>';
    }
}

function renderPloegRij(ploeg) {
    const niveauKleur = ploeg.niveau === 'senior' ? '#dc2626' : '#3498db';
    return `
        <li style="background: #ffffff; padding: 10px 14px; border-radius: 8px; border: 1px solid #f3f4f6; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: #111827;">
            ${ploeg.naam}
            <span style="background-color: ${niveauKleur}; color: white; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600;">${ploeg.niveau}</span>
            <span style="background-color: #6b7280; color: white; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600;">${ploeg.categorie}</span>
        </li>
    `;
}