document.addEventListener('DOMContentLoaded', function() {
    // Simulator State
    const state = {
        P: 50,          // Active Power kW
        pf_init: 0.70,  // Initial PF
        Q_cap: 0        // Capacitor kVAR
    };

    // Elements
    const pSlider = document.getElementById('p_kw');
    const fpSlider = document.getElementById('fp_init');
    const qcSlider = document.getElementById('qc_kvar');
    
    const valP = document.getElementById('val-p');
    const valFp = document.getElementById('val-fp-init');
    const valQc = document.getElementById('val-c');

    // Chart Setup
    const ctx = document.getElementById('fpChart').getContext('2d');
    
    // Custom plugin to draw the vectors
    const vectorPlugin = {
        id: 'vectorPlugin',
        afterDatasetsDraw(chart, args, options) {
            const { ctx, chartArea: { top, bottom, left, right, width, height }, scales: { x, y } } = chart;
            
            // Getting data points from the dataset
            // Dataset 0: [Origin, P_end] -> Horizontal P vector
            // Dataset 1: [P_end, S_old_end] -> Vertical Q_old vector
            // Dataset 2: [Origin, S_old_end] -> Diagonal S_old vector
            // Dataset 3: [P_end, S_new_end] -> Vertical Q_new (Q_old - Q_cap)
            // Dataset 4: [Origin, S_new_end] -> Diagonal S_new
            
            // We use scatter chart points to act as anchors, but we draw lines manually for better vector arrows
        }
    };

    // We will use a scatter chart to position points, but drawing will be linear segments
    const fpChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Potencia Activa (P)',
                    data: [], // [{x:0, y:0}, {x:P, y:0}]
                    showLine: true,
                    borderColor: '#4CAF50', // Green
                    borderWidth: 3,
                    pointRadius: 0
                },
                {
                    label: 'Q Inductiva (Inicial)',
                    data: [], // [{x:P, y:0}, {x:P, y:-Q_old}]
                    showLine: true,
                    borderColor: '#FF5252', // Red
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0
                },
                {
                    label: 'S Aparente (Inicial)',
                    data: [], // [{x:0, y:0}, {x:P, y:-Q_old}]
                    showLine: true,
                    borderColor: '#FFC107', // Amber
                    borderWidth: 3,
                    pointRadius: 0
                },
                {
                    label: 'Q Capacitiva (Compensación)',
                    data: [], // [{x:P, y:-Q_old}, {x:P, y:-Q_new}] basically drawing the UP arrow
                    showLine: true,
                    borderColor: '#448aff', // Blue
                    borderWidth: 3,
                    pointRadius: 0
                },
                {
                    label: 'S Aparente (Final)',
                    data: [], 
                    showLine: true,
                    borderColor: '#ffffff', // White
                    borderWidth: 3,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0 // meaningful performance
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 120, // Dynamic max could be better
                    title: {
                        display: true,
                        text: 'Potencia Activa (kW)',
                        color: '#90a4ae',
                        font: { size: 12, weight: 'bold' }
                    },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#b0bec5' }
                },
                y: {
                    min: -100,
                    max: 20, // A bit of positive space for leading PF visualization
                    title: {
                        display: true,
                        text: 'Potencia Reactiva (kVAR)',
                        color: '#90a4ae',
                        font: { size: 12, weight: 'bold' }
                    },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#b0bec5' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#ffffff' }
                },
                tooltip: {
                    enabled: false // Custom tooltips would be complex
                }
            }
        }
    });

    function calculate() {
        const P = state.P;
        const pf_old = state.pf_init;
        const Q_cap = state.Q_cap;

        // Calculate Q_old (Inductive is usually negative in standard math XY, but power triangle often draws Q down for lagging)
        // Let's stick to standard math quadrant IV for lagging (P pos, Q neg)
        const phi_old = Math.acos(pf_old);
        const Q_old_mag = P * Math.tan(phi_old);
        const Q_old = -Q_old_mag; // Inductive = Negative Y in this visualization

        // Net Q
        // Adding Capacitor means adding Positive Q (vector up)
        const Q_new = Q_old + Q_cap; 

        // New S and PF
        const S_new = Math.sqrt(P*P + Q_new*Q_new);
        const S_old = Math.sqrt(P*P + Q_old*Q_old);
        
        // PF new direction
        let pf_new = P / S_new;
        if (Q_new > 0) {
            // Leading / Capacitive
            // pf_new is still positive ratio, but physically leading
        }

        // --- Updates --- (Venezuelan format)
        const fmt = (n, d=2) => n.toLocaleString('es-VE', { minimumFractionDigits: d, maximumFractionDigits: d });

        // Controls Text
        valP.textContent = P;
        valFp.textContent = fmt(pf_old);
        valQc.textContent = Q_cap;

        // Metrics Text
        const metricFp = document.getElementById('metric-fp-new');
        metricFp.textContent = fmt(pf_new) + (Q_new > 0.1 ? ' (Cap)' : '');
        metricFp.style.color = pf_new > 0.95 ? '#00E676' : (pf_new < 0.8 ? '#FF5252' : '#FFC107');

        document.getElementById('metric-s-new').textContent = fmt(S_new, 1) + ' kVA';
        
        // Reduction current estimation (Assuming constant Voltage)
        // I_reduction % = (S_old - S_new) / S_old * 100
        const reduction = ((S_old - S_new) / S_old) * 100;
        document.getElementById('metric-reduction').textContent = fmt(Math.max(0, reduction), 1) + '%';


        // Update Chart Data
        
        // Dataset 0: P Vector (0,0) -> (P,0)
        fpChart.data.datasets[0].data = [{x:0, y:0}, {x:P, y:0}];
        
        // Dataset 1: Q Old Vector (P,0) -> (P, Q_old)
        fpChart.data.datasets[1].data = [{x:P, y:0}, {x:P, y:Q_old}];

        // Dataset 2: S Old Vector (0,0) -> (P, Q_old)
        fpChart.data.datasets[2].data = [{x:0, y:0}, {x:P, y:Q_old}];

        // Dataset 3: Q Capacitor Vector (Visualizing it starting from Q_old tip and going UP)
        // From (P, Q_old) to (P, Q_new)
        fpChart.data.datasets[3].data = [{x:P, y:Q_old}, {x:P, y:Q_new}];

        // Dataset 4: S New Vector (0,0) -> (P, Q_new)
        fpChart.data.datasets[4].data = [{x:0, y:0}, {x:P, y:Q_new}];

        // Dynamic Scales
        fpChart.options.scales.x.max = 105;
        // Y min should cover the deepest Q_old
        // Max Q_old happens at P=100, PF=0.5 -> Q = 100 * tan(60) = 173
        // So let's make it dynamic or fixed large enough.
        // Let's set min to slightly below Q_old
        fpChart.options.scales.y.min = Math.min(-100, Q_old - 20);

        fpChart.update();
    }

    // Listeners
    pSlider.addEventListener('input', (e) => {
        state.P = parseFloat(e.target.value);
        calculate();
    });

    fpSlider.addEventListener('input', (e) => {
        state.pf_init = parseFloat(e.target.value);
        calculate();
    });

    qcSlider.addEventListener('input', (e) => {
        state.Q_cap = parseFloat(e.target.value);
        calculate();
    });

    document.getElementById('reset-sim').addEventListener('click', () => {
        state.P = 50;
        state.pf_init = 0.70;
        state.Q_cap = 0;
        pSlider.value = 50;
        fpSlider.value = 0.70;
        qcSlider.value = 0;
        calculate();
    });

    // Initial Calc
    calculate();
});
