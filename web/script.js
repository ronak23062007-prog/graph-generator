let chartInstance = null;

const THEMES = {
    light: { text: '#1f2937', grid: 'rgba(0,0,0,0.06)' },
    dark: { text: '#f3f4f6', grid: 'rgba(255,255,255,0.06)' }
};

const PALETTE = [
    { bg: 'rgba(99, 102, 241, 0.5)', border: '#6366f1' },  
    { bg: 'rgba(236, 72, 153, 0.5)', border: '#ec4899' },  
    { bg: 'rgba(16, 185, 129, 0.5)', border: '#10b981' },  
    { bg: 'rgba(245, 158, 11, 0.5)', border: '#f59e0b' },  
    { bg: 'rgba(139, 92, 246, 0.5)', border: '#8b5cf6' }   
];

let currentData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [{
        label: 'Revenue', data: [1500, 2300, 3200, 4100, 3800, 5000, 6200]
    }, {
        label: 'Expenses', data: [1200, 1800, 2100, 2500, 2800, 3400, 4100]
    }]
};

function renderChart() {
    const ctx = document.getElementById('myChart');
    if (chartInstance) chartInstance.destroy();
    
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const theme = isDark ? THEMES.dark : THEMES.light;
    const chartType = document.getElementById('chartType').value;
    const isFill = document.getElementById('fillGraph').checked;

    const datasets = currentData.datasets.map((ds, index) => {
        const colorSet = PALETTE[index % PALETTE.length];
        if (['pie', 'doughnut', 'polarArea'].includes(chartType)) {
            const bgColors = currentData.labels.map((_, i) => PALETTE[i % PALETTE.length].bg);
            const borders = currentData.labels.map((_, i) => PALETTE[i % PALETTE.length].border);
            return { ...ds, backgroundColor: bgColors, borderColor: borders, borderWidth: 1 };
        }
        // Optimize rendering footprint for massive real life csv files
        const ptRadius = currentData.labels.length > 300 ? 0 : (currentData.labels.length > 80 ? 1 : 4);
        const ptHover = currentData.labels.length > 300 ? 2 : 7;
        
        const curvature = parseFloat(document.getElementById('chartCurvature').value) || 0;
        return {
            ...ds, backgroundColor: colorSet.bg, borderColor: colorSet.border,
            borderWidth: 2, fill: isFill, tension: curvature, 
            pointBackgroundColor: colorSet.border, pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff', pointHoverBorderColor: colorSet.border,
            pointRadius: ptRadius, pointHoverRadius: ptHover
        };
    });

    const isRadial = ['pie', 'doughnut', 'polarArea', 'radar'].includes(chartType);

    chartInstance = new Chart(ctx, {
        type: chartType,
        data: { labels: currentData.labels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false, color: theme.text,
            plugins: {
                legend: { labels: { color: theme.text, font: { family: "'Inter', sans-serif", size: 13 } } },
                tooltip: {
                    mode: 'index', intersect: false,
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: isDark ? '#f3f4f6' : '#1f2937', bodyColor: isDark ? '#d1d5db' : '#4b5563',
                    borderColor: theme.grid, borderWidth: 1, padding: 12, boxPadding: 6, usePointStyle: true,
                    titleFont: { family: "'Inter', sans-serif", size: 14, weight: 'bold' },
                    bodyFont: { family: "'Inter', sans-serif", size: 13 }
                },
                zoom: { pan: { enabled: true, mode: 'xy' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' } }
            },
            scales: isRadial ? {} : {
                x: { grid: { color: theme.grid, drawBorder: false }, ticks: { color: theme.text, font: { family: "'Inter', sans-serif" } }, border: { display: false } },
                y: { grid: { color: theme.grid, drawBorder: false }, ticks: { color: theme.text, font: { family: "'Inter', sans-serif" } }, border: { display: false } }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            animation: { duration: 1200, easing: 'easeOutQuart' }
        }
    });
}

document.getElementById('btn-mock').addEventListener('click', () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const count = Math.floor(Math.random() * 8) + 5; 
    let labels = [];
    for(let i = 0; i < count; i++) labels.push(months[i % 12] + (i >= 12 ? ' (Next)' : ''));
    currentData = {
        labels: labels,
        datasets: [
            { label: 'Series Alpha', data: labels.map(() => Math.floor(Math.random() * 5000) + 500) },
            { label: 'Series Beta', data: labels.map(() => Math.floor(Math.random() * 5000) + 500) }
        ]
    };
    document.getElementById('csv-status').style.display = 'none';
    renderChart();
});

document.getElementById('btn-upload').addEventListener('click', async () => {
    const btn = document.getElementById('btn-upload');
    const originalText = btn.innerHTML;
    if (typeof eel !== 'undefined') {
        btn.innerHTML = '⏳ Processing...';
        try {
            const respStr = await eel.open_file_dialog()();
            const response = JSON.parse(respStr);
            if (response.status === 'success') {
                currentData = { labels: response.labels, datasets: response.datasets };
                document.getElementById('csv-status').style.display = 'block';
                document.getElementById('csv-filename').innerText = response.filename;
                renderChart();
            } else if (response.status === 'error') alert("Error loading CSV: " + response.message);
        } catch(e) { console.error(e); alert("Error communicating with Python"); } 
        finally { btn.innerHTML = originalText; }
    } else alert("Python Eel bridge is not ready. Are you running from main.py?");
});

const tfUpdate = () => { renderChart(); };
document.getElementById('chartType').addEventListener('change', tfUpdate);
document.getElementById('fillGraph').addEventListener('change', tfUpdate);
document.getElementById('chartCurvature').addEventListener('input', tfUpdate);

document.getElementById('btn-export').addEventListener('click', () => {
    const canvas = document.getElementById('myChart');
    if (!canvas) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = isDark ? '#1a1a2e' : '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    link.download = `GraphStudio_${document.getElementById('chartType').value}_chart.png`;
    link.href = tempCanvas.toDataURL('image/png', 1.0);
    link.click();
});

const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    themeToggle.innerText = newTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    renderChart();
});

