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

    updateLimitsDisplay: () => {
        const limit = Grounding.limits[Grounding.currentApp];
        document.getElementById('target-resistance').textContent = `${limit} Ω`;
        
        let label = "Norma Predeterminada";
        if(Grounding.currentApp === 'building') label = "Fondonorma 200 (Art. 250.56)";
        if(Grounding.currentApp === 'substation') label = "IEEE Std 80 (Típico)";
        if(Grounding.currentApp === 'tank') label = "API RP 2003";
        
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

    // --- MAIN CALCULATION CONTROLLER ---
    calculate: () => {
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

        // 4. Update UI Results
        document.getElementById('res-rod').textContent = r_rod.toFixed(2);
        document.getElementById('res-grid').textContent = r_grid.toFixed(2);

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
                    label: 'Resistividad Aparente (Ω·m)',
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
        alert("Generando informe profesional... (Funcionalidad simulada por ahora)");
        // TODO: Integrate jsPDF similar to calculations.js
    }
};

// Auto-init when loaded
window.addEventListener('DOMContentLoaded', Grounding.init);
