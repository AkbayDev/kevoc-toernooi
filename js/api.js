// ─── API Configuration & Shared Utilities ─────────────────────────────────────

export const CONFIG = {
    apiBaseUrl: '/api'
};

/**
 * Centralized fetch wrapper with JSON handling and error feedback.
 * @param {string} endpoint - API endpoint (e.g. '/ploegen')
 * @param {RequestInit} [options] - Fetch options (method, body, etc.)
 * @returns {Promise<any>} Parsed JSON response
 */
export async function apiRequest(endpoint, options = {}) {
    const url = `${CONFIG.apiBaseUrl}${endpoint}`;

    const defaults = {
        headers: { 'Content-Type': 'application/json' },
    };

    // Merge headers, but skip Content-Type for FormData
    if (options.body instanceof FormData) {
        delete defaults.headers['Content-Type'];
    }

    const config = {
        ...defaults,
        ...options,
        headers: {
            ...defaults.headers,
            ...options.headers,
        },
    };

    // Stringify body if it's an object (and not FormData)
    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.error || data.message || 'Er is iets misgegaan.');
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

/**
 * Escape HTML special characters to prevent XSS when using innerHTML.
 * @param {string} str - Raw string to escape
 * @returns {string} HTML-safe string
 */
export function escapeHtml(str) {
    if (str == null) return '';
    const s = String(str);
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return s.replace(/[&<>"']/g, c => map[c]);
}

/**
 * Format a date string for Dutch display.
 * @param {string} dateStr - Date string (ISO or other parseable format)
 * @returns {string} Formatted date like "25 mei 2026"
 */
export function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('nl-BE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

/**
 * Show a toast notification. Requires a .toast-container element in the DOM.
 * @param {string} message - Message to display
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Toast type
 * @param {number} [duration=3000] - Auto-dismiss time in ms
 */
export function showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

/**
 * Generate a reeks (series) badge HTML snippet.
 * @param {string} reeks - Series name
 * @returns {string} Badge HTML
 */
export function reeksBadge(reeks) {
    const safe = escapeHtml(reeks);
    const isSenior = reeks.toLowerCase().includes('senior');
    const kleur = isSenior ? 'var(--color-error)' : 'var(--color-brand)';
    return `<span class="badge-reeks" style="background:${kleur};color:white;padding:2px 8px;border-radius:6px;font-size:0.8em;">${safe}</span>`;
}