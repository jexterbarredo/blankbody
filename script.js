const b_wien = 2898;
const sigma = 5.67e-8;
let myChart;
let currentTemperature = 5800;

const themeToggle = document.getElementById('theme-toggle');
const lightIcon = document.getElementById('theme-icon-light');
const darkIcon = document.getElementById('theme-icon-dark');

const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    lightIcon.classList.toggle('hidden', theme === 'dark');
    darkIcon.classList.toggle('hidden', theme !== 'dark');
    if (myChart) {
        const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const fontColor = theme === 'dark' ? '#9CA3AF' : '#6C757D';
        myChart.options.scales.x.grid.color = gridColor;
        myChart.options.scales.y.grid.color = gridColor;
        myChart.options.scales.x.ticks.color = fontColor;
        myChart.options.scales.y.ticks.color = fontColor;
        myChart.options.scales.x.title.color = fontColor;
        myChart.options.scales.y.title.color = fontColor;
        updateDisplay({ temp: currentTemperature, ...getCustomBodyProfile(currentTemperature), observation: 'A custom body at this temperature.' });
    }
};

themeToggle.addEventListener('click', () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
});

const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const blackbodyData = {
    'Earth': { temp: 250, icon: '🌍', observation: "Emits in the infrared range, radiating heat but producing no visible light.", bgImage: 'url(https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=2070&auto=format&fit=crop)' },
    'Light Bulb': { temp: 3000, icon: '💡', observation: "Most radiation is infrared (heat), making incandescent bulbs inefficient.", bgImage: 'url(https://images.unsplash.com/photo-1547483238-f400e65cceb2?q=80&w=1974&auto=format&fit=crop)' },
    'Sun': { temp: 5800, icon: '☀️', observation: "Emission peaks in the visible spectrum, appearing white to our eyes.", bgImage: 'url(https://images.unsplash.com/photo-1622521926312-347c43231362?q=80&w=2070&auto=format&fit=crop)' },
    'Sirius A': { temp: 9850, icon: '⭐', observation: "A hot, massive star that emits strongly in the UV and blue part of the spectrum.", bgImage: 'url(https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2071&auto=format&fit=crop)' }
};

const MIN_TEMP = 250, MAX_TEMP = 12000, SLIDER_MIN = 0, SLIDER_MAX = 1000;
const MIN_LOG_TEMP = Math.log(MIN_TEMP), MAX_LOG_TEMP = Math.log(MAX_TEMP);
const LOG_SCALE = (MAX_LOG_TEMP - MIN_LOG_TEMP) / (SLIDER_MAX - SLIDER_MIN);

const tempToSliderVal = (temp) => SLIDER_MIN + (Math.log(temp) - MIN_LOG_TEMP) / LOG_SCALE;
const sliderValToTemp = (val) => Math.exp(MIN_LOG_TEMP + (val - SLIDER_MIN) * LOG_SCALE);

const getCustomBodyProfile = (temp) => {
    if (temp < 400) return { objectName: "Cold Object", icon: '🪐' };
    if (temp < 2500) return { objectName: "Red Dwarf Star", icon: '🔴' };
    if (temp < 5000) return { objectName: "Orange Giant", icon: '🟠' };
    if (temp < 8000) return { objectName: "Sun-like Star", icon: '☀️' };
    return { objectName: "Blue Giant Star", icon: '🔵' };
};

const getColorForTemp = (temp) => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (temp < 2500) return isDark ? '#ff8a80' : '#d32f2f'; // Red
    if (temp < 5000) return isDark ? '#ffb74d' : '#f57c00'; // Orange
    if (temp < 8000) return isDark ? '#f5f5f5' : '#424242'; // White / Grey
    return isDark ? '#82b1ff' : '#1976d2'; // Blue
};

const getSpectralRegion = (wl) => {
    if (wl < 0.4) return "Ultraviolet"; if (wl <= 0.75) return "Visible"; if (wl <= 2.5) return "Near Infrared"; return "Infrared";
};

const formatIntensity = (value) => {
    const units = [' W/m²', ' kW/m²', ' MW/m²', ' GW/m²', ' TW/m²'];
    if (value < 1) return `${value.toFixed(2)}${units[0]}`;
    const i = Math.floor(Math.log10(value) / 3);
    return `${(value / Math.pow(1000, i)).toFixed(2)}${units[i]}`;
};

