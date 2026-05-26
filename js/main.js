import { checkAuth, initAuthUI, currentRole } from './auth.js';
import { initFinancien } from './financien.js';
import { initPloegen } from './ploegen.js';
import { initVrijwilligers } from './vrijwilligers.js';
import { initRooster } from './rooster.js';
import { initWerkrooster } from './werkrooster.js';
import { initWedstrijden } from './wedstrijden.js';
import { initActies } from './acties.js';
import { initReeksen } from './reeksen.js';

// ─── Section registry — maps role visibility to init functions ───────────────
const SECTION_MODULES = [
    { init: initWedstrijden, roles: 'all' },
    { init: initPloegen,     roles: 'all' },
    { init: initReeksen,     roles: 'all' },
    { init: initVrijwilligers, roles: 'all' },
    { init: initRooster,     roles: 'all' },
    { init: initWerkrooster, roles: 'beheerder' },
    { init: initActies,      roles: 'beheerder' },
    { init: initFinancien,   roles: 'beheerder' },
];

// ─── Navigation config ──────────────────────────────────────────────────────
const NAV_SECTIES = [
    { label: 'Scores',            href: '#scores',                  role: 'all',              icon: 'scores' },
    { label: 'Scheids',           href: '#scheids-dashboard',       role: 'scheids,beheerder', icon: 'whistle' },
    { label: 'Ploegen',           href: '#ploeg-inschrijven',       role: 'gebruiker',        icon: 'team' },
    { label: 'Ploegen',           href: '#ploegen-overzicht',       role: 'beheerder,hulp',   icon: 'team' },
    { label: 'Vrijwilliger',      href: '#hulp-inschrijven',        role: 'gebruiker',        icon: 'hand' },
    { label: 'Vrijw. Overzicht',  href: '#vrijwilligers-overzicht', role: 'beheerder',        icon: 'list' },
    { label: 'Schema',            href: '#toernooi-dashboard',      role: 'all',              icon: 'calendar' },
    { label: 'Werkrooster',       href: '#werkrooster',             role: 'beheerder',        icon: 'clock' },
    { label: 'Acties',            href: '#acties',                  role: 'beheerder',        icon: 'tasks' },
    { label: 'Reeksen',           href: '#reeksen-beheer',          role: 'beheerder',        icon: 'layers' },
    { label: 'Betaaloverzicht',   href: '#financien',               role: 'beheerder',        icon: 'finance' },
];

// Inline SVG icons — tiny, self-coded, no library
const NAV_ICONS = {
    scores:   '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12L6 4l4 6 4-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    whistle:  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="10" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M9 7l5-5M10 4h4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    team:     '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    hand:     '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 5v5a3 3 0 006 0V5M3 7v3a5 5 0 0010 0V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    list:     '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 4h9M5 8h9M5 12h9M2 4h.01M2 8h.01M2 12h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    calendar: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 7h12M5 1v4M11 1v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    clock:    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 4v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tasks:    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    layers:   '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L2 6l6 4 6-4-6-4zM2 10l6 4 6-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    finance:  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M11 4H6.5a2.5 2.5 0 000 5h3a2.5 2.5 0 010 5H5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const BEHEERDER_ROLLEN = ['beheerder', 'dev'];
const HULP_ROLLEN = ['hulp', 'scheids', 'beheerder', 'dev'];

// ─── Role visibility check ──────────────────────────────────────────────────
function isZichtbaar(role) {
    const vereist = role.split(',').map(r => r.trim());
    if (vereist.includes('all')) return true;
    if (vereist.includes(currentRole)) return true;
    if (vereist.includes('beheerder') && BEHEERDER_ROLLEN.includes(currentRole)) return true;
    if (vereist.includes('hulp') && HULP_ROLLEN.includes(currentRole)) return true;
    return false;
}

// ─── App entry point ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    initNav();

    await initAuthUI();

    // Sync mobile user display
    const userDisplay = document.getElementById('user-display');
    const mobileUserDisplay = document.getElementById('mobile-user-display');
    if (userDisplay && mobileUserDisplay) {
        mobileUserDisplay.textContent = userDisplay.textContent;
    }

    // Wire up mobile logout
    const mobileLogout = document.getElementById('mobile-logout-btn');
    if (mobileLogout) {
        mobileLogout.addEventListener('click', () => {
            localStorage.removeItem('userRole');
            localStorage.removeItem('userEmail');
            window.location.replace('index.html');
        });
    }

    // Hide export buttons for non-admins
    if (!BEHEERDER_ROLLEN.includes(currentRole)) {
        document.querySelectorAll('.export-beheerder').forEach(el => el.classList.add('hidden'));
    }

    initCollapsible();
    initTabSystem();

    SECTION_MODULES.forEach(({ init, roles }) => {
        if (roles === 'all' || roles.split(',').some(r => {
            const rt = r.trim();
            if (rt === currentRole) return true;
            if (rt === 'beheerder' && BEHEERDER_ROLLEN.includes(currentRole)) return true;
            return false;
        })) {
            init();
        }
    });
});

