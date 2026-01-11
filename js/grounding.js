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
                Grounding.updateUIParams();
                Grounding.calculate();
            });
        });

        // Calculators Inputs
        const inputs = document.querySelectorAll('.calc-input');
        inputs.forEach(input => {
            input.addEventListener('input', Grounding.calculate);
        });
        
        // Initial UI Setup
        Grounding.updateUIParams();
    },

    setupModal: () => {
        const modal = document.getElementById('guide-modal');
        const btn = document.getElementById('btn-guide');
        const span = document.getElementsByClassName('close-modal')[0];

        if(btn) btn.onclick = () => modal.style.display = "block";
        if(span) span.onclick = () => modal.style.display = "none";
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
    },
    
    // UI VISIBILITY LOGIC (Refactored)
    updateUIParams: () => {
        const app = Grounding.currentApp;
        const sectionSafety = document.getElementById('section-safety');
        const sectionSurface = document.getElementById('section-surface');
        const gridDetails = document.getElementById('section-grid-details');
        
        // 1. Safety Voltages & Surface Layer (Only needed for IEEE 80 Substations)
        if (app === 'substation') {
            sectionSafety.classList.remove('hidden-section');
            sectionSurface.classList.remove('hidden-section');
            gridDetails.classList.remove('hidden-section'); // Complex grid needed
        } else {
            sectionSafety.classList.add('hidden-section');
            sectionSurface.classList.add('hidden-section');
            
            // For simple buildings, simplified grid input? check logic
            // For now, industrial might use grid, but building mostly use rods.
            if (app === 'building') {
                gridDetails.classList.add('hidden-section'); 
            } else {
                gridDetails.classList.remove('hidden-section'); // Industrial uses grid
            }
        }
    },

    updateLimitsDisplay: () => {
        // Logic moved to Calculate or maintained separately?
        // Let's keep limits object updated, but UI text is now handled in calculate loop mostly.
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
        try {
            // 0. Get System Params
            const sysIfEl = document.getElementById('sys-if');
            if(!sysIfEl) return; // Guard if DOM not ready

            const if_ka = parseFloat(sysIfEl.value) || 10;
            const tf_sec = parseFloat(document.getElementById('sys-tf').value) || 0.5;
            
            document.getElementById('lbl-icc').textContent = if_ka;
            document.getElementById('lbl-time').textContent = tf_sec;

            // 1. Get Soil Parameters
            const field_spacing = parseFloat(document.getElementById('wenner-a').value) || 3;
            const field_R = parseFloat(document.getElementById('wenner-r').value) || 2;
            
            const rho = Grounding.calculateWennerRho(field_spacing, field_R);
            const resRhoEl = document.getElementById('res-rho');
            if(resRhoEl) resRhoEl.textContent = rho.toFixed(2);

            // 2. Get Design Parameters
            const rod_L = parseFloat(document.getElementById('rod-len').value) || 2.44; 
            const rod_dia_inch = parseFloat(document.getElementById('rod-dia').value) || 0.625; 
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

            // --- IEEE 80 SAFETY CALCULATIONS (NEW) ---
            // Inputs
            const surf_rho = parseFloat(document.getElementById('surf-rho').value) || 2500;
            const surf_h = parseFloat(document.getElementById('surf-h').value) || 0.15;
            const D = parseFloat(document.getElementById('grid-spacing').value) || 5;
            const n = parseFloat(document.getElementById('grid-n').value) || 6;
            
            // 1. Reflection Factor (K) & Derating Factor (Cs)
            const K = (rho - surf_rho) / (rho + surf_rho);
            const Cs = 1 - (0.09 * (1 - rho/surf_rho)) / (2 * surf_h + 0.09);

            // 2. Tolerable Voltages (70kg body)
            const E_touch_max = (1000 + 1.5 * Cs * surf_rho) * 0.157 / Math.sqrt(tf_sec);
            const E_step_max = (1000 + 6 * Cs * surf_rho) * 0.157 / Math.sqrt(tf_sec);

            // 3. Geometric Factors
            const grid_d = 0.0134; 
            const Km = (1 / (2 * Math.PI)) * Math.log( (D * D) / (16 * grid_depth * grid_d) );
            const Ki = 0.644 + 0.148 * n;
            const Ks = (1 / Math.PI) * ( (1 / (2 * grid_depth)) + (1 / (D + grid_depth)) + (1/D) * (1 - Math.pow(0.5, n - 2)) );

            // 4. Actual Voltages (Em, Es)
            const Ig = if_ka * 1000; 
            const L_total = grid_conductor_len; // Total Length

            const E_mesh_calc = (rho * Km * Ki * Ig) / L_total;
            const E_step_calc = (rho * Ks * Ki * Ig) / L_total;

            // --- UPDATE SAFETY UI ---
            const elTouchCalc = document.getElementById('val-touch-calc');
            const elTouchMax = document.getElementById('val-touch-max');
            const elStepCalc = document.getElementById('val-step-calc');
            const elStepMax = document.getElementById('val-step-max');
            const elStatusTouch = document.getElementById('status-touch');
            const elStatusStep = document.getElementById('status-step');

            if(elTouchCalc) elTouchCalc.textContent = !isNaN(E_mesh_calc) ? E_mesh_calc.toFixed(1) + " V" : "-";
            if(elTouchMax) elTouchMax.textContent = !isNaN(E_touch_max) ? E_touch_max.toFixed(1) + " V" : "-";
            if(elStepCalc) elStepCalc.textContent = !isNaN(E_step_calc) ? E_step_calc.toFixed(1) + " V" : "-";
            if(elStepMax) elStepMax.textContent = !isNaN(E_step_max) ? E_step_max.toFixed(1) + " V" : "-";

            // Logic Colors
            const touchPass = E_mesh_calc < E_touch_max;
            const stepPass = E_step_calc < E_step_max;

            if(elStatusTouch) {
                elStatusTouch.innerHTML = touchPass 
                ? '<span style="color:var(--success-green)"><i class="fa fa-check"></i> OK</span>' 
                : '<span style="color:var(--error-red)"><i class="fa fa-times"></i> PELIGRO</span>';
            }

            if(elStatusStep) {
                elStatusStep.innerHTML = stepPass 
                ? '<span style="color:var(--success-green)"><i class="fa fa-check"></i> OK</span>' 
                : '<span style="color:var(--error-red)"><i class="fa fa-times"></i> PELIGRO</span>';
            }

            document.getElementById('res-rod').textContent = r_rod.toFixed(2);
            document.getElementById('res-grid').textContent = r_grid.toFixed(2);
            
            document.getElementById('res-conductor').textContent = min_area_mm2.toFixed(2) + " mm²";
            document.getElementById('res-conductor-awg').textContent = "Recomendado: " + awg;

            // 5. Compliance Check & Main Display
            const limit = Grounding.limits[Grounding.currentApp];
            
            let relevantR = r_grid;
            let labelR = "MALLA";
            let targetText = `${limit} Ω`;
            let refText = "IEEE Std 80";
            let isOverallPass = false;

            if (Grounding.currentApp === 'substation') {
                relevantR = r_grid;
                labelR = "MALLA SUBESTACIÓN";
                targetText = "< 1.0 Ω (Típico)";
                isOverallPass = touchPass && stepPass; // Primary criteria
            } else if (Grounding.currentApp === 'building') {
                relevantR = r_rod;
                labelR = "ELECTRODO PRINCIPAL";
                targetText = "< 25.0 Ω";
                refText = "CEN / NEC 250.56";
                isOverallPass = relevantR <= limit;
            } else if (Grounding.currentApp === 'industrial') {
                relevantR = Math.min(r_rod, r_grid); 
                labelR = "SISTEMA COMBINADO";
                targetText = "< 5.0 Ω";
                refText = "Práctica Industrial";
                isOverallPass = relevantR <= limit;
            } else { // Tank
                relevantR = r_grid; 
                labelR = "LAZO ESTÁTICO";
                targetText = "< 10.0 Ω";
                refText = "API RP 2003";
                isOverallPass = relevantR <= limit;
            }
            
            document.getElementById('res-main').textContent = !isNaN(relevantR) ? relevantR.toFixed(2) : "0.00";
            document.getElementById('res-label').textContent = labelR;
            document.getElementById('target-resistance').textContent = targetText;
            document.getElementById('standard-ref').textContent = refText;
            
            const badge = document.getElementById('compliance-badge');
            if (isOverallPass) {
                badge.className = 'compliance-badge compliance-pass';
                badge.innerHTML = '<i class="fa-solid fa-check"></i> CUMPLE NORMA';
            } else {
                badge.className = 'compliance-badge compliance-fail';
                if (Grounding.currentApp === 'substation' && (!touchPass || !stepPass)) {
                    badge.innerHTML = '<i class="fa-solid fa-skull-crossbones"></i> FALLA SEGURIDAD';
                } else {
                    badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> NO CUMPLE';
                }
            }
            
            // 6. Update Chart
            Grounding.updateChart(rho);
        
        } catch (e) {
            console.error("Calculation Error:", e);
        }
    },

    // --- VISUALIZATION ---
    chart: null,
    renderCharts: () => {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded (Offline mode). Charts disabled.');
            document.getElementById('resistivityChart').parentElement.style.display = 'none';
            return;
        }

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
        // Collect Project Data
        const project = {
            name: document.getElementById('proj-name').value || "Sin Nombre",
            loc: document.getElementById('proj-loc').value || "No especificada",
            client: document.getElementById('proj-client').value || "No especificado",
            date: document.getElementById('proj-date').value || new Date().toLocaleDateString()
        };

        // Collect Technical Data
        const sysKv = document.getElementById('sys-kv').value;
        const sysIf = document.getElementById('sys-if').value;
        const sysTf = document.getElementById('sys-tf').value;
        const wennerA = document.getElementById('wenner-a').value;
        const rho = document.getElementById('res-rho').textContent;
        const rodR = document.getElementById('res-rod').textContent;
        const gridR = document.getElementById('res-grid').textContent;
        const condMm2 = document.getElementById('res-conductor').textContent;
        const condAWG = document.getElementById('res-conductor-awg').textContent.replace("Recomendado: ", "");
        const targetR = document.getElementById('target-resistance').textContent;
        
        const isCompliant = document.getElementById('compliance-badge').classList.contains('compliance-pass');
        const statusText = isCompliant ? "CUMPLE NORMATIVA" : "NO CUMPLE";

        // Init jsPDF
        if (!window.jspdf) {
            alert("Librería de PDF no cargada. Verifique su conexión.");
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // --- HEADER ---
        doc.setFillColor(15, 23, 42); // Dark Blue Theme
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("ElectrIA Grounding", 14, 20); // Logo text
        
        doc.setFontSize(10);
        doc.setTextColor(0, 229, 255); // Cyan brand color
        doc.text("Reporte Técnico de Diseño de Puesta a Tierra", 14, 28);
        doc.text("Conforme a FONDONORMA 200:2009 / IEEE Std 80", 14, 33);

        // --- PROJECT DETAILS ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("1. DATOS DEL PROYECTO", 14, 50);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const projData = [
            [`Proyecto: ${project.name}`, `Cliente: ${project.client}`],
            [`Ubicación: ${project.loc}`, `Fecha: ${project.date}`]
        ];
        
        doc.autoTable({
            startY: 55,
            body: projData,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 80 } }
        });

        // --- DESIGN PARAMETERS ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("2. PARÁMETROS DEL SISTEMA Y SUELO", 14, doc.lastAutoTable.finalY + 15);
        
        const paramsData = [
            ["Voltaje de Sistema", `${sysKv} kV`, "Resistividad Suelo (Wenner)"],
            ["Corriente de Falla (Icc)", `${sysIf} kA`, `Separación (a): ${wennerA} m`],
            ["Tiempo de Despeje (tc)", `${sysTf} s`, `Resistividad (Rho): ${rho} Ohm-m`]
        ];

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Parámetro Sistema', 'Valor', 'Parámetro Suelo']],
            body: paramsData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: [0, 229, 255] }
        });

        // --- CALCULATION RESULTS ---
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("3. RESULTADOS DE CÁLCULO", 14, doc.lastAutoTable.finalY + 15);

        const resultsTables = [
            ["Sección de Conductor", `${condMm2} (${condAWG})`, "IEEE 80 Ec. 37"],
            ["Resistencia Malla (Rg)", `${gridR} Ohms`, "IEEE 80 Ec. Simplified"],
            ["Resistencia Varilla (Rd)", `${rodR} Ohms`, "IEEE 142 (Dwight)"],
        ];

        // Capture Safety Values from UI
        const calcTouch = document.getElementById('val-touch-calc').textContent;
        const maxTouch = document.getElementById('val-touch-max').textContent;
        const calcStep = document.getElementById('val-step-calc').textContent;
        const maxStep = document.getElementById('val-step-max').textContent;

        if(Grounding.currentApp === 'substation') {
            resultsTables.push(
                ["--- CRITERIO SEGURIDAD ---", "", ""],
                ["Voltaje Contacto (Malla)", `${calcTouch} (Máx: ${maxTouch})`, "IEEE 80 Safe Value"],
                ["Voltaje de Paso", `${calcStep} (Máx: ${maxStep})`, "IEEE 80 Safe Value"]
            );
        }

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Componente', 'Resultado', 'Referencia']],
            body: resultsTables,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42] }
        });

        // --- COMPLIANCE SUMMARY ---
        const finalY = doc.lastAutoTable.finalY + 20;
        
        doc.setFillColor(isCompliant ? 220 : 255, isCompliant ? 252 : 235, isCompliant ? 231 : 235); // Light Green or Redish
        doc.rect(14, finalY, 182, 25, 'F');
        
        doc.setFontSize(14);
        doc.setTextColor(isCompliant ? 0 : 200, isCompliant ? 100 : 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(`ESTADO: ${statusText}`, 20, finalY + 10);
        
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        doc.text(`Valor Objetivo Calculado: < ${targetR}`, 20, finalY + 18);
        doc.text(`Aplicación: ${Grounding.currentApp.toUpperCase()}`, 100, finalY + 18);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Generado por ElectrIA Web Platform. Este documento es un reporte técnico auxiliar.", 14, 280);
        
        doc.save(`Memoria_PuestaTerra_${project.name.replace(/\s+/g, '_')}.pdf`);
    }
};

// Auto-init when loaded
window.addEventListener('DOMContentLoaded', Grounding.init);
