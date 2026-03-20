import { checkAuth, initAuthUI } from './auth.js';
import { initFinancien } from './financien.js';
import { initPloegen } from './ploegen.js';
import { initVrijwilligers } from './vrijwilligers.js';
import { initRooster } from './rooster.js';
import { initWerkrooster } from './werkrooster.js';
import { initWedstrijden } from './wedstrijden.js';
import { initActies } from './acties.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Controleer of de gebruiker is ingelogd (anders direct terug naar login)
    if (!checkAuth()) return;

    // 2. Initialiseer de interface (toon naam & verberg kaarten o.b.v. rol)
    initAuthUI();

    // 3. Start alle functionele modules
    initFinancien();
    initPloegen();
    initVrijwilligers();
    initRooster();
    initWerkrooster();
    initWedstrijden();
    initActies();

    // 4. Inklapbare cards — altijd als laatste zodat auth.js al klaar is
    initCollapsible();
});

function initCollapsible() {
    document.querySelectorAll('.dash-card').forEach(card => {
        const h2 = card.querySelector('h2');
        if (!h2) return;

        // Wrap alle content behalve h2 in een card-body div
        const body = document.createElement('div');
        body.className = 'card-body';
        Array.from(card.children).forEach(child => {
            if (child !== h2) body.appendChild(child);
        });
        card.appendChild(body);

        // Voeg toggle knop toe aan h2
        const btn = document.createElement('button');
        btn.className = 'btn-collapse';
        btn.textContent = '^';
        btn.setAttribute('aria-label', 'Inklappen');
        h2.appendChild(btn);

        // Toggle handler op de volledige h2
        h2.style.cursor = 'pointer';
        h2.addEventListener('click', () => {
            const isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : 'block';
            btn.textContent = isOpen ? 'v' : '^';
        });
    });
}