const getPowerDescription = (power) => {
    if (power < 1000) return "Radiates very little energy, invisible to the naked eye.";
    if (power < 1e6) return "Begins to glow dimly, like a hot stove element.";
    if (power < 5e7) return "Shines brightly, similar to an incandescent light bulb.";
    if (power < 1e8) return "Extremely luminous, like the surface of our Sun.";
    return "Intensely powerful, far exceeding the Sun's radiance.";
};

const plancksLaw = (wav_um, temp) => {
    const h = 6.626e-34, c = 3.0e8, k = 1.38e-23; const wav_m = wav_um * 1e-6;
    const a = (2 * Math.PI * h * c * c) / Math.pow(wav_m, 5); const b = h * c / (wav_m * k * temp);
    return a / (Math.exp(b) - 1);
};

const infoPanel = document.getElementById('info-panel');
const peakLine = document.getElementById('peak-line');
const peakLabel = document.getElementById('peak-label');

function updateDisplay(config) {
    const { objectName, icon, temp, observation } = config;
    currentTemperature = temp;
    const peak_wl = b_wien / temp;
    const totalPower = sigma * Math.pow(temp, 4);
    const spectral_region = getSpectralRegion(peak_wl);
    const x_max = Math.min(30, Math.max(1.5, peak_wl * 5));

    infoPanel.innerHTML = `
        <div class="info-panel-content">
            <div class="text-center lg:text-left mb-6"><h2 class="text-3xl font-bold flex items-center justify-center lg:justify-start gap-3"><span class="text-4xl">${icon}</span><span>${objectName}</span></h2></div>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="stat-card"><p class="text-sm text-[color:var(--text-secondary)]">Temperature</p><p class="text-2xl font-semibold text-[color:var(--accent-primary)]">${Math.round(temp).toLocaleString()} K</p></div>
                <div class="stat-card"><p class="text-sm text-[color:var(--text-secondary)]">Peak λ</p><p class="text-2xl font-semibold text-[color:var(--accent-primary)]">${peak_wl.toFixed(2)} μm</p></div>
                <div class="stat-card"><p class="text-sm text-[color:var(--text-secondary)]">Peak Region</p><p class="text-2xl font-semibold text-[color:var(--accent-primary)]">${spectral_region}</p></div>
                <div class="stat-card"><p class="text-sm text-[color:var(--text-secondary)]">Total Power</p><p class="text-2xl font-semibold text-[color:var(--accent-primary)]">${formatIntensity(totalPower)}</p></div>
            </div>
            <div class="mt-4 text-center lg:text-left"><p class="italic" style="color: var(--text-secondary);">&ldquo;${observation}&rdquo;</p></div>
        </div>`;
    infoPanel.querySelector('.info-panel-content').classList.add('fade-in');

    if (window.MathJax) { MathJax.typesetPromise(); }

    const spectrumData = Array.from({length: 200}, (_, i) => { const wav = ((i + 1) / 200) * x_max; return {x: wav, y: plancksLaw(wav, temp) / 1e6}; });
    const chartColor = getColorForTemp(temp);
    myChart.data.datasets[0].data = spectrumData;
    myChart.data.datasets[0].borderColor = chartColor;
    myChart.data.datasets[0].backgroundColor = chartColor.includes('rgba') ? chartColor.replace(/, [0-9.]+\)/, ', 0.1)') : chartColor + '1A';
    myChart.options.scales.x.max = x_max;
    myChart.options.scales.y.max = Math.max(...spectrumData.map(p => p.y)) * 1.1 || 1;
    myChart.update('none');

    if (myChart.chartArea) { peakLine.style.left = `${myChart.chartArea.left + (peak_wl / x_max) * myChart.chartArea.width}px`; }
    peakLabel.textContent = `λmax: ${peak_wl.toFixed(2)} μm`;

    const specContainer = document.getElementById('visible-spectrum-container');
    specContainer.innerHTML = `<div class="visible-spectrum-bar" style="margin-left: ${(0.4 / x_max) * 100}%; width: ${(0.35 / x_max) * 100}%;"></div>`;
}