const modal = document.getElementById('dataModal');
const btnManual = document.getElementById('btn-manual');
const btnCloseModal = document.getElementById('btn-close-modal');
const dtBody = document.getElementById('dt-body');
const dtHeadRow = document.getElementById('dt-head-row');

btnManual.addEventListener('click', () => {
    modal.classList.remove('hidden');
    if(dtBody.children.length === 0) { for(let i=0; i<4; i++) addRow(); }
});

btnCloseModal.addEventListener('click', () => modal.classList.add('hidden'));

function addRow() {
    let tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="text" placeholder="Cat ${dtBody.children.length+1}" class="cell-label"></td>`;
    for(let i=1; i<dtHeadRow.children.length; i++) tr.innerHTML += `<td><input type="number" placeholder="0" class="cell-data"></td>`;
    dtBody.appendChild(tr);
}

document.getElementById('btn-add-row').addEventListener('click', addRow);
document.getElementById('btn-add-col').addEventListener('click', () => {
    let th = document.createElement('th');
    th.innerHTML = `<input type="text" value="Dataset ${dtHeadRow.children.length}" class="cell-header">`;
    dtHeadRow.appendChild(th);
    Array.from(dtBody.children).forEach(tr => {
        let td = document.createElement('td');
        td.innerHTML = `<input type="number" placeholder="0" class="cell-data">`;
        tr.appendChild(td);
    });
});

document.getElementById('btn-apply-data').addEventListener('click', () => {
    let labels = [];
    Array.from(dtBody.children).forEach(tr => {
        let val = tr.querySelector('.cell-label').value;
        labels.push(val ? val : `Cat ${labels.length+1}`);
    });
    let datasets = [];
    for(let i=1; i<dtHeadRow.children.length; i++) {
        let thInput = dtHeadRow.children[i].querySelector('input');
        let dsName = thInput ? thInput.value : `Dataset ${i}`;
        let dataTokens = Array.from(dtBody.children).map(tr => {
            let cells = tr.querySelectorAll('.cell-data');
            let cell = cells[i-1];
            if (!cell) return 0;
            let rawStr = cell.value.replace(',', '.');
            let num = parseFloat(rawStr);
            return isNaN(num) ? 0 : num;
        });
        datasets.push({ label: dsName, data: dataTokens });
    }
    currentData = { labels, datasets };
    document.getElementById('csv-status').style.display = 'block';
    
    const csvFileNameEl = document.getElementById('csv-filename');
    if(csvFileNameEl) csvFileNameEl.innerText = "Manual Data 🖋️";
    
    renderChart();
    modal.classList.add('hidden');
});

document.addEventListener("DOMContentLoaded", () => { setTimeout(renderChart, 100); });