// ─── Navigation builder ─────────────────────────────────────────────────────
function initNav() {
    const zichtbaar = NAV_SECTIES.filter(s => isZichtbaar(s.role));
    const desktopUl = document.getElementById('nav-links');
    const mobileUl  = document.getElementById('mobile-nav-links');

    if (!desktopUl || !mobileUl) return;

    // Desktop: show first 4 items directly, rest in a dropdown
    const direct = zichtbaar.slice(0, 4);
    const meer   = zichtbaar.slice(4);

    desktopUl.innerHTML = '';

    direct.forEach(s => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = s.href;
        a.className = 'nav-link';
        a.dataset.section = s.href.slice(1);
        a.textContent = s.label;
        li.appendChild(a);
        desktopUl.appendChild(li);
    });

    if (meer.length > 0) {
        const li = document.createElement('li');
        li.className = 'nav-dropdown-wrapper';
        li.innerHTML = `
            <button class="nav-link nav-dropdown-trigger" id="nav-meer-btn">
                Meer
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <ul class="nav-dropdown" id="nav-dropdown">
                ${meer.map(s => `<li><a href="${s.href}" class="nav-dropdown-item nav-link" data-section="${s.href.slice(1)}">${NAV_ICONS[s.icon] || ''}${s.label}</a></li>`).join('')}
            </ul>
        `;
        desktopUl.appendChild(li);

        const btn = li.querySelector('#nav-meer-btn');
        const dropdown = li.querySelector('#nav-dropdown');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('is-open');
            dropdown.classList.toggle('is-open', !isOpen);
            btn.classList.toggle('is-open', !isOpen);
        });

        dropdown.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                dropdown.classList.remove('is-open');
                btn.classList.remove('is-open');
            });
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('is-open');
            btn.classList.remove('is-open');
        });
    }

    // Mobile drawer: full list with icons
    mobileUl.innerHTML = '';
    zichtbaar.forEach(s => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = s.href;
        a.className = 'drawer-link';
        a.dataset.section = s.href.slice(1);
        a.innerHTML = `<span class="drawer-link-icon">${NAV_ICONS[s.icon] || ''}</span>${s.label}`;
        a.addEventListener('click', () => closeDrawer());
        li.appendChild(a);
        mobileUl.appendChild(li);
    });

    // Hamburger / drawer logic
    const hamburger = document.getElementById('hamburger-btn');
    const overlay   = document.getElementById('drawer-overlay');
    const closeBtn  = document.getElementById('drawer-close');
    const drawer    = document.getElementById('mobile-drawer');

    hamburger.addEventListener('click', () => {
        const isOpen = drawer.classList.contains('is-open');
        if (isOpen) closeDrawer(); else openDrawer();
    });

    overlay.addEventListener('click', closeDrawer);
    closeBtn.addEventListener('click', closeDrawer);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
    });
}

function openDrawer() {
    const drawer  = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const btn     = document.getElementById('hamburger-btn');
    drawer.classList.add('is-open');
    overlay.classList.add('is-visible');
    btn.classList.add('is-active');
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    const drawer  = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const btn     = document.getElementById('hamburger-btn');
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    btn.classList.remove('is-active');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}

