import { CONFIG } from './api.js';
import { currentRole } from './auth.js';

// Laad actieve reeksen en vul de ploeg-inschrijf dropdown
export async function laadActieveReeksen() {
    const select = document.getElementById('ploeg-reeks');
    if (!select) return;

    try {
        const res     = await fetch(`${CONFIG.apiBaseUrl}/reeksen/actief`);
        const reeksen = await res.json();

        select.innerHTML = '<option value="" disabled selected>Kies een reeks...</option>';

        if (reeksen.length === 0) {
            select.innerHTML += '<option disabled>Geen reeksen beschikbaar — vraag een beheerder reeksen te activeren.</option>';
            return;
        }

        // Groepeer per categorie+geslacht voor optgroups
        const groepen = reeksen.reduce((acc, r) => {
            const key = `${r.categorie} - ${r.geslacht}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(r);
            return acc;
        }, {});

        for (const [groepNaam, items] of Object.entries(groepen)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groepNaam;
            items.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.naam;
                opt.textContent = r.naam;
                optgroup.appendChild(opt);
            });
            select.appendChild(optgroup);
        }
    } catch (err) {
        console.error("Fout bij laden reeksen:", err);
    }
}

// Initialiseer reeksen: laad dropdown + beheerder-sectie indien van toepassing
export function initReeksen() {
    laadActieveReeksen();

    if (currentRole !== 'beheerder' && currentRole !== 'dev') return;

    laadReeksenBeheer();
}

async function laadReeksenBeheer() {
    const container = document.getElementById('reeksen-beheer-lijst');
    if (!container) return;

    try {
        const res     = await fetch(`${CONFIG.apiBaseUrl}/reeksen`);
        const reeksen = await res.json();

        // Groepeer per categorie
        const groepen = reeksen.reduce((acc, r) => {
            if (!acc[r.categorie]) acc[r.categorie] = [];
            acc[r.categorie].push(r);
            return acc;
        }, {});

        container.innerHTML = '';

        for (const [categorie, items] of Object.entries(groepen)) {
            const sectie = document.createElement('div');
            sectie.style.cssText = 'margin-bottom: 20px;';
            sectie.innerHTML = `
                <div style="font-weight: 700; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6;">
                    ${categorie}
                </div>
            `;

            const grid = document.createElement('div');
            grid.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px;';

            items.forEach(r => {
                const tag = document.createElement('button');
                tag.className = r.actief ? 'reeks-tag actief' : 'reeks-tag';
                tag.textContent = r.naam;
                tag.setAttribute('data-id', r.id);
                tag.setAttribute('data-actief', r.actief);
                grid.appendChild(tag);
            });

            sectie.appendChild(grid);
            container.appendChild(sectie);
        }

        // Samenvatting bijwerken
        bijwerkSamenvatting(reeksen.filter(r => r.actief).length, reeksen.length);

    } catch (err) {
        console.error("Fout bij laden reeksen beheer:", err);
        container.innerHTML = '<p style="color: #e74c3c;">Kon reeksen niet laden.</p>';
        return;
    }

    // Event delegation voor toggle knoppen
    container.addEventListener('click', async (e) => {
        if (!e.target.classList.contains('reeks-tag')) return;

        const id     = parseInt(e.target.getAttribute('data-id'));
        const huidig = parseInt(e.target.getAttribute('data-actief'));
        const nieuw  = huidig === 1 ? 0 : 1;

        try {
            const res = await fetch(`${CONFIG.apiBaseUrl}/reeksen/${id}/actief`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actief: nieuw })
            });
            if (!res.ok) throw new Error('Fout bij bijwerken');

            e.target.setAttribute('data-actief', nieuw);
            e.target.classList.toggle('actief', nieuw === 1);

            // Samenvatting herberekenen
            const alleActief  = container.querySelectorAll('.reeks-tag.actief').length;
            const alleReeksen = container.querySelectorAll('.reeks-tag').length;
            bijwerkSamenvatting(alleActief, alleReeksen);

            // Herlaad de inschrijf-dropdown
            await laadActieveReeksen();
        } catch (err) {
            alert('Fout bij bijwerken reeks.');
        }
    });
}

function bijwerkSamenvatting(actief, totaal) {
    const el = document.getElementById('reeksen-samenvatting');
    if (el) el.textContent = `${actief} van ${totaal} reeksen actief voor dit toernooi.`;
}