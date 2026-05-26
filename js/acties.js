import { CONFIG, escapeHtml, showToast } from './api.js';
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
        } catch {
            container.innerHTML = '<li class="text-error">Kon acties niet laden.</li>';
        }
    }

    async function laadArchief() {
        if (!archiefLijst) return;
        try {
            const res    = await fetch(`${CONFIG.apiBaseUrl}/acties/archief`);
            const acties = await res.json();
            renderArchief(acties);
        } catch {
            archiefLijst.innerHTML = '<li class="text-error">Kon archief niet laden.</li>';
        }
    }

    // --- Render acties ---
    function renderActies(acties) {
        container.innerHTML = '';
        if (acties.length === 0) {
            container.innerHTML = '<li class="text-muted" style="font-style:italic;">Geen openstaande acties.</li>';
            return;
        }

        acties.forEach(actie => {
            const li      = document.createElement('li');
            const isBezig = actie.status === 'bezig';
            const isEigen = actie.beheerder_email === userEmail;

            li.className = 'actie-item';
            if (isBezig) li.classList.add('actie-bezig');

            const info = document.createElement('div');
            info.className = 'actie-info';
            info.innerHTML = `
                <div class="actie-tekst">${escapeHtml(actie.omschrijving)}</div>
                ${isBezig
                    ? `<div class="actie-status actie-status--bezig">⚙ Bezig: <strong>${escapeHtml(actie.beheerder_email)}</strong></div>`
                    : `<div class="actie-status">Nog niet geclaimd</div>`
                }
            `;

            const acties_div = document.createElement('div');
            acties_div.className = 'actie-buttons';

            if (!isBezig) {
                const claimBtn = document.createElement('button');
                claimBtn.className = 'btn-primary btn-sm';
                claimBtn.textContent = 'Ik pak dit op';
                claimBtn.setAttribute('data-id', actie.id);
                claimBtn.setAttribute('data-action', 'claim');
                acties_div.appendChild(claimBtn);
            } else if (isEigen) {
                const klaarBtn = document.createElement('button');
                klaarBtn.className = 'btn-primary btn-sm btn-success';
                klaarBtn.textContent = 'Markeer als klaar';
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
            archiefLijst.innerHTML = '<li class="text-muted" style="font-style:italic;">Archief is leeg.</li>';
            return;
        }

        acties.forEach(actie => {
            const li = document.createElement('li');
            li.className = 'actie-item actie-archief';
            li.innerHTML = `
                <div>
                    <div class="actie-tekst" style="text-decoration:line-through;">${escapeHtml(actie.omschrijving)}</div>
                    <div class="actie-status">Afgerond door: ${escapeHtml(actie.beheerder_email || 'onbekend')}</div>
                </div>
                <button class="btn-secondary btn-sm btn-danger" data-id="${actie.id}" data-action="verwijder">
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

        const id     = parseInt(btn.getAttribute('data-id'), 10);
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
                showToast('Actie geclaimd!', 'success');
                laadActies();
            } catch (err) {
                showToast(err.message, 'error');
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
                showToast('Actie afgerond!', 'success');
                laadActies();
                laadArchief();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    });

    // --- Event delegation archief ---
    if (archiefLijst) {
        archiefLijst.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action="verwijder"]');
            if (!btn) return;

            const id = parseInt(btn.getAttribute('data-id'), 10);
            if (!confirm('Actie permanent verwijderen uit archief?')) return;

            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/acties/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Verwijderen mislukt');
                showToast('Actie verwijderd.', 'success');
                laadArchief();
            } catch (err) {
                showToast(err.message, 'error');
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
            showToast('Actie toegevoegd!', 'success');
            laadActies();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    laadActies();
}