const tempSlider = document.getElementById('temp-slider');
const tempOutput = document.getElementById('temp-output');

function updateView(objectName) {
    const data = blackbodyData[objectName];
    updateDisplay({ ...data, objectName });
    tempSlider.value = tempToSliderVal(data.temp);
    tempOutput.textContent = `${data.temp.toLocaleString()} K`;
    document.querySelectorAll('#controls button').forEach(btn => btn.classList.toggle('active-btn', btn.dataset.object === objectName));
}

function handleSliderInput() {
    const temp = sliderValToTemp(parseInt(tempSlider.value));
    tempOutput.textContent = `${Math.round(temp).toLocaleString()} K`;
    document.querySelectorAll('#controls button').forEach(btn => btn.classList.remove('active-btn'));
    updateDisplay({ temp, ...getCustomBodyProfile(temp), observation: 'A custom body at this temperature.' });
}

const wienInput = document.getElementById('wien-temp-input');
const wienOutput = document.getElementById('wien-output');
const wienDesc = document.getElementById('wien-desc');
const stefanInput = document.getElementById('stefan-temp-input');
const stefanOutput = document.getElementById('stefan-output');
const stefanDesc = document.getElementById('stefan-desc');

function handleWienCalc() {
    const temp = parseFloat(wienInput.value);
    if (!isNaN(temp) && temp > 0) {
        const lambdaMax = b_wien / temp;
        wienOutput.textContent = `λ_max ≈ ${lambdaMax.toFixed(2)} μm`;
        wienDesc.textContent = `This is in the ${getSpectralRegion(lambdaMax)} spectrum.`;
    } else { wienOutput.textContent = 'Invalid Temp'; wienDesc.textContent = '';}
}

function handleStefanCalc() {
    const temp = parseFloat(stefanInput.value);
    if (!isNaN(temp) && temp >= 0) {
        const power = sigma * Math.pow(temp, 4);
        stefanOutput.textContent = `P/A ≈ ${formatIntensity(power)}`;
        stefanDesc.textContent = getPowerDescription(power);
    } else { stefanOutput.textContent = 'Invalid Temp'; stefanDesc.textContent = ''; }
}

function init() {
    const controlsContainer = document.getElementById('controls');
    Object.keys(blackbodyData).forEach(name => {
        const data = blackbodyData[name];
        const button = document.createElement('button');
        button.dataset.object = name;
        button.className = 'control-btn';
        button.innerHTML = `<span class="mr-2">${data.icon}</span> ${name}`;
        button.style.backgroundImage = data.bgImage;
        button.onclick = () => updateView(name);
        controlsContainer.appendChild(button);
    });

    tempSlider.addEventListener('input', handleSliderInput);
    wienInput.addEventListener('input', handleWienCalc);
    stefanInput.addEventListener('input', handleStefanCalc);

    const ctx = document.getElementById('blackbodyChart').getContext('2d');
    myChart = new Chart(ctx, { type: 'line', data: { datasets: [{ label: 'Spectral Intensity', data: [], borderWidth: 3, pointRadius: 0, fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false,
            scales: {
                x: { type: 'linear', position: 'bottom', min: 0, title: { display: true, text: 'Wavelength (μm)', font: { size: 14 } } },
                y: { type: 'linear', beginAtZero: true, title: { display: true, text: 'Spectral Radiance (MW/m²/sr/μm)', font: { size: 14 } } }
            },
            plugins: { legend: { display: false }, tooltip: { enabled: true, mode: 'index', intersect: false, callbacks: {
                title: (items) => `Wavelength: ${items[0].parsed.x.toFixed(2)} μm`,
                label: (item) => `Intensity: ${item.parsed.y.toExponential(2)} MW`
            }}}, layout: { padding: { bottom: 10 } }
        }
    });

    applyTheme(savedTheme);
    updateView('Sun');
    handleWienCalc();
    handleStefanCalc();
    
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZoneName: 'short' };
    document.getElementById('session-details').innerHTML = `<strong>Session Details:</strong> Logged on ${now.toLocaleDateString('en-US', options)}.`;
}

window.onload = init;
