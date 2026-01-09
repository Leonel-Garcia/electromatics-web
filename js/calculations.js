/**
 * calculations.js
 * Core logic for Fondonorma 200-2009 Calculations
 */

const Calculations = {
    // Section 220: Residential Load Calculations (Fondonorma 200-2009)
    residential: {
        calculateLoad: (params) => {
            const {
                areaM2,
                smallApplianceCircuits = 2,
                laundryCircuits = 1,
                specialLoads = []  // Array of {name, va, type}
            } = params;
            
            // 1. LIGHTING LOAD (Art. 220.12) - 33 VA/m²
            const lightingLoad = areaM2 * 33;
            
            // 2. SMALL APPLIANCE CIRCUITS (Art. 220.52) - 1500 VA each, minimum 2
            const smallApplianceLoad = Math.max(smallApplianceCircuits, 2) * 1500;

            // 3. LAUNDRY CIRCUIT (Art. 220.52) - 1500 VA
            // Changed: Now included in the general demand factor group per Anexo D1
            const laundryLoad = laundryCircuits * 1500;
            
            // 4. GENERAL LOAD TOTAL (Lighting + Small Appliances + Laundry)
            const generalLoadTotal = lightingLoad + smallApplianceLoad + laundryLoad;
            
            // 5. APPLY DEMAND FACTORS (Table 220.42)
            let netGeneralLoad = 0;
            if (generalLoadTotal <= 3000) {
                netGeneralLoad = generalLoadTotal;
            } else if (generalLoadTotal <= 120000) {
                netGeneralLoad = 3000 + ((generalLoadTotal - 3000) * 0.35);
            } else {
                netGeneralLoad = 3000 + (117000 * 0.35) + ((generalLoadTotal - 120000) * 0.25);
            }
            
            // 6. PROCESS SPECIAL LOADS
            let rangeLoad = 0;
            let dryerLoad = 0;
            let fixedAppliances = [];
            let motorLoads = [];
            let hvacLoads = [];
            
            specialLoads.forEach(load => {
                if (load.type === 'range') {
                    // Electric Range - Use simplified Table 220.55
                    rangeLoad += 8000; // 8kVA per range (simplified for example)
                } else if (load.type === 'dryer') {
                    dryerLoad += load.va;
                } else if (load.type === 'motor' || load.type === 'pump' || load.type === 'ac') {
                    motorLoads.push({ name: load.name, va: load.va });
                } else if (load.type === 'hvac') {
                    hvacLoads.push({ name: load.name, va: load.va });
                } else {
                    // Fixed appliances: water heater, dishwasher, etc.
                    fixedAppliances.push({ name: load.name, va: load.va });
                }
            });
            
            // 7. FIXED APPLIANCES - Apply 75% demand if ≥4 (Art. 220.53)
            let fixedAppliancesTotal = fixedAppliances.reduce((sum, item) => sum + item.va, 0);
            const fixedAppliancesCount = fixedAppliances.length;
            if (fixedAppliancesCount >= 4) {
                fixedAppliancesTotal *= 0.75;
            }
            
            // 8. MOTOR LOADS - Largest @ 125%, others @ 100%
            let motorLoad = 0;
            if (motorLoads.length > 0) {
                motorLoads.sort((a, b) => b.va - a.va);
                const largest = motorLoads[0];
                const othersSum = motorLoads.slice(1).reduce((sum, item) => sum + item.va, 0);
                motorLoad = (largest.va * 1.25) + othersSum;
            }
            
            // 9. HVAC - Largest of heating/cooling @ 100%
            const hvacLoad = hvacLoads.length > 0 ? Math.max(...hvacLoads.map(h => h.va)) : 0;
            
            // 10. TOTAL DEMAND (Line-to-Line / Unbalanced)
            const totalDemandVA = netGeneralLoad + rangeLoad + dryerLoad + fixedAppliancesTotal + motorLoad + hvacLoad;
            
            // 11. SERVICE ENTRANCE CALCULATION (Single Phase 120/240V)
            const voltage = 240;
            const amps = totalDemandVA / voltage;
            const recommendedBreaker = Calculations.utils.getNextBreakerSize(amps);
            
            // 12. CONDUCTOR SIZE (125% for continuous loads - simplified assumption here)
            const conductorAmps = amps; 
            const wireSize = Calculations.utils.getWireSize(conductorAmps);

            // 13. NEUTRAL CALCULATION (Sec. 220.61)
            // Net General Load + 70% Range + 70% Dryer
            const neutralRange = rangeLoad * 0.70;
            const neutralDryer = dryerLoad * 0.70;
            const neutralTotalVA = netGeneralLoad + neutralRange + neutralDryer;
            const neutralAmps = neutralTotalVA / 240;
            const neutralWireSize = Calculations.utils.getWireSize(neutralAmps);
            
            return {
                // Input summary
                areaM2,
                smallApplianceCircuits,
                laundryCircuits,
                specialLoadsCount: specialLoads.length,
                
                // Load breakdown
                lightingLoad,
                smallApplianceLoad,
                laundryLoad,
                generalLoadTotal,
                netGeneralLoad,
                
                rangeLoad,
                dryerLoad,
                
                fixedAppliances,
                fixedAppliancesTotal,
                fixedAppliancesCount,
                
                motorLoads,
                motorLoad,
                
                hvacLoads,
                hvacLoad,
                
                // Neutral breakdown
                neutralRange,
                neutralDryer,
                neutralTotalVA,
                neutralAmps: parseFloat(neutralAmps.toFixed(1)),
                neutralWireSize,
                
                // Final results
                totalDemandVA,
                amps: parseFloat(amps.toFixed(1)),
                recommendedBreaker,
                wireSize,
                voltage,
                
                // Calculation details for display
                demandFactorApplied: generalLoadTotal > 3000,
                fixedAppliancesDemandApplied: fixedAppliancesCount >= 4
            };
        }
    },

    utils: {
        // Standard Breaker Sizes (NEC 240.6)
        breakerSizes: [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 800],

        getWireSize: (amps) => {
            // Tabla 310.16 FONDONORMA 200:2009
            // Ampacidades para conductores de cobre aislados (0-2000V, max 3 conductores, 30°C ambiente)
            // Criterio de selección de columna de temperatura:
            // - Por defecto: usar columna 60°C
            // - Si corriente > 100A: usar columna 75°C
            // ⚠️ CALIBRE MÍNIMO PERMITIDO: 12 AWG (no se permite 14 AWG)
            
            // Tabla 60°C (TW, UF)
            const wireTable60C = [
                { size: '12 AWG', amps: 25 },  // CALIBRE MÍNIMO PERMITIDO
                { size: '10 AWG', amps: 30 },
                { size: '8 AWG', amps: 40 },
                { size: '6 AWG', amps: 55 },
                { size: '4 AWG', amps: 70 },
                // 3 AWG removed per user request (not standard in Venezuela)
                { size: '2 AWG', amps: 95 },
                // 1 AWG removed per user request (not standard in Venezuela)
                { size: '1/0 AWG', amps: 125 },
                { size: '2/0 AWG', amps: 145 },
                { size: '3/0 AWG', amps: 165 },
                { size: '4/0 AWG', amps: 195 },
                { size: '250 MCM', amps: 215 },
                { size: '300 MCM', amps: 240 },
                { size: '350 MCM', amps: 260 },
                { size: '400 MCM', amps: 280 },
                { size: '500 MCM', amps: 320 }
            ];
            
            // Tabla 75°C (THW, THWN, THHN, XHHW)
            const wireTable75C = [
                { size: '12 AWG THHN', amps: 30 },  // CALIBRE MÍNIMO PERMITIDO
                { size: '10 AWG THHN', amps: 35 },
                { size: '8 AWG THHN', amps: 50 },
                { size: '6 AWG THHN', amps: 65 },
                { size: '4 AWG THHN', amps: 85 },
                // 3 AWG removed per user request (not standard in Venezuela)
                { size: '2 AWG THHN', amps: 115 },
                // 1 AWG removed per user request (not standard in Venezuela)
                { size: '1/0 AWG THHN', amps: 150 },
                { size: '2/0 AWG THHN', amps: 175 },
                { size: '3/0 AWG THHN', amps: 200 },
                { size: '4/0 AWG THHN', amps: 230 },
                { size: '250 MCM THHN', amps: 255 },
                { size: '300 MCM THHN', amps: 285 },
                { size: '350 MCM THHN', amps: 310 },
                { size: '400 MCM THHN', amps: 335 },
                { size: '500 MCM THHN', amps: 380 }
            ];
            
            // CRITERIO DE SELECCIÓN DE COLUMNA
            // Por defecto: 60°C. Si corriente > 100A: 75°C
            let wireTable;
            if (amps > 100) {
                wireTable = wireTable75C;
                console.log(`[WIRE SELECT] ${amps}A > 100A → Usando columna 75°C`);
            } else {
                wireTable = wireTable60C;
                console.log(`[WIRE SELECT] ${amps}A ≤ 100A → Usando columna 60°C`);
            }
            
            // Seleccionar cable donde: ampacidad > corriente (estrictamente mayor)
            // Esto garantiza: corriente < ampacidad
            const wire = wireTable.find(w => w.amps > amps);
            
            if (!wire) {
                return amps > 100 ? '>500 MCM THHN' : '>500 MCM';
            }
            
            // ⚠️ VALIDACIÓN: Asegurar que nunca se seleccione un calibre menor a 12 AWG
            if (wire.size.includes('14')) {
                console.warn(`[WIRE SELECT] ⚠️ Calibre 14 AWG detectado, forzando a 12 AWG mínimo`);
                return amps > 100 ? '12 AWG THHN' : '12 AWG';
            }
            
            console.log(`[WIRE SELECT] Corriente: ${amps}A → Cable: ${wire.size} (${wire.amps}A)`);
            return wire.size;
        },
        // Returns next higher standard size (Round UP) - For Branch Circuits (Exception 1)
        getNextBreakerSize: (amps) => {
            const size = Calculations.utils.breakerSizes.find(s => s >= amps);
            return size || '>800';
        },
        // Returns standard size not exceeding value (Round DOWN) - For Feeders (430.62)
        getStandardBreaker: (amps) => {
             let size = Calculations.utils.breakerSizes[0];
             for (let s of Calculations.utils.breakerSizes) {
                 if (s <= amps) size = s;
                 else break;
             }
             return size;
        }
    },

    // Section 430: Motors
    motors: {
        calculateMotor: (hp, voltage, phase, type = 'induction') => {
            // TABLA 430.248 - Motores Monofásicos AC (Full-Load Current Amperes)
            // TABLA 430.250 - Motores Trifásicos AC (Full-Load Current Amperes)
            // Valores según FONDONORMA 200:2009 / NEC
            const flcTable = {
                // MONOFÁSICOS - 120V (Tabla 430.248)
                '0.25-120-1ph': 5.8, '0.33-120-1ph': 7.2, '0.5-120-1ph': 9.8,
                '0.75-120-1ph': 13.8, '1-120-1ph': 16, '1.5-120-1ph': 20,
                '2-120-1ph': 24, '3-120-1ph': 34,
                
                // MONOFÁSICOS - 240V (Tabla 430.248)
                '0.25-240-1ph': 2.9, '0.33-240-1ph': 3.6, '0.5-240-1ph': 4.9,
                '0.75-240-1ph': 6.9, '1-240-1ph': 8, '1.5-240-1ph': 10,
                '2-240-1ph': 12, '3-240-1ph': 17, '5-240-1ph': 28,
                '7.5-240-1ph': 40, '10-240-1ph': 50,
                
                // TRIFÁSICOS - 208V (Tabla 430.250)
                '0.5-208-3ph': 2.4, '0.75-208-3ph': 3.5, '1-208-3ph': 4.6,
                '1.5-208-3ph': 6.6, '2-208-3ph': 7.5, '3-208-3ph': 10.6,
                '5-208-3ph': 16.7, '7.5-208-3ph': 24.2, '10-208-3ph': 30.8,
                '15-208-3ph': 46.2, '20-208-3ph': 59.4, '25-208-3ph': 74.8,
                '30-208-3ph': 88, '40-208-3ph': 114, '50-208-3ph': 143,
                '60-208-3ph': 169, '75-208-3ph': 211, '100-208-3ph': 273,
                '125-208-3ph': 343, '150-208-3ph': 396, '200-208-3ph': 528,
                
                // TRIFÁSICOS - 240V (Tabla 430.250)
                '0.5-240-3ph': 2.1, '0.75-240-3ph': 3.0, '1-240-3ph': 4.0,
                '1.5-240-3ph': 5.7, '2-240-3ph': 6.5, '3-240-3ph': 9.2,
                '5-240-3ph': 15.2, '7.5-240-3ph': 22, '10-240-3ph': 28,
                '15-240-3ph': 42, '20-240-3ph': 54, '25-240-3ph': 68,
                '30-240-3ph': 80, '40-240-3ph': 104, '50-240-3ph': 130,
                '60-240-3ph': 154, '75-240-3ph': 192, '100-240-3ph': 248,
                '125-240-3ph': 312, '150-240-3ph': 360, '200-240-3ph': 480,
                
                // TRIFÁSICOS - 460V (Tabla 430.250)
                '0.5-460-3ph': 1.1, '0.75-460-3ph': 1.6, '1-460-3ph': 2.1,
                '1.5-460-3ph': 3.0, '2-460-3ph': 3.4, '3-460-3ph': 4.8,
                '5-460-3ph': 7.6, '7.5-460-3ph': 11, '10-460-3ph': 14,
                '15-460-3ph': 21, '20-460-3ph': 27, '25-460-3ph': 34,
                '30-460-3ph': 40, '40-460-3ph': 52, '50-460-3ph': 65,
                '60-460-3ph': 77, '75-460-3ph': 96, '100-460-3ph': 124,
                '125-460-3ph': 156, '150-460-3ph': 180, '200-460-3ph': 240,
                '250-460-3ph': 302, '300-460-3ph': 361, '350-460-3ph': 414,
                '400-460-3ph': 477, '450-460-3ph': 515, '500-460-3ph': 590
            };
            
            // Construir clave de búsqueda
            let key = `${hp}-${voltage}`;
            if (phase === 3) key += '-3ph';
            else key += '-1ph';
            
            // Buscar FLC en tabla (Procedimiento según norma)
            let flc = flcTable[key];
            
            // DEBUG: Verificar búsqueda en tabla
            console.log(`[MOTOR CALC] HP: ${hp}, Voltage: ${voltage}, Phase: ${phase}`);
            console.log(`[MOTOR CALC] Key: "${key}", FLC from table: ${flc}`);
            
            // Si no existe en tabla, calcular aproximado
            if (!flc) {
                const watts = hp * 746;
                const pf = 0.85;
                const eff = 0.9;
                if (phase === 3) {
                    flc = watts / (voltage * Math.sqrt(3) * pf * eff);
                } else {
                    flc = watts / (voltage * pf * eff);
                }
                console.log(`[MOTOR CALC] FLC not in table, calculated: ${flc.toFixed(2)} A`);
            }
            
            // Conductor: 125% of FLC (430.22)
            const conductorAmps = flc * 1.25;
            const wireSize = Calculations.utils.getWireSize(conductorAmps);
            
            // Overload Protection (Thermal Relay): 115% of FLC (430.32)
            const overload = flc * 1.15;
            const relayRange = `${(flc * 1.0).toFixed(1)}-${(flc * 1.25).toFixed(1)}`; // Typical range
            
            // Short Circuit (Breaker): Inverse Time Breaker -> 250% of FLC (Table 430.52)
            const breakerMax = flc * 2.5;
            
            // Contactor: Min Capacity >= FLC (AC-3)
            const contactorAmps = Math.ceil(flc);

            return {
                flc: parseFloat(flc.toFixed(2)),
                conductorAmps: parseFloat(conductorAmps.toFixed(2)),
                wireSize: wireSize,
                overloadProtection: parseFloat(overload.toFixed(2)),
                relayRange: relayRange,
                contactorAmps: contactorAmps,
                breakerSize: Calculations.utils.getNextBreakerSize(breakerMax),
                references: {
                    conductor: 'Sec. 430.22',
                    ampacity: 'Tab. 310.16',
                    overload: 'Sec. 430.32',
                    breaker: 'Tab. 430.52',
                    contactor: 'NEMA/IEC AC-3'
                }
            };
        },

        calculateFeeder: (motors) => {
            if (!motors || motors.length === 0) return null;

            let largestMotorFLC = 0;
            let largestMotorIndex = -1;
            let sumOtherFLC = 0;
            
            // 1. Find Largest Motor by FLC
            motors.forEach((m, index) => {
                if (m.flc > largestMotorFLC) {
                    largestMotorFLC = m.flc;
                    largestMotorIndex = index;
                }
            });

            // 2. Calculate Sums
            let totalFLC = 0;
            motors.forEach((m, index) => {
                totalFLC += m.flc;
                if (index !== largestMotorIndex) {
                    sumOtherFLC += m.flc;
                }
            });

            // 3. Feeder Conductor (430.24): 125% Largest FLC + Sum of others
            const feederAmpacity = (largestMotorFLC * 1.25) + sumOtherFLC;
            const wireSize = Calculations.utils.getWireSize(feederAmpacity);

            // 4. Feeder Protection (430.62): Largest Branch Breaker + Sum of others FLC
            const largestMotorBreaker = parseFloat(motors[largestMotorIndex].breakerSize); 
            const feederProtectionMax = largestMotorBreaker + sumOtherFLC;

            return {
                largestMotorFLC,
                totalFLC,
                feederAmpacity: parseFloat(feederAmpacity.toFixed(2)),
                wireSize: wireSize,
                feederProtectionMax: parseFloat(feederProtectionMax.toFixed(2)),
                recommendedFeederBreaker: Calculations.utils.getStandardBreaker(feederProtectionMax),
                references: {
                    feeder: 'Sec. 430.24',
                    protection: 'Sec. 430.62'
                }
            };
        }
    },

    reports: {
        generatePDF: (data, type) => {
            if (!SimpleAuth.checkSubscription()) return;
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Header
            doc.setFillColor(22, 31, 41); // Dark Blue Background
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text("ElectrIA", 14, 20);
            
            doc.setFontSize(12);
            doc.setTextColor(0, 229, 255); // Electric Blue
            doc.text("Reporte Técnico - Fondonorma 200:2009", 14, 30);
            
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(10);
            doc.text(`Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 50);
            
            let title = "Resultados de Cálculo";
            let tableBody = [];
            let tableHead = [];

            if (type === 'residential') {
                title = "Cálculo de Cargas Residenciales (Sec. 220)";
                tableHead = [['Concepto', 'Valor', 'Unidad']];
                
                // Use stored calculation results if available
                let resData = data;
                if ((!resData || Object.keys(resData).length === 0) && typeof AIDispatcher !== 'undefined' && AIDispatcher.lastResidentialCalculation) {
                    resData = AIDispatcher.lastResidentialCalculation;
                }

                if (resData && Object.keys(resData).length > 0) {
                    // 1. MINIMUM CIRCUITS
                    tableBody.push(['--- 1. NÚMERO MÍNIMO DE CIRCUITOS ---', '', '']);
                    tableBody.push(['Carga Alumbrado General', `${resData.lightingLoad}`, 'VA']);
                    tableBody.push(['Circuitos Req. Alumbrado (15A)', `${Math.ceil(resData.lightingLoad/120/15)}`, 'Und']);
                    tableBody.push(['Circuitos Pequeños Artefactos', `${resData.smallApplianceCircuits}`, 'Und']);
                    tableBody.push(['Circuitos Lavandería', `${resData.laundryCircuits}`, 'Und']);
                    
                    // 2. FEEDER CALCULATION
                    tableBody.push(['', '', '']);
                    tableBody.push(['--- 2. CÁLCULO DEL ALIMENTADOR ---', '', '']);
                    tableBody.push(['Alumbrado General', `${resData.lightingLoad}`, 'VA']);
                    tableBody.push(['Pequeños Artefactos', `${resData.smallApplianceLoad}`, 'VA']);
                    tableBody.push(['Lavandería', `${resData.laundryLoad}`, 'VA']);
                    tableBody.push(['TOTAL CARGA GENERAL', `${resData.generalLoadTotal}`, 'VA']);
                    
                    // Demand Factors
                    tableBody.push(['Primeros 3000 VA @ 100%', '3000', 'VA']);
                    if (resData.generalLoadTotal > 3000) {
                        tableBody.push([`Resto (${resData.generalLoadTotal - 3000}) @ 35%`, `${Math.round(resData.netGeneralLoad - 3000)}`, 'VA']);
                    }
                    tableBody.push(['CARGA NETA GENERAL', `${resData.netGeneralLoad}`, 'VA']);
                    
                    // Special Loads
                    if (resData.rangeLoad > 0) tableBody.push(['Cocina Eléctrica', `${resData.rangeLoad}`, 'VA']);
                    if (resData.dryerLoad > 0) tableBody.push(['Secadora de Ropa', `${resData.dryerLoad}`, 'VA']);
                    
                    if (resData.fixedAppliances && resData.fixedAppliances.length > 0) {
                        resData.fixedAppliances.forEach(app => {
                            tableBody.push([`${app.name} (240V)`, `${app.va}`, 'VA']);
                        });
                        if (resData.fixedAppliancesCount >= 4) {
                            tableBody.push(['Factor Demanda Art. Fijos (75%)', `${resData.fixedAppliancesTotal}`, 'VA (Neto)']);
                        }
                    }
                    
                    if (resData.motorLoads && resData.motorLoads.length > 0) {
                        resData.motorLoads.forEach((motor, idx) => {
                            const label = idx === 0 ? `${motor.name} (Mayor @ 125%)` : motor.name;
                            const val = idx === 0 ? motor.va * 1.25 : motor.va;
                            tableBody.push([label, `${val}`, 'VA']);
                        });
                    }
                    
                    if (resData.hvacLoad > 0) tableBody.push(['Aire Acondicionado/Calefacción', `${resData.hvacLoad}`, 'VA']);
                    
                    tableBody.push(['', '', '']);
                    tableBody.push(['CARGA CALCULADA NETA', `${resData.totalDemandVA}`, 'VA']);
                    tableBody.push(['Corriente de Servicio (240V)', `${resData.amps}`, 'A']);
                    tableBody.push(['Conductor Fase Sugerido', `${resData.wireSize}`, 'AWG']);
                    
                    // 3. NEUTRAL CALCULATION
                    tableBody.push(['', '', '']);
                    tableBody.push(['--- 3. CÁLCULO DEL NEUTRO ---', '', '']);
                    tableBody.push(['Carga Neta General', `${resData.netGeneralLoad}`, 'VA']);
                    if (resData.rangeLoad > 0) tableBody.push(['Cocina (70%)', `${Math.round(resData.neutralRange)}`, 'VA']);
                    if (resData.dryerLoad > 0) tableBody.push(['Secadora (70%)', `${Math.round(resData.neutralDryer)}`, 'VA']);
                    
                    tableBody.push(['CARGA TOTAL NEUTRO', `${Math.round(resData.neutralTotalVA)}`, 'VA']);
                    tableBody.push(['Corriente Neutro (240V)', `${resData.neutralAmps}`, 'A']);
                    tableBody.push(['Conductor Neutro Sugerido', `${resData.neutralWireSize}`, 'AWG']);
                    
                } else {
                    // Fallback to empty or basic DOM scraping (deprecated but kept for safety)
                    tableBody = [['Error', 'No hay datos de cálculo disponibles', '']];
                }
            } else if (type === 'motor') {
                title = "Cálculo de Circuito Ramal de Motor (Sec. 430)";
                tableHead = [['Parámetro', 'Valor', 'Unidad']];
                tableBody = [
                    ['Corriente a Plena Carga (FLC)', data.flc, 'A'],
                    ['Capacidad del Conductor (125%)', data.conductorAmps, 'A'],
                    ['Protección de Sobrecarga', data.overloadProtection, 'A'],
                    ['Protección Cortocircuito (Breaker)', data.breakerSize, 'A']
                ];
            } else if (type === 'motor_feeder') {
                title = "Cálculo de Motores y Alimentador Principal (Sec. 430.24)";
                
                // Use stored calculation results if available
                if (typeof AIDispatcher !== 'undefined' && AIDispatcher.lastMotorCalculation) {
                    const { motorResults, motorInputs, feederRes } = AIDispatcher.lastMotorCalculation;
                    
                    motorResults.forEach((res, index) => {
                        const input = motorInputs[index];
                        const phaseText = input.phase === 3 ? 'Trifásico' : 'Monofásico';
                        
                        tableBody.push([`Motor ${index + 1}: ${input.hp}HP ${input.volt}V ${phaseText}`, '', '']);
                        tableBody.push(['  - FLC', res.flc, 'A']);
                        tableBody.push(['  - Conductor', `${res.conductorAmps} A (${res.wireSize})`, '']);
                        tableBody.push(['  - Breaker', res.breakerSize, 'A']);
                        tableBody.push(['  - Contactor', res.contactorAmps, 'A']);
                        tableBody.push(['  - Relé Térmico', `${res.overloadProtection} A (${res.relayRange})`, '']);
                    });
                    
                    tableBody.push(['', '', '']);
                    tableBody.push(['ALIMENTADOR PRINCIPAL', '', '']);
                    tableBody.push(['Corriente Alimentador', `${feederRes.feederAmpacity} A`, '']);
                    tableBody.push(['Conductor Alimentador', feederRes.wireSize, '']);
                    tableBody.push(['Protección Máxima', `${feederRes.feederProtectionMax} A`, '']);
                    tableBody.push(['Breaker Recomendado', `${feederRes.recommendedFeederBreaker} A`, '']);
                    
                    tableHead = [['Concepto', 'Valor', 'Unidad']];
                } else {
                    // Fallback: recalculate if stored data not available
                    const motorItems = document.querySelectorAll('.motor-item');
                    motorItems.forEach((item, index) => {
                        const hp = item.querySelector('.motor-hp').value;
                        const volt = item.querySelector('.motor-volt').value;
                        const phase = item.querySelector('.motor-phase').options[item.querySelector('.motor-phase').selectedIndex].text;
                        
                        const res = Calculations.motors.calculateMotor(hp, volt, item.querySelector('.motor-phase').value);
                        
                        tableBody.push([`Motor ${index + 1}: ${hp}HP ${volt}V ${phase}`, '', '']);
                        tableBody.push(['  - FLC', res.flc, 'A']);
                        tableBody.push(['  - Conductor', `${res.conductorAmps} A (${res.wireSize})`, '']);
                        tableBody.push(['  - Breaker', res.breakerSize, 'A']);
                        tableBody.push(['  - Contactor', res.contactorAmps, 'A']);
                        tableBody.push(['  - Relé Térmico', `${res.overloadProtection} A (${res.relayRange})`, '']);
                    });
                    
                    const feederAmps = document.getElementById('res-f-amps').textContent;
                    const feederWire = document.getElementById('res-f-wire').textContent;
                    const feederProt = document.getElementById('res-f-prot').textContent;
                    const feederBrk = document.getElementById('res-f-brk').textContent;
                    
                    tableBody.push(['', '', '']);
                    tableBody.push(['ALIMENTADOR PRINCIPAL', '', '']);
                    tableBody.push(['Corriente Alimentador', feederAmps, '']);
                    tableBody.push(['Conductor Alimentador', feederWire, '']);
                    tableBody.push(['Protección Máxima', feederProt, '']);
                    tableBody.push(['Breaker Recomendado', feederBrk, '']);
                    
                    tableHead = [['Concepto', 'Valor', 'Unidad']];
                }
            }

            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text(title, 14, 65);

            doc.autoTable({
                startY: 75,
                head: tableHead,
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [22, 31, 41], textColor: [0, 229, 255] },
                alternateRowStyles: { fillColor: [240, 240, 240] }
            });

            doc.save(`Reporte_ElectrIA_${type}_${Date.now()}.pdf`);
        },
        generateExcel: (data) => {
            if (!SimpleAuth.checkSubscription()) return;
            
            let wb = XLSX.utils.book_new();
            
            const motorList = document.getElementById('motor-list');
            if ((!data || Object.keys(data).length === 0) && motorList) {
                // PROFESSIONAL ELECTRICAL PANEL SCHEDULE
                const ws_data = [];
                
                // === HEADER SECTION ===
                ws_data.push(['CUADRO DE CARGAS / ELECTRICAL PANEL SCHEDULE']);
                ws_data.push(['']);
                ws_data.push(['PROYECTO:', 'Sistema de Motores Eléctricos', '', '', '', '', 'FECHA:', new Date().toLocaleDateString()]);
                ws_data.push(['NORMA:', 'FONDONORMA 200:2009', '', '', '', '', 'UBICACIÓN:', 'Panel de Motores']);
                ws_data.push(['']);
                
                // === MAIN BREAKER INFO ===
                const feederBrk = document.getElementById('res-f-brk')?.textContent || '0 A';
                const feederWire = document.getElementById('res-f-wire')?.textContent || '-';
                const feederAmps = document.getElementById('res-f-amps')?.textContent || '0 A';
                
                ws_data.push(['ALIMENTADOR PRINCIPAL']);
                ws_data.push(['Interruptor:', feederBrk, '', 'Conductor:', feederWire, '', 'Corriente:', feederAmps]);
                ws_data.push(['']);
                
                // === COLLECT MOTOR DATA ===
                const motorItems = document.querySelectorAll('.motor-item');
                const motors = [];
                
                // Use stored calculation results if available
                if (typeof AIDispatcher !== 'undefined' && AIDispatcher.lastMotorCalculation) {
                    const { motorResults, motorInputs } = AIDispatcher.lastMotorCalculation;
                    
                    motorResults.forEach((res, index) => {
                        const input = motorInputs[index];
                        const phaseText = input.phase === 3 ? 'Trifásico' : 'Monofásico';
                        
                        // Calculate power in kW and kVA
                        const powerKW = (input.hp * 0.746).toFixed(2);
                        const powerKVA = (res.flc * input.volt * (input.phase == 3 ? Math.sqrt(3) : 1) / 1000).toFixed(2);
                        
                        motors.push({
                            index: index + 1,
                            hp: input.hp,
                            powerKW: powerKW,
                            powerKVA: powerKVA,
                            volt: input.volt,
                            phase: phaseText,
                            phaseNum: input.phase,
                            poles: input.phase == 3 ? '3P' : (input.phase == 2 ? '2P' : '1P'),
                            breaker: res.breakerSize,
                            wire: res.wireSize,
                            flc: res.flc,
                            description: `MOTOR ${index + 1}`,
                            details: `${input.hp}HP - ${input.volt}V ${phaseText}`
                        });
                    });
                } else {
                    // Fallback: recalculate if stored data not available
                    motorItems.forEach((item, index) => {
                        const hp = parseFloat(item.querySelector('.motor-hp').value);
                        const volt = parseFloat(item.querySelector('.motor-volt').value);
                        const phaseVal = parseFloat(item.querySelector('.motor-phase').value);
                        const phase = item.querySelector('.motor-phase').options[item.querySelector('.motor-phase').selectedIndex].text;
                        
                        const res = Calculations.motors.calculateMotor(hp, volt, phaseVal);
                        
                        // Calculate power in kW and kVA
                        const powerKW = (hp * 0.746).toFixed(2);
                        const powerKVA = (res.flc * volt * (phaseVal == 3 ? Math.sqrt(3) : 1) / 1000).toFixed(2);
                        
                        motors.push({
                            index: index + 1,
                            hp: hp,
                            powerKW: powerKW,
                            powerKVA: powerKVA,
                            volt: volt,
                            phase: phase,
                            phaseNum: phaseVal,
                            poles: phaseVal == 3 ? '3P' : (phaseVal == 2 ? '2P' : '1P'),
                            breaker: res.breakerSize,
                            wire: res.wireSize,
                            flc: res.flc,
                            description: `MOTOR ${index + 1}`,
                            details: `${hp}HP - ${volt}V ${phase}`
                        });
                    });
                }
                
                // === PANEL SCHEDULE TABLE HEADER ===
                ws_data.push([
                    'DESCRIPCIÓN',      // Left description
                    'CARGA',            // Load (kVA)
                    'CIRCUITO',         // Circuit type
                    'CABLE',            // Wire size
                    'TIPO',             // Wire type
                    'BREAKER',          // Left breaker
                    'POLOS',            // Poles
                    'POS',              // Position ODD (left)
                    'POS',              // Position EVEN (right)
                    'POLOS',            // Poles
                    'BREAKER',          // Right breaker
                    'TIPO',             // Wire type
                    'CABLE',            // Wire size
                    'CIRCUITO',         // Circuit type
                    'CARGA',            // Load (kVA)
                    'DESCRIPCIÓN'       // Right description
                ]);
                
                // === UNITS ROW ===
                ws_data.push([
                    '',                 // Description
                    '(kVA)',           // Load unit
                    '',                // Circuit
                    '(AWG)',           // Cable
                    '',                // Type
                    '(A)',             // Breaker
                    '',                // Poles
                    'IMPAR',           // Odd positions
                    'PAR',             // Even positions
                    '',                // Poles
                    '(A)',             // Breaker
                    '',                // Type
                    '(AWG)',           // Cable
                    '',                // Circuit
                    '(kVA)',           // Load unit
                    ''                 // Description
                ]);
                
                
                // === DISTRIBUTE CIRCUITS SYMMETRICALLY ===
                // Each phase occupies one position
                // Motor 1 (3P): positions 1, 3, 5 (left)
                // Motor 2 (3P): positions 2, 4, 6 (right)
                // Motor 3 (3P): positions 7, 9, 11 (left)
                // etc.
                
                let currentPosLeft = 1;   // Odd positions for left side
                let currentPosRight = 2;  // Even positions for right side
                let motorIndex = 0;
                
                while (motorIndex < motors.length) {
                    const leftMotor = motors[motorIndex];
                    const rightMotor = motors[motorIndex + 1];
                    
                    // Determine how many rows we need (max phases between left and right)
                    const leftPhases = leftMotor ? leftMotor.phaseNum : 0;
                    const rightPhases = rightMotor ? rightMotor.phaseNum : 0;
                    const maxPhases = Math.max(leftPhases, rightPhases);
                    
                    // Generate rows for each phase
                    for (let phase = 0; phase < maxPhases; phase++) {
                        const isFirstRow = phase === 0;
                        const isLeftPhaseActive = leftMotor && phase < leftPhases;
                        const isRightPhaseActive = rightMotor && phase < rightPhases;
                        
                        const row = [
                            // LEFT SIDE - Only show info on first row
                            isFirstRow && leftMotor ? leftMotor.description : '',              // Description
                            isFirstRow && leftMotor ? leftMotor.powerKVA : '',                 // Load (kVA)
                            isFirstRow && leftMotor ? leftMotor.details : '',                  // Circuit details
                            isLeftPhaseActive ? leftMotor.wire.replace(' THHN', '') : '',      // Cable AWG
                            isLeftPhaseActive ? 'THHN' : '',                                   // Wire type
                            isFirstRow && leftMotor ? leftMotor.breaker : '',                  // Breaker (only first row)
                            isFirstRow && leftMotor ? leftMotor.poles : '',                    // Poles (only first row)
                            
                            // CENTER - Position LEFT (odd)
                            isLeftPhaseActive ? currentPosLeft + (phase * 2) : '',
                            
                            // CENTER - Position RIGHT (even)
                            isRightPhaseActive ? currentPosRight + (phase * 2) : '',
                            
                            // RIGHT SIDE (mirrored) - Only show info on first row
                            isFirstRow && rightMotor ? rightMotor.poles : '',                  // Poles (only first row)
                            isFirstRow && rightMotor ? rightMotor.breaker : '',                // Breaker (only first row)
                            isRightPhaseActive ? 'THHN' : '',                                  // Wire type
                            isRightPhaseActive ? rightMotor.wire.replace(' THHN', '') : '',    // Cable AWG
                            isFirstRow && rightMotor ? rightMotor.details : '',                // Circuit details
                            isFirstRow && rightMotor ? rightMotor.powerKVA : '',               // Load (kVA)
                            isFirstRow && rightMotor ? rightMotor.description : ''             // Description
                        ];
                        
                        ws_data.push(row);
                    }
                    
                    // Update position counters
                    currentPosLeft += leftPhases * 2;   // Skip by (phases * 2) for odd positions
                    currentPosRight += rightPhases * 2; // Skip by (phases * 2) for even positions
                    
                    motorIndex += 2; // Process two motors at a time (left and right)
                }

                
                // === SUMMARY SECTION ===
                ws_data.push(['']);
                ws_data.push(['RESUMEN DEL PANEL']);
                const totalPower = motors.reduce((sum, m) => sum + parseFloat(m.powerKW), 0).toFixed(2);
                const totalKVA = motors.reduce((sum, m) => sum + parseFloat(m.powerKVA), 0).toFixed(2);
                ws_data.push(['Total Circuitos:', motors.length, '', 'Potencia Instalada:', totalPower + ' kW', '', 'Carga Total:', totalKVA + ' kVA']);
                ws_data.push(['Alimentador:', feederWire, '', 'Protección:', feederBrk, '', 'Corriente:', feederAmps]);
                
                // === NOTES ===
                ws_data.push(['']);
                ws_data.push(['NOTAS:']);
                ws_data.push(['1. Cálculos según FONDONORMA 200:2009']);
                ws_data.push(['2. Conductores THHN/THWN-2, 75°C, cobre']);
                ws_data.push(['3. Tubería EMT (Electrical Metallic Tubing)']);
                ws_data.push(['4. Protecciones según Sección 430.32 y 430.52']);
                ws_data.push(['5. Alimentador según Sección 430.24']);
                
                // === CREATE WORKSHEET ===
                let ws = XLSX.utils.aoa_to_sheet(ws_data);
                
                // === COLUMN WIDTHS ===
                ws['!cols'] = [
                    { wch: 20 },  // Description (left)
                    { wch: 8 },   // Load
                    { wch: 20 },  // Circuit
                    { wch: 8 },   // Cable
                    { wch: 8 },   // Type
                    { wch: 10 },  // Breaker (left)
                    { wch: 7 },   // Poles
                    { wch: 6 },   // Position ODD
                    { wch: 6 },   // Position EVEN
                    { wch: 7 },   // Poles
                    { wch: 10 },  // Breaker (right)
                    { wch: 8 },   // Type
                    { wch: 8 },   // Cable
                    { wch: 20 },  // Circuit
                    { wch: 8 },   // Load
                    { wch: 20 }   // Description (right)
                ];
                
                // === MERGE CELLS ===
                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },  // Title
                    { s: { r: 5, c: 0 }, e: { r: 5, c: 15 } }   // Main breaker title
                ];
                
                XLSX.utils.book_append_sheet(wb, ws, "Panel Eléctrico");
                
            } else {
                // Fallback for other data types
                let ws_data = [['Parámetro', 'Valor']];
                for (const [key, value] of Object.entries(data)) {
                    ws_data.push([key, value]);
                }
                let ws = XLSX.utils.aoa_to_sheet(ws_data);
                XLSX.utils.book_append_sheet(wb, ws, "Resultados");
            }
            
            XLSX.writeFile(wb, `Panel_Electrico_ElectrIA_${Date.now()}.xlsx`);
        }
    }
};
