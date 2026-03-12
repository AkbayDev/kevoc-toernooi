const CONFIG = {
    apiBaseUrl: 'http://127.0.0.1:5000/api'
};

export async function initWedstrijden() {
    const scoresBody = document.getElementById('scores-body');
    const scheidsContainer = document.getElementById('scheids-matches');
    const userRole = localStorage.getItem('userRole');

    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/rooster`);
        const matches = await res.json();

        // 1. Render Public Scoreboard
        if (scoresBody) {
            if (matches.length === 0) {
                scoresBody.innerHTML = '<tr><td colspan="3">Nog geen wedstrijden gepland.</td></tr>';
            } else {
                scoresBody.innerHTML = matches.map(m => {
                    const uitslag = (m.score_thuis !== null && m.score_uit !== null) 
                        ? `<strong>${m.score_thuis} - ${m.score_uit}</strong>` 
                        : '-';
                    
                    return `
                    <tr>
                        <td><small>${m.starttijd} (Veld ${m.veld})</small></td>
                        <td>${m.thuis_ploeg} vs ${m.uit_ploeg}</td>
                        <td>${uitslag}</td>
                    </tr>`;
                }).join('');
            }
        }

        // 2. Render Scheidsrechter Dashboard
        if (scheidsContainer && (userRole === 'hulp' || userRole === 'beheerder')) {
            // Filter only matches that have no score yet, or sort them to top? 
            // For now, show all sorted by time.
            scheidsContainer.innerHTML = matches.map(m => `
                <div class="match-card" style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:5px; background: #f9f9f9;">
                    <div style="font-weight:bold; margin-bottom:5px;">
                        ${m.starttijd} | Veld ${m.veld} | ${m.reeks}
                    </div>
                    <div style="margin-bottom:10px;">
                        ${m.thuis_ploeg} vs ${m.uit_ploeg}
                    </div>
                    <form class="score-form" data-id="${m.id}" style="display:flex; gap:10px; align-items:center;">
                        <input type="number" name="score_thuis" placeholder="Thuis" value="${m.score_thuis !== null ? m.score_thuis : ''}" style="width:60px; padding:5px;" required>
                        <span>-</span>
                        <input type="number" name="score_uit" placeholder="Uit" value="${m.score_uit !== null ? m.score_uit : ''}" style="width:60px; padding:5px;" required>
                        <button type="submit" class="btn-secondary" style="padding: 5px 10px;">Opslaan</button>
                    </form>
                </div>
            `).join('');

            // Attach Event Listeners
            document.querySelectorAll('.score-form').forEach(form => {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const id = form.getAttribute('data-id');
                    const thuis = form.querySelector('[name="score_thuis"]').value;
                    const uit = form.querySelector('[name="score_uit"]').value;
                    
                    try {
                        const postRes = await fetch(`${CONFIG.apiBaseUrl}/wedstrijden/${id}/score`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ score_thuis: parseInt(thuis), score_uit: parseInt(uit) })
                        });
                        
                        if (postRes.ok) {
                            alert('Score opgeslagen!');
                            // Reload to update UI
                            initWedstrijden();
                        } else {
                            alert('Fout bij opslaan.');
                        }
                    } catch (err) {
                        console.error(err);
                    }
                });
            });
        }

    } catch (err) { console.error("Fout bij laden wedstrijden:", err); }
}