// ─── SPA Tab Switching System ────────────────────────────────────────────────
function initTabSystem() {
    function handleTabChange() {
        let hash = window.location.hash.slice(1);
        let targetSection = document.getElementById(hash);

        // Fallback: If no hash or section does not exist or section is role-hidden
        if (!hash || !targetSection || targetSection.classList.contains('hidden')) {
            // Find first navigation link that is not hidden (visible for current role)
            const firstVisibleLink = document.querySelector('.nav-link[data-section]:not(.hidden), .drawer-link[data-section]:not(.hidden)');
            if (firstVisibleLink) {
                hash = firstVisibleLink.dataset.section;
                window.location.hash = hash;
                return;
            } else {
                hash = 'scores';
            }
        }

        showSection(hash);
    }

    // Intercept clicks on links that lead to tabs
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        
        const href = link.getAttribute('href');
        const targetId = href.slice(1);
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
            e.preventDefault();
            window.location.hash = targetId;
        }
    });

    window.addEventListener('hashchange', handleTabChange);
    
    // Initial load
    handleTabChange();
}

function showSection(targetId) {
    const targetSection = document.getElementById(targetId);
    if (!targetSection) return;

    // 1. Hide all other dashboard sections smoothly
    const cards = document.querySelectorAll('.dash-card');
    cards.forEach(card => {
        card.classList.remove('is-visible');
        card.classList.remove('is-active');
    });

    // 2. Show the targeted section
    targetSection.classList.add('is-active');
    // Force browser reflow to trigger CSS transitions
    targetSection.offsetHeight;
    targetSection.classList.add('is-visible');

    // 3. Highlight the active navigation links across desktop & mobile
    const allLinks = document.querySelectorAll('[data-section]');
    allLinks.forEach(l => {
        const isActive = l.dataset.section === targetId;
        l.classList.toggle('is-active', isActive);
        
        // Also toggle active state for parent dropdown wrappers if applicable
        if (isActive) {
            const dropdown = l.closest('.nav-dropdown');
            if (dropdown) {
                const trigger = dropdown.parentElement.querySelector('.nav-dropdown-trigger');
                if (trigger) trigger.classList.add('is-active');
            }
        } else {
            // If it is not active, check if any of its siblings are active
            const dropdown = l.closest('.nav-dropdown');
            if (dropdown) {
                const trigger = dropdown.parentElement.querySelector('.nav-dropdown-trigger');
                if (trigger) {
                    const anyActive = dropdown.querySelectorAll('.nav-link.is-active').length > 0;
                    trigger.classList.toggle('is-active', anyActive);
                }
            }
        }
    });
}

// ─── Collapsible cards with smooth height animation ─────────────────────────
function initCollapsible() {
    document.querySelectorAll('.dash-card').forEach(card => {
        const h2 = card.querySelector('h2');
        if (!h2) return;

        // Wrap all non-h2 children into a card-body div
        const body = document.createElement('div');
        body.className = 'card-body';
        Array.from(card.children).forEach(child => {
            if (child !== h2) body.appendChild(child);
        });
        card.appendChild(body);

        // Create chevron button
        const btn = document.createElement('button');
        btn.className = 'btn-collapse';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        btn.setAttribute('aria-label', 'Inklappen');
        h2.appendChild(btn);

        h2.style.cursor = 'pointer';
        let isOpen = true;

        h2.addEventListener('click', () => {
            isOpen = !isOpen;
            if (isOpen) {
                // Expand
                body.style.display = '';
                body.style.maxHeight = body.scrollHeight + 'px';
                body.style.opacity = '1';
                btn.style.transform = '';
                btn.setAttribute('aria-label', 'Inklappen');
                // Clear maxHeight after transition to allow dynamic content
                setTimeout(() => { body.style.maxHeight = ''; }, 300);
            } else {
                // Collapse — first set explicit height, then animate to 0
                body.style.maxHeight = body.scrollHeight + 'px';
                body.offsetHeight; // force reflow
                body.style.maxHeight = '0';
                body.style.opacity = '0';
                btn.style.transform = 'rotate(-90deg)';
                btn.setAttribute('aria-label', 'Uitklappen');
            }
        });
    });
}