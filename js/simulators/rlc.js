document.addEventListener('DOMContentLoaded', function() {
    // Simulator State
    const state = {
        R: 100,
        L: 1.0,
        C: 47,
        V: 10,
        Freq: 60,
        Source: 'DC',
        Config: 'Serie'
    };

    // Elements
    const rSlider = document.getElementById('param_r');
    const lSlider = document.getElementById('param_l');
    const cSlider = document.getElementById('param_c');
    const vSlider = document.getElementById('param_v');
    const fSlider = document.getElementById('param_f');
    const sourceType = document.getElementById('source_type');
    const configType = document.getElementById('config_type');
    const freqControl = document.getElementById('freq_control');
    
    const valR = document.getElementById('val-r');
    const valL = document.getElementById('val-l');
    const valC = document.getElementById('val-c');
    const valV = document.getElementById('val-v');
    const valF = document.getElementById('val-f');

    const metricW0 = document.getElementById('metric-w0');
    const metricAlpha = document.getElementById('metric-alpha');
    const metricZeta = document.getElementById('metric-zeta');
    const metricType = document.getElementById('metric-type');
    const resonanceFreq = document.getElementById('resonance-freq');
    const resonanceIndicator = document.getElementById('resonance-indicator');
    const circuitDiagram = document.getElementById('circuit-diagram');

    // Chart Setup
    const ctx = document.getElementById('rlcChart').getContext('2d');
    
    const rlcChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Entrada (V)',
                    data: [],
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    yAxisID: 'y'
                },
                {
                    label: 'Voltaje Capacitor Vc(t)',
                    data: [],
                    borderColor: '#448aff',
                    borderWidth: 3,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y'
                },
                {
                    label: 'Corriente I(t)',
                    data: [],
                    borderColor: '#FFC107', // Amber for current
                    borderWidth: 3,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            interaction: { intersect: false, mode: 'index' },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Tiempo (s)', color: '#90a4ae' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#b0bec5' },
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Voltaje (V)', color: '#448aff' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#448aff' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Corriente (A)', color: '#FFC107' },
                    grid: { drawOnChartArea: false }, // Only grid for left axis
                    ticks: { color: '#FFC107' }
                }
            },
            plugins: {
                legend: { labels: { color: '#ffffff' } },
                tooltip: { enabled: true }
            }
        }
    });

    function calculateResonance() {
        const L = state.L;
        const C = state.C * 1e-6;
        const w0 = 1 / Math.sqrt(L * C);
        const f0 = w0 / (2 * Math.PI);
        
        // Venezuelan format: comma for decimals
        const fmt = (n, d=2) => n.toLocaleString('es-VE', { minimumFractionDigits: d, maximumFractionDigits: d });
        resonanceFreq.textContent = fmt(f0) + ' Hz';
        
        // Check if at resonance (AC mode only)
        if (state.Source === 'AC') {
            const tolerance = 0.05; // 5% tolerance
            const isAtResonance = Math.abs(state.Freq - f0) / f0 < tolerance;
            
            if (isAtResonance) {
                resonanceIndicator.style.display = 'flex';
            } else {
                resonanceIndicator.style.display = 'none';
            }
        } else {
            resonanceIndicator.style.display = 'none';
        }
    }

    function updateCircuitDiagram() {
        const isSeries = state.Config === 'Serie';
        
        if (isSeries) {
            // Series RLC Circuit - Components in line
            circuitDiagram.innerHTML = `
                <svg width="240" height="120" viewBox="0 0 240 120">
                    <!-- Wires -->
                    <line x1="20" y1="60" x2="60" y2="60" stroke="#fff" stroke-width="2"/>
                    <line x1="100" y1="60" x2="140" y2="60" stroke="#fff" stroke-width="2"/>
                    <line x1="180" y1="60" x2="220" y2="60" stroke="#fff" stroke-width="2"/>
                    
                    <!-- Source (Circle) -->
                    <circle cx="20" cy="60" r="15" stroke="#4CAF50" stroke-width="2" fill="none"/>
                    <text x="20" y="65" fill="#4CAF50" font-size="20" text-anchor="middle" font-weight="bold">~</text>
                    <text x="20" y="95" fill="#aaa" font-size="10" text-anchor="middle">Vin</text>

                    <!-- Resistor (Zigzag) 60-100 -->
                    <polyline points="60,60 65,50 75,70 85,50 95,70 100,60" fill="none" stroke="#FF5252" stroke-width="2"/>
                    <text x="80" y="40" fill="#FF5252" font-size="12" text-anchor="middle">R</text>

                    <!-- Inductor (Coil) 140-180 -->
                    <path d="M140,60 Q145,40 150,60 T160,60 T170,60 T180,60" fill="none" stroke="#FFC107" stroke-width="2"/>
                    <text x="160" y="40" fill="#FFC107" font-size="12" text-anchor="middle">L</text>

                    <!-- Capacitor (Plates) 220 -->
                    <line x1="220" y1="45" x2="220" y2="75" stroke="#448aff" stroke-width="2"/>
                    <line x1="226" y1="45" x2="226" y2="75" stroke="#448aff" stroke-width="2"/>
                    <text x="223" y="40" fill="#448aff" font-size="12" text-anchor="middle">C</text>
                </svg>
            `;
        } else {
            // Parallel RLC Circuit - Components in parallel branches
            circuitDiagram.innerHTML = `
                <svg width="240" height="140" viewBox="0 0 240 140">
                    <!-- Source -->
                    <circle cx="20" cy="70" r="15" stroke="#4CAF50" stroke-width="2" fill="none"/>
                    <text x="20" y="75" fill="#4CAF50" font-size="20" text-anchor="middle" font-weight="bold">~</text>
                    <text x="20" y="105" fill="#aaa" font-size="10" text-anchor="middle">Vin</text>
                    
                    <!-- Left vertical wire -->
                    <line x1="35" y1="70" x2="60" y2="70" stroke="#fff" stroke-width="2"/>
                    <line x1="60" y1="20" x2="60" y2="120" stroke="#fff" stroke-width="2"/>
                    
                    <!-- Branch 1: Resistor (Top) -->
                    <line x1="60" y1="30" x2="90" y2="30" stroke="#fff" stroke-width="2"/>
                    <polyline points="90,30 95,20 105,40 115,20 125,40 130,30" fill="none" stroke="#FF5252" stroke-width="2"/>
                    <line x1="130" y1="30" x2="160" y2="30" stroke="#fff" stroke-width="2"/>
                    <text x="110" y="15" fill="#FF5252" font-size="12" text-anchor="middle">R</text>
                    
                    <!-- Branch 2: Inductor (Middle) -->
                    <line x1="60" y1="70" x2="90" y2="70" stroke="#fff" stroke-width="2"/>
                    <path d="M90,70 Q95,50 100,70 T110,70 T120,70 T130,70" fill="none" stroke="#FFC107" stroke-width="2"/>
                    <line x1="130" y1="70" x2="160" y2="70" stroke="#fff" stroke-width="2"/>
                    <text x="110" y="55" fill="#FFC107" font-size="12" text-anchor="middle">L</text>
                    
                    <!-- Branch 3: Capacitor (Bottom) -->
                    <line x1="60" y1="110" x2="105" y2="110" stroke="#fff" stroke-width="2"/>
                    <line x1="110" y1="95" x2="110" y2="125" stroke="#448aff" stroke-width="2"/>
                    <line x1="116" y1="95" x2="116" y2="125" stroke="#448aff" stroke-width="2"/>
                    <line x1="120" y1="110" x2="160" y2="110" stroke="#fff" stroke-width="2"/>
                    <text x="113" y="90" fill="#448aff" font-size="12" text-anchor="middle">C</text>
                    
                    <!-- Right vertical wire -->
                    <line x1="160" y1="20" x2="160" y2="120" stroke="#fff" stroke-width="2"/>
                    <line x1="160" y1="70" x2="180" y2="70" stroke="#fff" stroke-width="2"/>
                </svg>
            `;
        }
    }

    function calculateResponse() {
        // Parameters
        const R = state.R;
        const L = state.L;
        const C = state.C * 1e-6; 
        const V = state.V;
        const f = state.Freq;
        const isAC = state.Source === 'AC';
        const isParallel = state.Config === 'Paralelo';

        // Derived Parameters
        const w0 = 1 / Math.sqrt(L * C);
        let alpha, zeta;
        
        if (isParallel) {
            // Parallel RLC: α = 1/(2RC), ζ = (1/2R)√(L/C)
            alpha = 1 / (2 * R * C);
            zeta = (1 / (2 * R)) * Math.sqrt(L / C);
        } else {
            // Series RLC: α = R/(2L), ζ = α/ω₀
            alpha = R / (2 * L);
            zeta = alpha / w0;
        }

        // Metrics Display (Venezuelan format)
        const fmt1 = (n) => n.toLocaleString('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        const fmt3 = (n) => n.toLocaleString('es-VE', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
        metricW0.textContent = fmt1(w0) + ' rad/s' + (isAC ? ` (Resonancia: ${fmt1(w0/(2*Math.PI))} Hz)` : '');
        metricAlpha.textContent = fmt1(alpha) + ' Np/s';
        metricZeta.textContent = fmt3(zeta);
        
        // Response Type Color
        let color = '#448aff'; // Blue default
        let typeText = 'Subamortiguado';
        
        if (zeta > 1.0) { typeText = 'Sobreamortiguado'; color = '#FF5252'; }
        else if (Math.abs(zeta - 1.0) < 0.05) { typeText = 'Crítico'; color = '#00E676'; }
        
        metricType.textContent = typeText;
        metricType.style.color = color;
        rlcChart.data.datasets[1].borderColor = color; // Only voltage changes color based on damping

        // Numerical Simulation (Euler Integration)
        let i_curr = 0;
        let q_curr = 0;
        
        // Time Settings
        let maxTime = 0.5;
        if (isAC) {
            maxTime = 4 / f; 
        } else {
             if (alpha > 1) maxTime = 6 / alpha;
             else maxTime = 10 * (2*Math.PI/w0);
        }
        if (maxTime > 1.0) maxTime = 1.0; 
        if (maxTime < 0.01) maxTime = 0.01;

        const steps = 600; 
        const dt = maxTime / steps;

        const dataInput = [];
        const dataVc = [];
        const dataI = [];

        for (let j = 0; j <= steps; j++) {
            const t = j * dt;
            
            // Input Voltage
            let Vin = 0;
            if (isAC) {
                Vin = V * Math.sin(2 * Math.PI * f * t);
            } else {
                Vin = t > 0 ? V : 0; // Step at t=0
            }

            // Derivatives
            const di_dt = (Vin - R * i_curr - q_curr / C) / L;
            const dq_dt = i_curr;

            // Euler Step
            i_curr += di_dt * dt;
            q_curr += dq_dt * dt;

            const Vc = q_curr / C;

            dataInput.push({x: t, y: Vin});
            dataVc.push({x: t, y: Vc});
            dataI.push({x: t, y: i_curr});
        }

        rlcChart.data.datasets[0].data = dataInput;
        rlcChart.data.datasets[1].data = dataVc;
        rlcChart.data.datasets[2].data = dataI;
        rlcChart.update();
    }

    // Listeners
    function updateState() {
        state.R = parseFloat(rSlider.value);
        state.L = parseFloat(lSlider.value);
        state.C = parseFloat(cSlider.value);
        state.V = parseFloat(vSlider.value);
        state.Freq = parseFloat(fSlider.value);
        state.Source = sourceType.value;
        state.Config = configType.value;

        // Update UI Text (Venezuelan format)
        const fmt = (n, d=1) => n.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: d });
        valR.textContent = fmt(state.R);
        valL.textContent = fmt(state.L);
        valC.textContent = fmt(state.C);
        valV.textContent = fmt(state.V);
        valF.textContent = fmt(state.Freq);

        // Toggle Freq Slider
        if (state.Source === 'AC') {
            freqControl.style.display = 'block';
        } else {
            freqControl.style.display = 'none';
        }

        calculateResonance();
        updateCircuitDiagram();
        calculateResponse();
    }

    [rSlider, lSlider, cSlider, vSlider, fSlider].forEach(el => el.addEventListener('input', updateState));
    sourceType.addEventListener('change', updateState);
    configType.addEventListener('change', updateState);

    // Initial
    updateState();
});
