import { CONFIG } from './api.js';
import { currentRole } from './auth.js';

export function initActies() {
    if (currentRole !== 'beheerder' && currentRole !== 'dev') return;

    const container    = document.getElementById('acties-lijst');
    const archiefLijst = document.getElementById('archief-lijst');
    const archiefBlok  = document.getElementById('archief-blok');
    const form         = document.getElementById('form-actie');
    const userEmail    = localStorage.getItem('userEmail');

    if (!container || !form) return;

    // --- Laden ---
    async function laadActies() {
        try {
            const res    = await fetch(`${CONFIG.apiBaseUrl}/acties`);
            const acties = await res.json();
            renderActies(acties);
        } catch (err) {
            container.innerHTML = '<li style="color:#e74c3c;">Kon acties niet laden.</li>';
        }
    }

    async function laadArchief() {
        if (!archiefLijst) return;
        try {
            const res    = await fetch(`${CONFIG.apiBaseUrl}/acties/archief`);
            const acties = await res.json();
            renderArchief(acties);
        } catch (err) {
            archiefLijst.innerHTML = '<li style="color:#e74c3c;">Kon archief niet laden.</li>';
        }
    }

    // --- Render acties ---
    function renderActies(acties) {
        container.innerHTML = '';
        if (acties.length === 0) {
            container.innerHTML = '<li style="color:#6b7280; font-style: italic;">Geen openstaande acties.</li>';
            return;
        }

        acties.forEach(actie => {
            const li      = document.createElement('li');
            const isBezig = actie.status === 'bezig';
            const isEigen = actie.beheerder_email === userEmail;

            li.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;';
            if (isBezig) li.style.borderLeft = '4px solid #d97706';

            const info = document.createElement('div');
            info.style.flex = '1';
            info.innerHTML = `
                <div style="font-weight: 600; color: #111827; font-size: 14px;">${actie.omschrijving}</div>
                ${isBezig
                    ? `<div style="font-size: 12px; color: #d97706; margin-top: 4px;">⚙ Bezig: <strong>${actie.beheerder_email}</strong></div>`
                    : `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">Nog niet geclaimd</div>`
                }
            `;

            const acties_div = document.createElement('div');
            acties_div.style.cssText = 'display: flex; gap: 6px; flex-shrink: 0;';

            if (!isBezig) {
                const claimBtn = document.createElement('button');
                claimBtn.className = 'btn-primary';
                claimBtn.textContent = 'Ik pak dit op';
                claimBtn.style.cssText = 'padding: 6px 12px; font-size: 12px;';
                claimBtn.setAttribute('data-id', actie.id);
                claimBtn.setAttribute('data-action', 'claim');
                acties_div.appendChild(claimBtn);
            } else if (isEigen) {
                const klaarBtn = document.createElement('button');
                klaarBtn.className = 'btn-primary';
                klaarBtn.textContent = 'Markeer als klaar';
                klaarBtn.style.cssText = 'padding: 6px 12px; font-size: 12px; background: #059669;';
                klaarBtn.setAttribute('data-id', actie.id);
                klaarBtn.setAttribute('data-action', 'gedaan');
                acties_div.appendChild(klaarBtn);
            }

            li.appendChild(info);
            li.appendChild(acties_div);
            container.appendChild(li);
        });
    }

    // --- Render archief ---
    function renderArchief(acties) {
        if (!archiefLijst) return;
        archiefLijst.innerHTML = '';

        if (acties.length === 0) {
            archiefLijst.innerHTML = '<li style="color:#6b7280; font-style: italic;">Archief is leeg.</li>';
            return;
        }

        acties.forEach(actie => {
            const li = document.createElement('li');
            li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 12px; opacity: 0.75;';
            li.innerHTML = `
                <div>
                    <div style="font-weight: 600; font-size: 14px; color: #374151; text-decoration: line-through;">${actie.omschrijving}</div>
                    <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">Afgerond door: ${actie.beheerder_email || 'onbekend'}</div>
                </div>
                <button class="btn-secondary" data-id="${actie.id}" data-action="verwijder"
                    style="padding: 4px 10px; font-size: 12px; color: #dc2626; border-color: #dc2626;">
                    Verwijder
                </button>
            `;
            archiefLijst.appendChild(li);
        });
    }

    // --- Event delegation acties ---
    container.addEventListener('click', async (e) => {
        const btn    = e.target.closest('[data-action]');
        if (!btn) return;

        const id     = parseInt(btn.getAttribute('data-id'));
        const action = btn.getAttribute('data-action');

        if (action === 'claim') {
            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/acties/${id}/claim`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);
                laadActies();
            } catch (err) {
                alert(`Fout: ${err.message}`);
            }
        }

        if (action === 'gedaan') {
            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/acties/${id}/gedaan`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);
                laadActies();
                laadArchief();
            } catch (err) {
                alert(`Fout: ${err.message}`);
            }
        }
    });

    // --- Event delegation archief ---
    if (archiefLijst) {
        archiefLijst.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action="verwijder"]');
            if (!btn) return;

            const id = parseInt(btn.getAttribute('data-id'));
            if (!confirm('Actie permanent verwijderen uit archief?')) return;

            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/acties/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Verwijderen mislukt');
                laadArchief();
            } catch (err) {
                alert(`Fout: ${err.message}`);
            }
        });
    }

    // --- Archief toggle ---
    const archiefToggle = document.getElementById('archief-toggle');
    if (archiefToggle && archiefBlok) {
        archiefToggle.addEventListener('click', () => {
            const isOpen = archiefBlok.style.display !== 'none';
            archiefBlok.style.display = isOpen ? 'none' : 'block';
            archiefToggle.textContent = isOpen ? 'Archief bekijken ▾' : 'Archief verbergen ▴';
            if (!isOpen) laadArchief();
        });
    }

    // --- Nieuwe actie toevoegen ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('nieuwe-actie-tekst');
        try {
            const res = await fetch(`${CONFIG.apiBaseUrl}/acties`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ omschrijving: input.value })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            input.value = '';
            laadActies();
        } catch (err) {
            alert(`Fout: ${err.message}`);
        }
    });

    laadActies();
}
