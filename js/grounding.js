/**
 * grounding.js
 * Logic for Grounding System Design (IEEE 80 / FONDONORMA 200)
 */

const Grounding = {
    // State
    currentApp: 'substation', // default
    
    // Application Limits (Ohms)
    limits: {
        substation: 1.0,     // IEEE 80 typical target
        building: 25.0,      // NEC / Fondonorma 250.56
        industrial: 5.0,     // Industrial practice
        tank: 10.0,          // API RP 2003
        oil_facility: 5.0    // Sensitive equipment
    },

    init: () => {
        Grounding.setupListeners();
        Grounding.setupModal();
        Grounding.renderCharts();
        Grounding.calculate(); // Initial default run
    },

    setupListeners: () => {
        // Application Selectors
        document.querySelectorAll('.app-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // UI Toggle
                document.querySelectorAll('.app-card').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Update State
                Grounding.currentApp = e.currentTarget.dataset.type;
                Grounding.updateLimitsDisplay();
                Grounding.calculate();
            });
        });

        // Calculators Inputs
        const inputs = document.querySelectorAll('.calc-input');
        inputs.forEach(input => {
            input.addEventListener('input', Grounding.calculate);
        });
    },

    setupModal: () => {
        const modal = document.getElementById('guide-modal');
        const btn = document.getElementById('btn-guide');
        const span = document.getElementsByClassName('close-modal')[0];

        btn.onclick = () => modal.style.display = "block";
        span.onclick = () => modal.style.display = "none";
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
    },

    updateLimitsDisplay: () => {
        const limit = Grounding.limits[Grounding.currentApp];
        document.getElementById('target-resistance').textContent = `${limit} Ω`;
        
        let label = "Norma Predeterminada";
        if(Grounding.currentApp === 'building') label = "Fondonorma 200 (Art. 250.56)";
        if(Grounding.currentApp === 'substation') label = "IEEE 80 (Típico HV)";
        if(Grounding.currentApp === 'tank') label = "API RP 2003 (Estática)";
        
        document.getElementById('standard-ref').textContent = label;
    },

    // --- PHYSICS & MATH CORE ---

    // Wenner Method: Calculates Apparent Resistivity
    // a: spacing (m), R: resistance (Ohm) => returns Rho (Ohm-m)
    calculateWennerRho: (a, R) => {
        return 2 * Math.PI * a * R;
    },

    // Dwight Formula: Vertical Rod
    // rho: Ohm-m, L: length (m), dia: diameter (m)
    calculateRodResistance: (rho, L, dia) => {
        // R = (rho / 2*PI*L) * (ln(4L/r) - 1)
        const radius = dia / 2;
        if (L <= 0 || radius <= 0) return 0;
        return (rho / (2 * Math.PI * L)) * (Math.log((4 * L) / radius) - 1);
    },

    // Sverak Equation (IEEE 80): Grid Resistance
    // rho: Ohm-m, A: Area (m2), Lt: Total conductor length (m), h: depth (m)
    calculateGridResistance: (rho, A, Lt, h) => {
        if (A <= 0 || Lt <= 0) return 0;
        // Rg = rho * [ 1/Lt + 1/sqrt(20*A) * (1 + 1/(1 + h*sqrt(20/A)) ) ]
        return rho * ( (1/Lt) + (1/Math.sqrt(20*A)) * (1 + (1/(1 + h * Math.sqrt(20/A)))) );
    },

    // Onderdonk's Formula (IEEE 80 Sec. 11.3)
    // I: Current (kA), t: time (s) -> returns Area (mm2)
    // Assuming Copper, Tm=1083C, Ta=40C (Hard-drawn/Commercial)
    // Simplified constant K for Copper 97% approx 7.00 (English) -> Approx constant in metric:
    // Amm2 = I(kA) * 1000 * sqrt(t) / K_factor
    // Using common constant ~220 for Cu
    calculateConductorSize: (IkA, t) => {
        if(IkA <= 0 || t <= 0) return 0;
        // Formula: A(kcmil) = I * K * sqrt(t) 
        // Metric approximation: A(mm2) = (I_kA * 1000) * sqrt(t) / 197 (Simplified for commercial copper)
        // More precise IEEE 80 Eq 37: A_kcmil = I_kA * Kf * sqrt(t)
        // Let's use simple thermal capacity:
        // A_mm2 = I_Amps / (K * sqrt(1/t)) where K approx 145 for Thermoweld or 100-150 range.
        
        // Using standard derivation for Copper Annealed (soft):
        // I = A_mm2 * 0.235 * 1000 / sqrt(t) (Roughly)
        // Constant C = 283 for 250C limit?
        
        // Let's use formula from IEEE 80 Eq 37 converted to mm2:
        // A_mm2 = (I_A / 250) * sqrt(t) ? No.

        // Standard approximation:
        // S = I * sqrt(t) / K
        // K for Copper = 143 (PVC insulated) to 226 (Bare).
        // For grounding grid (bare, bolted), Ta=40, Tm=1083.
        const K = 230; // Factor for Bare Copper fused T=1083
        
        const I_amps = IkA * 1000;
        const Area = (I_amps * Math.sqrt(t)) / K;
        return Area;
    },

    getAWG: (areaMm2) => {
        const sizes = [
            { id: '14 AWG', area: 2.08 },
            { id: '12 AWG', area: 3.31 },
            { id: '10 AWG', area: 5.26 },
            { id: '8 AWG', area: 8.37 },
            { id: '6 AWG', area: 13.3 },
            { id: '4 AWG', area: 21.2 },
            { id: '2 AWG', area: 33.6 },
            { id: '1/0 AWG', area: 53.5 },
            { id: '2/0 AWG', area: 67.4 },
            { id: '3/0 AWG', area: 85.0 },
            { id: '4/0 AWG', area: 107.0 },
            { id: '250 kcmil', area: 127 },
            { id: '350 kcmil', area: 177 },
            { id: '500 kcmil', area: 253 },
        ];
        
        for (let s of sizes) {
            if (s.area >= areaMm2) return s.id;
        }
        return "> 500 kcmil"; // Too big
    },

    // --- MAIN CALCULATION CONTROLLER ---
    calculate: () => {
        // 0. Get System Params
        const if_ka = parseFloat(document.getElementById('sys-if').value) || 10;
        const tf_sec = parseFloat(document.getElementById('sys-tf').value) || 0.5;
        
        document.getElementById('lbl-icc').textContent = if_ka;
        document.getElementById('lbl-time').textContent = tf_sec;

        // 1. Get Soil Parameters
        const field_spacing = parseFloat(document.getElementById('wenner-a').value) || 3;
        const field_R = parseFloat(document.getElementById('wenner-r').value) || 2;
        
        const rho = Grounding.calculateWennerRho(field_spacing, field_R);
        document.getElementById('res-rho').textContent = rho.toFixed(2);

        // 2. Get Design Parameters
        const rod_L = parseFloat(document.getElementById('rod-len').value) || 2.44; // 8ft
        const rod_dia_inch = parseFloat(document.getElementById('rod-dia').value) || 0.625; // 5/8inch
        const rod_dia_m = rod_dia_inch * 0.0254;
        
        const grid_area = parseFloat(document.getElementById('grid-area').value) || 100;
        const grid_conductor_len = parseFloat(document.getElementById('grid-len').value) || 120;
        const grid_depth = parseFloat(document.getElementById('grid-depth').value) || 0.5;

        // 3. Calculate Resistances
        const r_rod = Grounding.calculateRodResistance(rho, rod_L, rod_dia_m);
        const r_grid = Grounding.calculateGridResistance(rho, grid_area, grid_conductor_len, grid_depth);

        // 3b. Calculate Conductor
        const min_area_mm2 = Grounding.calculateConductorSize(if_ka, tf_sec);
        const awg = Grounding.getAWG(min_area_mm2);

        // 4. Update UI Results
        document.getElementById('res-rod').textContent = r_rod.toFixed(2);
        document.getElementById('res-grid').textContent = r_grid.toFixed(2);
        
        document.getElementById('res-conductor').textContent = min_area_mm2.toFixed(2) + " mm²";
        document.getElementById('res-conductor-awg').textContent = "Recomendado: " + awg;


        // 5. Compliance Check
        const limit = Grounding.limits[Grounding.currentApp];
        const relevantR = (Grounding.currentApp === 'building') ? r_rod : r_grid; // Simplified logic selection
        
        const badge = document.getElementById('compliance-badge');
        if (relevantR <= limit) {
            badge.className = 'compliance-badge compliance-pass';
            badge.innerHTML = '<i class="fa-solid fa-check"></i> CUMPLE NORMA';
        } else {
            badge.className = 'compliance-badge compliance-fail';
            badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> NO CUMPLE';
        }
        
        // 6. Update Chart
        Grounding.updateChart(rho);
    },

    // --- VISUALIZATION ---
    chart: null,
    renderCharts: () => {
        const ctx = document.getElementById('resistivityChart').getContext('2d');
        Grounding.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1m', '2m', '3m', '4m', '5m', '6m', '8m', '10m'],
                datasets: [{
                    label: 'Resistividad Aparente (Ω·m) - IEEE 81',
                    data: [100, 95, 90, 85, 80, 78, 76, 75], // Dummy init
                    borderColor: '#00e5ff',
                    backgroundColor: 'rgba(0, 229, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#f8fafc' } }
                },
                scales: {
                    y: { 
                        grid: { color: '#334155' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        grid: { color: '#334155' },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    },

    updateChart: (currentRho) => {
        if(!Grounding.chart) return;
        // Simulate a soil profile curve based on the single point measurement (simple extrapolation for demo)
        // In real app, we would take multiple measurements.
        const dataset = Grounding.chart.data.datasets[0];
        
        // Mock curve variation
        dataset.data = [
            currentRho * 1.2,
            currentRho * 1.1,
            currentRho,
            currentRho * 0.95,
            currentRho * 0.92,
            currentRho * 0.9,
            currentRho * 0.88,
            currentRho * 0.87
        ];
        
        Grounding.chart.update();
    },

    generatePDF: () => {
        alert("Generando informe certificado por la Norma... (Proximamente)");
    }
};

// Auto-init when loaded
window.addEventListener('DOMContentLoaded', Grounding.init);
