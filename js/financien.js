import { CONFIG } from './api.js';
import { currentRole } from './auth.js';

let financeChart;

async function laadFinancien() {
    if (currentRole !== 'beheerder') return;
    
    const chartCenterText = document.getElementById('chart-center-text');
    const financeChartCanvas = document.getElementById('financeChart');
    if (!chartCenterText || !financeChartCanvas) return;

    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/financien`);
        const data = await res.json();

        chartCenterText.textContent = `€ ${data.winst.toFixed(2)}`;
        chartCenterText.style.color = data.winst >= 0 ? '#27ae60' : '#e74c3c';

        const ctx = financeChartCanvas.getContext('2d');
        if (financeChart) {
            financeChart.data.datasets[0].data = [data.inkomsten, data.kosten];
            financeChart.update();
        } else {
            financeChart = new window.Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Inkomsten', 'Kosten'],
                    datasets: [{
                        data: [data.inkomsten, data.kosten],
                        backgroundColor: ['#27ae60', '#e74c3c'],
                        borderWidth: 0
                    }]
                },
                options: {
                    cutout: '75%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        }
    } catch (err) { console.error("Fout bij laden financiën:", err); }
}

async function laadTransacties() {
    const transactiesUl = document.getElementById('transacties-ul');
    if (!transactiesUl) return;
    try {
        const res = await fetch(`${CONFIG.apiBaseUrl}/transacties`);
        const data = await res.json();

        if (data.length === 0) {
            transactiesUl.innerHTML = '<li>Nog geen transacties.</li>';
            return;
        }

        transactiesUl.innerHTML = data.map(t => {
            const isKosten = t.type === 'kost';
            const teken = isKosten ? '-' : '+';
            const kleur = isKosten ? 'text-red' : 'text-green';
            return `<li class="transactie-item"><span>${t.omschrijving}</span> <span class="${kleur}">${teken} €${t.bedrag.toFixed(2)}</span></li>`;
        }).join('');
    } catch (err) { console.error("Fout bij laden transacties:", err); }
}

export function initFinancien() {
    laadFinancien();

    const formFinance = document.getElementById('form-finance');
    const financeMsg = document.getElementById('finance-msg');
    const transactiesLijst = document.getElementById('transacties-lijst');

    if (formFinance) {
        formFinance.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                omschrijving: document.getElementById('fin-omschrijving').value,
                bedrag: document.getElementById('fin-bedrag').value,
                type: document.getElementById('fin-type').value
            };

            if(financeMsg) { financeMsg.style.color = "#2980b9"; financeMsg.textContent = "Opslaan..."; }

            try {
                const res = await fetch(`${CONFIG.apiBaseUrl}/financien`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);

                if(financeMsg) { financeMsg.style.color = "#27ae60"; financeMsg.textContent = result.message; }
                formFinance.reset();
                laadFinancien();
                if (transactiesLijst && !transactiesLijst.classList.contains('hidden')) laadTransacties();
            } catch (err) {
                if(financeMsg) { financeMsg.style.color = "#e74c3c"; financeMsg.textContent = err.message; }
            } finally {
                if(financeMsg) setTimeout(() => financeMsg.textContent = "", 3000);
            }
        });
    }

    const btnToggleTransacties = document.getElementById('btn-toggle-transacties');
    if (btnToggleTransacties && transactiesLijst) {
        btnToggleTransacties.addEventListener('click', () => {
            const isHidden = transactiesLijst.classList.toggle('hidden');
            btnToggleTransacties.textContent = isHidden ? "Bekijk Alle Transacties" : "Verberg Transacties";
            if (!isHidden) laadTransacties();
        });
    }
}