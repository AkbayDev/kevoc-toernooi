import { checkAuth, initAuthUI, currentRole } from './auth.js';
import { initFinancien } from './financien.js';
import { initPloegen } from './ploegen.js';
import { initVrijwilligers } from './vrijwilligers.js';
import { initRooster } from './rooster.js';
import { initWerkrooster } from './werkrooster.js';
import { initWedstrijden } from './wedstrijden.js';
import { initActies } from './acties.js';
import { initReeksen } from './reeksen.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Controleer of de gebruiker is ingelogd (anders direct terug naar login)
    if (!checkAuth()) return;

    // 2. Navigatie opbouwen op basis van rol — vóór initAuthUI()
    initNav();

    // 3. Initialiseer de interface (toon naam & verberg kaarten o.b.v. rol)
    initAuthUI();

    // 4. Start alle functionele modules
    initFinancien();
    initPloegen();
    initReeksen();
    initVrijwilligers();
    initRooster();
    initWerkrooster();
    initWedstrijden();
    initActies();

    // 5. Inklapbare cards — altijd als laatste zodat auth.js al klaar is
    initCollapsible();
});

function initNav() {
    const NAV_SECTIES = [
        { label: 'Scores',              href: '#scores',                   role: 'all' },
        { label: 'Scheids Dashboard',   href: '#scheids-dashboard',        role: 'scheids,beheerder' },
        { label: 'Ploegen',             href: '#ploeg-inschrijven',        role: 'gebruiker' },
        { label: 'Vrijwilliger',        href: '#hulp-inschrijven',         role: 'gebruiker' },
        { label: 'Overzicht Vrijw.',    href: '#vrijwilligers-overzicht',  role: 'beheerder' },
        { label: 'Werk Rooster',        href: '#werkrooster',              role: 'hulp' },
        { label: 'Toernooi Schema',     href: '#toernooi-dashboard',       role: 'all' },
        { label: 'Werkrooster Inpl.',   href: '#werkrooster-sectie',       role: 'beheerder' },
        { label: 'Checklist',           href: '#checklist',                role: 'beheerder' },
        { label: 'Acties',              href: '#acties',                   role: 'beheerder' },
        { label: 'Actieve Reeksen',     href: '#reeksen-beheer',           role: 'beheerder' },
        { label: 'Betaaloverzicht',     href: '#financien',                role: 'beheerder' },
    ];

    function isZichtbaar(role) {
        const vereist = role.split(',').map(r => r.trim());
        const BEHEERDER_ROLLEN = ['beheerder', 'dev'];
        const HULP_ROLLEN = ['hulp', 'scheids', 'beheerder', 'dev'];
        if (vereist.includes('all')) return true;
        if (vereist.includes(currentRole)) return true;
        if (vereist.includes('beheerder') && BEHEERDER_ROLLEN.includes(currentRole)) return true;
        if (vereist.includes('hulp') && HULP_ROLLEN.includes(currentRole)) return true;
        return false;
    }

    const zichtbaar = NAV_SECTIES.filter(s => isZichtbaar(s.role));
    const direct    = zichtbaar.slice(0, 3);
    const meer      = zichtbaar.slice(3);
    const ul        = document.getElementById('nav-links');
    if (!ul) return;

    ul.innerHTML = '';

    direct.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${s.href}">${s.label}</a>`;
        ul.appendChild(li);
    });

    if (meer.length > 0) {
        const li = document.createElement('li');
        li.style.position = 'relative';
        li.innerHTML = `
            <button id="nav-meer-btn">Meer ▾</button>
            <ul id="nav-dropdown">
                ${meer.map(s => `<li><a href="${s.href}">${s.label}</a></li>`).join('')}
            </ul>
        `;
        ul.appendChild(li);

        const btn      = li.querySelector('#nav-meer-btn');
        const dropdown = li.querySelector('#nav-dropdown');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.style.display === 'block';
            dropdown.style.display = isOpen ? 'none' : 'block';
        });

        dropdown.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                dropdown.style.display = 'none';
            });
        });

        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
    }
}

function initCollapsible() {
    document.querySelectorAll('.dash-card').forEach(card => {
        const h2 = card.querySelector('h2');
        if (!h2) return;

        const body = document.createElement('div');
        body.className = 'card-body';
        Array.from(card.children).forEach(child => {
            if (child !== h2) body.appendChild(child);
        });
        card.appendChild(body);

        const btn = document.createElement('button');
        btn.className = 'btn-collapse';
        btn.textContent = '^';
        btn.setAttribute('aria-label', 'Inklappen');
        h2.appendChild(btn);

        h2.style.cursor = 'pointer';
        h2.addEventListener('click', () => {
            const isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : 'block';
            btn.textContent = isOpen ? 'v' : '^';
        });
    });
}