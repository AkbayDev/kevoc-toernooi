import { checkAuth, initAuthUI } from './auth.js';
import { initFinancien } from './financien.js';
import { initPloegen } from './ploegen.js';
import { initVrijwilligers } from './vrijwilligers.js';
import { initRooster } from './rooster.js';
import { initWerkrooster } from './werkrooster.js';
import { initWedstrijden } from './wedstrijden.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Controleer of de gebruiker is ingelogd (anders direct terug naar login)
    if (!checkAuth()) return;

    // 2. Initialiseer de interface (toon naam & verberg kaarten  rol)
    initAuthUI();

    // 3. Start alle functionele modules
    initFinancien();
    initPloegen();
    initVrijwilligers();
    initRooster();
    initWerkrooster();
    initWedstrijden();
});