document.addEventListener('DOMContentLoaded', function() {
    // Simulator State
    const state = {
        R: 100,
        L: 1.0,
        C: 47,
        V: 10,
        Freq: 60,
        Source: 'DC'
    };

    // Elements
    const rSlider = document.getElementById('param_r');
    const lSlider = document.getElementById('param_l');
    const cSlider = document.getElementById('param_c');
    const vSlider = document.getElementById('param_v');
    const fSlider = document.getElementById('param_f');
    const sourceType = document.getElementById('source_type');
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

    function calculateResponse() {
        // Parameters
        const R = state.R;
        const L = state.L;
        const C = state.C * 1e-6; 
        const V = state.V;
        const f = state.Freq;
        const isAC = state.Source === 'AC';

        // Derived Parameters
        const w0 = 1 / Math.sqrt(L * C);
        const alpha = R / (2 * L);
        const zeta = alpha / w0;

        // Metrics Display
        metricW0.textContent = w0.toFixed(1) + ' rad/s' + (isAC ? ` (Resonancia: ${(w0/(2*Math.PI)).toFixed(1)} Hz)` : '');
        metricAlpha.textContent = alpha.toFixed(1) + ' Np/s';
        metricZeta.textContent = zeta.toFixed(3);
        
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

        // Update UI Text
        valR.textContent = state.R;
        valL.textContent = state.L;
        valC.textContent = state.C;
        valV.textContent = state.V;
        valF.textContent = state.Freq;

        // Toggle Freq Slider
        if (state.Source === 'AC') {
            freqControl.style.display = 'block';
        } else {
            freqControl.style.display = 'none';
        }

        calculateResponse();
    }

    [rSlider, lSlider, cSlider, vSlider, fSlider].forEach(el => el.addEventListener('input', updateState));
    sourceType.addEventListener('change', updateState);

    // Initial
    updateState();
});
