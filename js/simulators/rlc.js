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
    
    // Number Inputs
    const numR = document.getElementById('num_r');
    const numL = document.getElementById('num_l');
    const numC = document.getElementById('num_c');
    const numV = document.getElementById('num_v');
    const numF = document.getElementById('num_f');

    const metricW0 = document.getElementById('metric-w0');
    const metricPhase = document.getElementById('metric-phase');
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
            // Series RLC Circuit - Closed Loop
            circuitDiagram.innerHTML = `
                <svg width="240" height="120" viewBox="0 0 240 120">
                    <!-- Top Wire -->
                    <line x1="20" y1="30" x2="60" y2="30" stroke="#fff" stroke-width="2"/>
                    
                    <!-- Resistor (Top) -->
                    <polyline points="60,30 65,20 75,40 85,20 95,40 100,30" fill="none" stroke="#FF5252" stroke-width="2"/>
                    <text x="80" y="15" fill="#FF5252" font-size="12" text-anchor="middle">R</text>
                    
                    <line x1="100" y1="30" x2="130" y2="30" stroke="#fff" stroke-width="2"/>

                    <!-- Inductor (Top) -->
                    <path d="M130,30 Q135,10 140,30 T150,30 T160,30 T170,30" fill="none" stroke="#FFC107" stroke-width="2"/>
                    <text x="150" y="15" fill="#FFC107" font-size="12" text-anchor="middle">L</text>
                    
                    <line x1="170" y1="30" x2="200" y2="30" stroke="#fff" stroke-width="2"/>

                    <!-- Capacitor (Top Right to Down) -->
                    <line x1="200" y1="30" x2="200" y2="45" stroke="#fff" stroke-width="2"/>
                    <line x1="190" y1="45" x2="210" y2="45" stroke="#448aff" stroke-width="2"/>
                    <line x1="190" y1="51" x2="210" y2="51" stroke="#448aff" stroke-width="2"/>
                    <line x1="200" y1="51" x2="200" y2="90" stroke="#fff" stroke-width="2"/>
                    <text x="220" y="50" fill="#448aff" font-size="12" text-anchor="middle">C</text>
                    
                    <!-- Source (Left vertical) -->
                    <circle cx="20" cy="60" r="15" stroke="#4CAF50" stroke-width="2" fill="none"/>
                    <text x="20" y="65" fill="#4CAF50" font-size="20" text-anchor="middle" font-weight="bold">~</text>
                    <line x1="20" y1="30" x2="20" y2="45" stroke="#fff" stroke-width="2"/>
                    <line x1="20" y1="75" x2="20" y2="90" stroke="#fff" stroke-width="2"/>
                    <text x="45" y="65" fill="#aaa" font-size="10" text-anchor="middle">Vin</text>

                    <!-- Return Wire (Bottom) -->
                    <line x1="20" y1="90" x2="200" y2="90" stroke="#fff" stroke-width="2"/>
                </svg>
            `;
        } else {
            // Parallel RLC Circuit - Closed Loop
            circuitDiagram.innerHTML = `
                <svg width="240" height="140" viewBox="0 0 240 140">
                    <!-- Source (Left) -->
                    <circle cx="20" cy="70" r="15" stroke="#4CAF50" stroke-width="2" fill="none"/>
                    <text x="20" y="75" fill="#4CAF50" font-size="20" text-anchor="middle" font-weight="bold">~</text>
                    <text x="45" y="75" fill="#aaa" font-size="10" text-anchor="middle">Vin</text>
                    <line x1="20" y1="20" x2="20" y2="55" stroke="#fff" stroke-width="2"/>
                    <line x1="20" y1="85" x2="20" y2="120" stroke="#fff" stroke-width="2"/>
                    
                    <!-- Top Rail -->
                    <line x1="20" y1="20" x2="160" y2="20" stroke="#fff" stroke-width="2"/>

                    <!-- Branch 1: Resistor -->
                    <line x1="60" y1="20" x2="60" y2="30" stroke="#fff" stroke-width="2"/>
                    <polyline points="60,30 50,35 70,45 50,55 70,65 60,70" fill="none" stroke="#FF5252" stroke-width="2"/>
                    <line x1="60" y1="70" x2="60" y2="120" stroke="#fff" stroke-width="2"/>
                    <text x="60" y="15" fill="#FF5252" font-size="12" text-anchor="middle">R</text>

                    <!-- Branch 2: Inductor -->
                    <line x1="110" y1="20" x2="110" y2="30" stroke="#fff" stroke-width="2"/>
                    <path d="M110,30 Q130,35 110,40 T110,50 T110,60 T110,70" fill="none" stroke="#FFC107" stroke-width="2" transform="rotate(90, 110, 50) translate(-20, 20)"/> 
                    <!-- Simple coil vertical representation -->
                    <path d="M110,30 C90,40 130,40 110,50 C90,60 130,60 110,70 C90,80 130,80 110,90" fill="none" stroke="#FFC107" stroke-width="2"/>
                    <line x1="110" y1="90" x2="110" y2="120" stroke="#fff" stroke-width="2"/>
                    <text x="110" y="15" fill="#FFC107" font-size="12" text-anchor="middle">L</text>

                    <!-- Branch 3: Capacitor -->
                    <line x1="160" y1="20" x2="160" y2="65" stroke="#fff" stroke-width="2"/>
                    <line x1="150" y1="65" x2="170" y2="65" stroke="#448aff" stroke-width="2"/>
                    <line x1="150" y1="71" x2="170" y2="71" stroke="#448aff" stroke-width="2"/>
                    <line x1="160" y1="71" x2="160" y2="120" stroke="#fff" stroke-width="2"/>
                    <text x="160" y="15" fill="#448aff" font-size="12" text-anchor="middle">C</text>
                    
                    <!-- Bottom Rail -->
                    <line x1="20" y1="120" x2="160" y2="120" stroke="#fff" stroke-width="2"/>
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

        // Calculate and Display Phase Shift (Only relevant for AC)
        if (isAC) {
            const w = 2 * Math.PI * f;
            let phiDegree = 0;
            let nature = '';

            if (isParallel) {
                // Parallel: phi = -atan( R*(wC - 1/wL) )
                // Admittance Angle theta_Y = atan( B / G ) = atan( (wC - 1/wL) * R )
                // Phase (V relative to I) = -theta_Y
                const Bc = w * C;
                const Bl = 1 / (w * L);
                const G = 1 / R;
                const theta_rad = Math.atan((Bc - Bl) / G); // Current angle relative to Voltage
                phiDegree = -theta_rad * (180 / Math.PI); // Voltage angle relative to Current
            } else {
                // Series: phi = atan( (XL - XC) / R )
                const XL = w * L;
                const XC = 1 / (w * C);
                const theta_rad = Math.atan((XL - XC) / R);
                phiDegree = theta_rad * (180 / Math.PI);
            }

            // Determine nature
            if (phiDegree > 0.1) nature = ' (Inductivo)';
            else if (phiDegree < -0.1) nature = ' (Capacitivo)';
            else nature = ' (Resistivo)';

            // Formatting
            const fmtPhase = (n) => n.toLocaleString('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
            metricPhase.textContent = fmtPhase(phiDegree) + '°' + nature;
            metricPhase.parentNode.style.display = 'flex'; // Ensure visible
        } else {
            metricPhase.parentNode.style.display = 'none'; // Hide for DC
        }

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
                // RMS logic: If user inputs 10V (RMS), Peak is 10 * sqrt(2)
                const Vpeak = V * Math.sqrt(2); 
                Vin = Vpeak * Math.sin(2 * Math.PI * f * t);
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
    function updateState(source) { // source = 'slider' or 'input' or 'other'
        // Read from sliders if source is slider or other, read from input if source is input
        if (source === 'input') {
            state.R = parseFloat(numR.value);
            state.L = parseFloat(numL.value);
            state.C = parseFloat(numC.value);
            state.V = parseFloat(numV.value);
            state.Freq = parseFloat(numF.value);

            // Sync sliders
            rSlider.value = state.R;
            lSlider.value = state.L;
            cSlider.value = state.C;
            vSlider.value = state.V;
            fSlider.value = state.Freq;
        } else {
            // Read from Sliders
            state.R = parseFloat(rSlider.value);
            state.L = parseFloat(lSlider.value);
            state.C = parseFloat(cSlider.value);
            state.V = parseFloat(vSlider.value);
            state.Freq = parseFloat(fSlider.value);
            
            // Sync inputs
            numR.value = state.R;
            numL.value = state.L;
            numC.value = state.C;
            numV.value = state.V;
            numF.value = state.Freq;
        }

        state.Source = sourceType.value;
        state.Config = configType.value;

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

    // Attach Listeners
    [rSlider, lSlider, cSlider, vSlider, fSlider].forEach(el => 
        el.addEventListener('input', () => updateState('slider'))
    );
    
    [numR, numL, numC, numV, numF].forEach(el => 
        el.addEventListener('input', () => updateState('input'))
    );

    sourceType.addEventListener('change', () => updateState('other'));
    configType.addEventListener('change', () => updateState('other'));

    // Initial
    updateState('slider');
});
