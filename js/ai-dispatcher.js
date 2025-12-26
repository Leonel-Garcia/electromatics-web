/**
 * ai-dispatcher.js
 * Handles Natural Language Processing (Regex-based) to dispatch commands
 */

const AIDispatcher = {
    init: () => {
        const input = document.getElementById('ai-input');
        const sendBtn = document.getElementById('ai-send');

        if (!input || !sendBtn) return;

        const handleSend = () => {
            const text = input.value.trim();
            if (!text) return;
            AIDispatcher.processCommand(text);
        };

        sendBtn.addEventListener('click', handleSend);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    },

    processCommand: (text) => {
        const responseArea = document.getElementById('ai-response-area');
        responseArea.innerHTML = ''; // Clear previous
        responseArea.classList.remove('visible');

        // Show "Thinking..."
        responseArea.innerHTML = `<div class="ai-message-bubble"><i class="fa-solid fa-circle-notch fa-spin"></i> Analizando solicitud...</div>`;
        responseArea.classList.add('visible');

        setTimeout(() => {
            const intent = AIDispatcher.detectIntent(text);
            AIDispatcher.executeIntent(intent, responseArea);
        }, 800);
    },

    detectIntent: (text) => {
        const lower = text.toLowerCase();

        // 1. Course Generation (Priority High)
        // Check this first so "curso de motores" doesn't trigger motor calculator
        if (lower.includes('curso') || lower.includes('aprender') || lower.includes('tutorial') || lower.includes('clase') || lower.includes('enseñame') || lower.includes('presentación') || lower.includes('diapositivas')) {
            return {
                type: 'COURSE_GENERATION',
                topic: text
            };
        }

        // 2. Motor Calculation
        if (lower.includes('motor') || lower.includes('bomba')) {
            const hpMatch = lower.match(/(\d+(\.\d+)?)\s*(hp|cv)/);
            const voltageMatch = lower.match(/(\d+)\s*v/);
            const phaseMatch = lower.includes('tri') || lower.includes('3') ? 3 : 1;

            return {
                type: 'MOTOR_CALC',
                params: {
                    hp: hpMatch ? parseFloat(hpMatch[1]) : null,
                    voltage: voltageMatch ? parseInt(voltageMatch[1]) : null,
                    phase: phaseMatch
                }
            };
        }

        // 3. Residential Calculation
        if (lower.includes('casa') || lower.includes('residencial') || lower.includes('vivienda') || 
            lower.includes('apartamento') || lower.includes('carga residencial') || 
            lower.includes('área') || lower.includes('area') && (lower.includes('m2') || lower.includes('m²') || lower.includes('metros'))) {
            const areaMatch = lower.match(/(\d+)\s*(m2|m²|mts|metros)/);
            return {
                type: 'RESIDENTIAL_CALC',
                params: {
                    area: areaMatch ? parseFloat(areaMatch[1]) : null
                }
            };
        }

        // 4. General Query
        return {
            type: 'QUERY',
            text: text
        };
    },

    executeIntent: (intent, container) => {
        container.innerHTML = ''; // Clear "Thinking..."

        if (intent.type === 'MOTOR_CALC') {
            AIDispatcher.renderMotorForm(intent.params, container);
        } else if (intent.type === 'RESIDENTIAL_CALC') {
            AIDispatcher.renderResidentialForm(intent.params, container);
        } else if (intent.type === 'COURSE_GENERATION') {
             container.innerHTML = `<div class="ai-message-bubble"><i class="fa-solid fa-graduation-cap fa-bounce"></i> Diseñando plan de estudios personalizado...</div>`;
             
             const prompt = `
                Genera un curso estructurado sobre: "${intent.topic}".
                Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin bloques de código) con esta estructura exacta:
                {
                    "title": "Título del Curso",
                    "description": "Breve descripción",
                    "modules": [
                        {
                            "title": "Título del Módulo",
                            "slides": [
                                {
                                    "type": "concept", 
                                    "title": "Título de la Diapositiva",
                                    "content": "Explicación clara y didáctica (máx 50 palabras).",
                                    "icon": "fa-solid fa-lightbulb" (elige un icono fontawesome v6 apropiado)
                                }
                            ]
                        }
                    ]
                }
                El curso debe tener al menos 3 módulos y 3 diapositivas por módulo.
             `;

             ElectrIA.getResponse(prompt).then(response => {
                try {
                    // Clean response if it contains markdown code blocks
                    const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
                    const courseData = JSON.parse(cleanJson);
                    AIDispatcher.renderCourseView(courseData, container);
                } catch (e) {
                    console.error("Error parsing course JSON", e);
                    container.innerHTML = `<div class="ai-message-bubble error">Error generando el curso. Intenta de nuevo con otro tema.</div>`;
                }
             });
        } else {
            // Use existing ElectrIA logic for general queries
            // Show loading state
            container.innerHTML = `<div class="ai-message-bubble"><i class="fa-solid fa-circle-notch fa-spin"></i> Consultando a ElectrIA...</div>`;
            
            ElectrIA.getResponse(intent.text).then(response => {
                const formattedResponse = response.replace(/\n/g, '<br>');
                container.innerHTML = `
                    <div class="ai-message-bubble">
                        <strong>ElectrIA:</strong> ${formattedResponse}
                    </div>
                `;
            });
        }
    },

    renderMotorForm: (params, container) => {
        // Initial motor params
        const hpValue = params.hp || '';
        const voltValue = params.voltage || '208';
        
        const html = `
            <div class="ai-message-bubble">
                <strong>ElectrIA:</strong> He detectado una consulta de motores. Puedes agregar varios motores para calcular sus circuitos ramales y el alimentador principal (Sec. 430.24).
            </div>
            <div class="calculation-card">
                <h3><i class="fa-solid fa-gears"></i> Cálculo de Motores y Alimentador</h3>
                
                <div id="motor-list">
                    <!-- Motor Item 1 -->
                    <div class="motor-item" data-index="0" style="border-bottom: 1px solid var(--border-color); padding-bottom: 15px; margin-bottom: 15px;">
                        <h4 style="margin-bottom: 10px; color: var(--electric-blue);">Motor 1</h4>
                        <div class="services-grid" style="grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Potencia (HP)</label>
                                <input type="number" class="motor-hp" value="${hpValue}" placeholder="Ej. 10">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Voltaje (V)</label>
                                <select class="motor-volt">
                                    <option value="120" ${voltValue == 120 ? 'selected' : ''}>120 V</option>
                                    <option value="208" ${voltValue == 208 ? 'selected' : ''}>208 V</option>
                                    <option value="240" ${voltValue == 240 ? 'selected' : ''}>240 V</option>
                                    <option value="460" ${voltValue == 460 ? 'selected' : ''}>460 V</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Fases</label>
                                <select class="motor-phase">
                                    <option value="1" ${params.phase === 1 ? 'selected' : ''}>Monofásico</option>
                                    <option value="3" ${params.phase === 3 ? 'selected' : ''}>Trifásico</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="btn btn-secondary" onclick="AIDispatcher.addMotorField()" style="padding: 8px 15px; font-size: 14px;">
                        <i class="fa-solid fa-plus"></i> Agregar Motor
                    </button>
                    <button class="btn btn-primary" onclick="AIDispatcher.runMultiMotorCalc()" style="flex: 1;">
                        Calcular Todo
                    </button>
                </div>
                
                <div id="disp-motor-results" class="hidden">
                    <hr style="border-color: var(--border-color); margin: 20px 0;">
                    
                    <!-- Branch Results Container -->
                    <div id="branch-results-container"></div>

                    <!-- Feeder Result -->
                    <div class="result-box" style="border-color: var(--safety-orange); background-color: rgba(255, 109, 0, 0.05); margin-top: 30px;">
                        <h4 style="color: var(--safety-orange); margin-bottom: 15px;"><i class="fa-solid fa-bolt"></i> Alimentador Principal (Sec. 430.24)</h4>
                        <div class="services-grid" style="grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div><small>Corriente Alimentador</small><span class="result-value" id="res-f-amps" style="color: var(--safety-orange);">0 A</span></div>
                            <div><small>Conductor Alimentador</small><span class="result-value" id="res-f-wire" style="color: var(--safety-orange);">-</span></div>
                            <div><small>Protección Máxima</small><span class="result-value" id="res-f-prot" style="color: var(--safety-orange);">0 A</span></div>
                            <div style="grid-column: span 2;"><small>Breaker Recomendado</small><span class="result-value" id="res-f-brk" style="font-size: 28px;">0 A</span></div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button class="btn btn-secondary" onclick="Calculations.reports.generatePDF({}, 'motor_feeder')"><i class="fa-solid fa-file-pdf"></i> Reporte PDF</button>
                        <button class="btn btn-primary" onclick="Calculations.reports.generateExcel({})"><i class="fa-solid fa-file-excel"></i> Exportar Excel</button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;

        // Auto-run if we have HP
        if (params.hp) {
            setTimeout(AIDispatcher.runMultiMotorCalc, 100);
        }
    },

    addMotorField: () => {
        const list = document.getElementById('motor-list');
        const count = list.children.length + 1;
        const div = document.createElement('div');
        div.className = 'motor-item';
        div.style.cssText = 'border-bottom: 1px solid var(--border-color); padding-bottom: 15px; margin-bottom: 15px; animation: fadeIn 0.3s;';
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="color: var(--electric-blue); margin: 0;">Motor ${count}</h4>
                <button onclick="this.closest('.motor-item').remove()" style="background:none; border:none; color: #FF5252; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="services-grid" style="grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label>Potencia (HP)</label>
                    <input type="number" class="motor-hp" placeholder="Ej. 5">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label>Voltaje (V)</label>
                    <select class="motor-volt">
                        <option value="208">208 V</option>
                        <option value="240">240 V</option>
                        <option value="460">460 V</option>
                        <option value="120">120 V</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label>Fases</label>
                    <select class="motor-phase">
                        <option value="3">Trifásico</option>
                        <option value="1">Monofásico</option>
                    </select>
                </div>
            </div>
        `;
        list.appendChild(div);
    },

    runMultiMotorCalc: () => {
        const items = document.querySelectorAll('.motor-item');
        const resultsContainer = document.getElementById('branch-results-container');
        resultsContainer.innerHTML = '';
        
        const motorResults = [];
        const motorInputs = []; // Store input parameters for reports

        items.forEach((item, index) => {
            const hp = parseFloat(item.querySelector('.motor-hp').value);
            const volt = parseFloat(item.querySelector('.motor-volt').value);
            const phase = parseFloat(item.querySelector('.motor-phase').value);

            if (!hp) return;

            const res = Calculations.motors.calculateMotor(hp, volt, phase);
            motorResults.push(res);
            
            // Store inputs for report generation
            motorInputs.push({ hp, volt, phase });

            // Render Branch Result
            const resHtml = `
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px;">
                    <strong style="color: var(--text-primary);">Motor ${index + 1} (${hp}HP):</strong>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 5px; font-size: 0.9em;">
                        <div>FLC: <span style="color: var(--electric-blue);">${res.flc} A</span></div>
                        <div>Breaker: <span style="color: var(--electric-blue);">${res.breakerSize} A</span></div>
                        <div>Conductor: <span style="color: var(--electric-blue);">${res.conductorAmps} A (${res.wireSize})</span></div>
                        <div>Contactor: <span style="color: var(--electric-blue);">${res.contactorAmps} A</span></div>
                        <div style="grid-column: span 2;">Relé Térmico: <span style="color: var(--electric-blue);">${res.overloadProtection} A (Rango: ${res.relayRange})</span></div>
                        <div style="grid-column: span 2; font-size: 0.8em; color: var(--text-secondary);">
                            Refs: ${res.references.conductor}, ${res.references.overload}
                        </div>
                    </div>
                </div>
            `;
            resultsContainer.innerHTML += resHtml;
        });

        if (motorResults.length === 0) return;

        // Feeder Calculation
        const feederRes = Calculations.motors.calculateFeeder(motorResults);

        // Store all calculation data globally for report generation
        AIDispatcher.lastMotorCalculation = {
            motorResults,
            motorInputs,
            feederRes,
            timestamp: Date.now()
        };

        if (feederRes) {
            document.getElementById('res-f-amps').textContent = feederRes.feederAmpacity + ' A';
            document.getElementById('res-f-wire').textContent = feederRes.wireSize;
            document.getElementById('res-f-prot').textContent = feederRes.feederProtectionMax + ' A';
            document.getElementById('res-f-brk').textContent = feederRes.recommendedFeederBreaker + ' A';
            
            document.getElementById('disp-motor-results').classList.remove('hidden');
        }
    },

    renderResidentialForm: (params, container) => {
        const areaValue = params.area || '';
        const uid = Date.now(); // Unique ID for this form instance

        const html = `
            <div class="ai-message-bubble">
                <strong>Electr IA:</strong> Entendido, cálculo residencial (Sec. 220). ${params.area ? `Para <strong>${params.area} m²</strong>.` : '¿Cuál es el área de la vivienda?'}
            </div>
            <div class="calculation-card" id="calc-card-${uid}">
                <h3><i class="fa-solid fa-house-signal"></i> Carga Residencial (Sección 220)</h3>
                
                <!-- Basic Information -->
                <div style="margin-bottom: 20px;">
                    <h4 style="color: var(--electric-blue);"><i class="fa-solid fa-info-circle"></i> Información Básica</h4>
                    <div class="services-grid" style="grid-template-columns: repeat(3, 1fr); gap: 15px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label>Área (m²)</label>
                            <input type="number" id="res-area-${uid}" value="${areaValue}" placeholder="100" min="1">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label>Ctos. Pequeños Artefactos</label>
                            <input type="number" id="res-small-${uid}" value="2" min="2">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label>Ctos. Lavandería</label>
                            <input type="number" id="res-laundry-${uid}" value="1" min="1">
                        </div>
                    </div>
                </div>

                <!-- Typical Loads -->
                <div style="margin-bottom: 20px;">
                    <h4 style="color: var(--electric-blue);"><i class="fa-solid fa-bolt"></i> Cargas Típicas</h4>
                    <div id="typical-loads-${uid}" class="services-grid" style="grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        <!-- Will be populated by renderTypicalLoads() -->
                    </div>
                </div>

                <!-- Custom Loads -->
                <div style="margin-bottom: 20px;">
                    <h4 style="color: var(--safety-orange);"><i class="fa-solid fa-plus-circle"></i> Cargas Personalizadas</h4>
                    <div id="custom-loads-${uid}" style="margin-bottom: 10px;">
                        <!-- Custom loads will be added here -->
                    </div>
                    <button class="btn btn-secondary" onclick="AIDispatcher.addCustomLoad('${uid}')" style="font-size: 14px;">
                        <i class="fa-solid fa-plus"></i> Agregar Carga
                    </button>
                </div>

                <button class="btn btn-primary" style="width: 100%; padding: 14px;" onclick="AIDispatcher.runResCalc('${uid}')">
                    <i class="fa-solid fa-calculator"></i> Calcular Demanda
                </button>

                <!-- Results -->
                <div id="disp-res-results-${uid}" class="hidden">
                    <hr style="border-color: var(--border-color); margin: 20px 0;">
                    <h4 style="color: var(--safety-orange);"><i class="fa-solid fa-chart-line"></i> Resultados</h4>
                    
                    <div id="res-breakdown-${uid}" style="margin-bottom: 15px;"></div>
                    
                    <div class="services-grid" style="grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
                        <div class="result-box" style="border-color: var(--safety-orange);">
                            <small>Demanda Total</small>
                            <span class="result-value" id="res-total-va-${uid}" style="color: var(--safety-orange);">0 VA</span>
                        </div>
                        <div class="result-box" style="border-color: var(--safety-orange);">
                            <small>Corriente de Servicio</small>
                            <span class="result-value" id="res-total-amps-${uid}" style="color: var(--safety-orange);">0 A</span>
                        </div>
                        <div class="result-box">
                            <small>Breaker Acometida</small>
                            <span class="result-value" id="res-breaker-${uid}">0 A</span>
                        </div>
                        <div class="result-box">
                            <small>Conductor Acometida</small>
                            <span class="result-value" id="res-wire-${uid}">-</span>
                        </div>
                    </div>
                    
                    <div style="text-align: right;">
                        <button class="btn btn-secondary" onclick="Calculations.reports.generatePDF({}, 'residential')">
                            <i class="fa-solid fa-file-pdf"></i> Reporte PDF
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;

        // Render typical loads
        AIDispatcher.renderTypicalLoads(uid);

        if (params.area) {
            setTimeout(() => AIDispatcher.runResCalc(uid), 100);
        }
    },

    renderTypicalLoads: (uid) => {
        const typicalLoads = [
            { name: 'Cocina Eléctrica', va: 12000, type: 'range', icon: 'fire-burner' },
            { name: 'Calentador de Agua', va: 4500, type: 'fixed', icon: 'shower' },
            { name: 'Secadora de Ropa', va: 5500, type: 'dryer', icon: 'wind' },
            { name: 'Lavaplatos', va: 1500, type: 'fixed', icon: 'sink' },
            { name: 'Triturador Basura', va: 1000, type: 'fixed', icon: 'recycle' },
            { name: 'Aire Acondicionado (3HP)', va: 3600, type: 'ac', icon: 'snowflake' },
            { name: 'Bomba Hidroneumática (1HP)', va: 930, type: 'pump', icon: 'pump' },
            { name: 'Calefacción', va: 5000, type: 'hvac', icon: 'temperature-high' }
        ];

        const container = document.getElementById(`typical-loads-${uid}`);
        if (!container) return;

        container.innerHTML = typicalLoads.map((load, index) => `
            <div style="display: flex; align-items: center; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px;">
                <input type="checkbox" id="load-${uid}-${index}" data-name="${load.name}" data-va="${load.va}" data-type="${load.type}" style="margin-right: 10px;">
                <label for="load-${uid}-${index}" style="flex: 1; cursor: pointer; margin: 0;">
                    <i class="fa-solid fa-${load.icon}" style="margin-right: 8px; color: var(--electric-blue);"></i>
                    ${load.name} <small style="color: var(--text-secondary);">(${load.va} VA)</small>
                </label>
            </div>
        `).join('');
    },

    addCustomLoad: (uid) => {
        const container = document.getElementById(`custom-loads-${uid}`);
        if (!container) return;
        
        const id = Date.now();
        
        const loadHtml = `
            <div class="custom-load-item" id="custom-${id}" style="display: flex; gap: 10px; margin-bottom: 10px; padding: 10px; background: rgba(255,152,0,0.1); border-radius: 6px; border-left: 3px solid var(--safety-orange);">
                <input type="text" placeholder="Nombre" class="custom-name" style="flex: 2;" value="Carga Personalizada">
                <input type="number" placeholder="VA" class="custom-va" style="flex: 1;" value="1000">
                <select class="custom-type" style="flex: 1;">
                    <option value="fixed">Artefacto Fijo</option>
                    <option value="motor">Motor</option>
                    <option value="pump">Bomba</option>
                    <option value="ac">A/C</option>
                    <option value="hvac">Calefacción</option>
                    <option value="range">Cocina</option>
                    <option value="dryer">Secadora</option>
                </select>
                <button class="btn btn-secondary" onclick="AIDispatcher.removeCustomLoad('${id}')" style="padding: 8px 12px; font-size: 12px;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', loadHtml);
    },

    removeCustomLoad: (id) => {
        const element = document.getElementById(`custom-${id}`);
        if (element) element.remove();
    },

    runResCalc: (uid) => {
        const area = parseFloat(document.getElementById(`res-area-${uid}`).value);
        const small = parseFloat(document.getElementById(`res-small-${uid}`).value);
        const laundry = parseFloat(document.getElementById(`res-laundry-${uid}`).value);

        if (!area) {
            alert('Por favor ingresa el área de la vivienda');
            return;
        }

        // Collect typical loads
        const specialLoads = [];
        const typicalContainer = document.getElementById(`typical-loads-${uid}`);
        if (typicalContainer) {
            typicalContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                specialLoads.push({
                    name: cb.dataset.name,
                    va: parseFloat(cb.dataset.va),
                    type: cb.dataset.type
                });
            });
        }

        // Collect custom loads
        const customContainer = document.getElementById(`custom-loads-${uid}`);
        if (customContainer) {
            customContainer.querySelectorAll('.custom-load-item').forEach(item => {
                const name = item.querySelector('.custom-name').value;
                const va = parseFloat(item.querySelector('.custom-va').value);
                const type = item.querySelector('.custom-type').value;
                
                if (name && va) {
                    specialLoads.push({ name, va, type });
                }
            });
        }

        // Calculate
        const res = Calculations.residential.calculateLoad({
            areaM2: area,
            smallApplianceCircuits: small,
            laundryCircuits: laundry,
            specialLoads: specialLoads
        });

        // Store results for reports
        AIDispatcher.lastResidentialCalculation = res;

        // --- GENERATE ANEXO D1 STYLE OUTPUT ---
        
        // Helper for formatting numbers
        const fmt = (n) => n.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        const fmtDec = (n) => n.toLocaleString('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

        let html = `
            <div style="font-family: 'Courier New', monospace; background: #f5f5f5; color: #333; padding: 20px; border-radius: 4px; font-size: 13px; line-height: 1.4;">
                
                <!-- 1. MINIMUM CIRCUITS -->
                <div style="margin-bottom: 20px;">
                    <h4 style="text-decoration: underline; margin-bottom: 10px; color: #000;">Número Mínimo de Circuitos Ramales Requeridos</h4>
                    <div>Carga de Alumbrado General: ${fmt(res.lightingLoad)} VA / 120 V = ${fmtDec(res.lightingLoad/120)} A</div>
                    <div style="margin-left: 20px; margin-top: 5px;">
                        • Esto requiere ${Math.ceil(res.lightingLoad/120/15)} circuitos de 15 A ó ${Math.ceil(res.lightingLoad/120/20)} circuitos de 20 A.
                    </div>
                    <div style="margin-top: 5px;">Carga de Pequeños Artefactos: ${res.smallApplianceCircuits} circuitos, 2 hilos, 20 A.</div>
                    <div>Carga del Lavadero: ${res.laundryCircuits} circuito, 2 hilos, 20 A.</div>
                    <div>Circuito Ramal de Baño: 1 circuito, 2 hilos, 20 A (no requiere cálculo adicional).</div>
                </div>

                <!-- 2. FEEDER CALCULATION -->
                <div style="margin-bottom: 20px;">
                    <h4 style="text-decoration: underline; margin-bottom: 10px; color: #000;">Calibre Mínimo de los Alimentadores Requeridos</h4>
                    
                    <div style="display: flex; justify-content: space-between;">
                        <span>Alumbrado General</span>
                        <span>${fmt(res.lightingLoad)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Pequeños Artefactos</span>
                        <span>${fmt(res.smallApplianceLoad)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #999;">
                        <span>Lavadero</span>
                        <span>${fmt(res.laundryLoad)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="margin-left: auto; margin-right: 20px;">Total</span>
                        <span>${fmt(res.generalLoadTotal)}</span>
                    </div>

                    <!-- Demand Factors -->
                    <div style="display: flex; justify-content: space-between;">
                        <span>3.000 VA a 100%</span>
                        <span>3.000</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #999;">
                        <span>${fmt(res.generalLoadTotal)} VA - 3.000 VA = ${fmt(res.generalLoadTotal - 3000)} VA a 35%</span>
                        <span>${fmt(res.netGeneralLoad - 3000)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="margin-left: auto; margin-right: 20px;">Carga Neta</span>
                        <span>${fmt(res.netGeneralLoad)}</span>
                    </div>

                    <!-- Special Loads -->
                    ${res.rangeLoad > 0 ? `
                    <div style="display: flex; justify-content: space-between;">
                        <span>Cocina (véase Tabla 220.55)</span>
                        <span>${fmt(res.rangeLoad)}</span>
                    </div>` : ''}
                    
                    ${res.dryerLoad > 0 ? `
                    <div style="display: flex; justify-content: space-between;">
                        <span>Secadora de Ropa (véase Tabla 220.54)</span>
                        <span>${fmt(res.dryerLoad)}</span>
                    </div>` : ''}

                    ${res.fixedAppliancesTotal > 0 ? `
                    <!-- Fixed Appliances List -->
                    ${res.fixedAppliances.map(app => `
                    <div style="display: flex; justify-content: space-between;">
                        <span>${app.name} (240 V)</span>
                        <span>${fmt(app.va)}</span>
                    </div>`).join('')}
                    
                    ${res.fixedAppliancesCount >= 4 ? `
                    <div style="display: flex; justify-content: space-between; font-style: italic;">
                        <span>Factor de Demanda (75% por ≥4 artefactos fijos)</span>
                        <span>${fmt(res.fixedAppliancesTotal)} (Total Ajustado)</span>
                    </div>` : ''}
                    ` : ''}

                    ${res.motorLoad > 0 ? `
                    <!-- Motor Loads List -->
                    ${res.motorLoads.map((motor, idx) => `
                    <div style="display: flex; justify-content: space-between;">
                        <span>${motor.name} (240 V)${idx === 0 ? ' [Mayor @ 125%]' : ''}</span>
                        <span>${idx === 0 ? fmt(motor.va * 1.25) : fmt(motor.va)}</span>
                    </div>`).join('')}
                    
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #ddd;">
                        <span>Total Cargas de Motor</span>
                        <span>${fmt(res.motorLoad)}</span>
                    </div>
                    ` : ''}

                    ${res.hvacLoad > 0 ? `
                    <div style="display: flex; justify-content: space-between;">
                        <span>Aire Acondicionado / Calefacción (240 V)</span>
                        <span>${fmt(res.hvacLoad)}</span>
                    </div>` : ''}

                    <div style="display: flex; justify-content: space-between; border-top: 2px solid #000; margin-top: 5px; padding-top: 5px; font-weight: bold;">
                        <span>Carga Calculada Neta</span>
                        <span>${fmt(res.totalDemandVA)}</span>
                    </div>
                </div>

                <!-- 3. SERVICE CALCULATION -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; color: #000;">Carga Calculada Neta para 120/240 V, 3 hilos, acometida o alimentador monofásico</h4>
                    <div style="text-align: center; font-weight: bold; margin: 15px 0;">
                        ${fmt(res.totalDemandVA)} VA / 240 V = ${fmtDec(res.amps)} A
                    </div>
                    <div style="background: #e8f5e9; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                        <strong>Conductor de Fase Sugerido:</strong> ${res.wireSize} (Cu, THHN/THWN)
                    </div>
                    <div>
                        De acuerdo con 230.42(B) y 230.79 se requiere conductores de acometida y medios de desconexión de régimen no menor de 100 A (si aplica).
                    </div>
                </div>

                <!-- 4. NEUTRAL CALCULATION -->
                <div style="margin-bottom: 10px;">
                    <h4 style="text-decoration: underline; margin-bottom: 10px; color: #000;">Cálculo del Neutro del Alimentador y Acometida</h4>
                    
                    <div style="display: flex; justify-content: space-between;">
                        <span>Alumbrado y pequeños artefactos (Carga Neta)</span>
                        <span>${fmt(res.netGeneralLoad)}</span>
                    </div>

                    ${res.rangeLoad > 0 ? `
                    <div style="display: flex; justify-content: space-between;">
                        <span>Cocina Eléctrica: ${fmt(res.rangeLoad)} a 70% (véase 220.61)</span>
                        <span>${fmt(res.neutralRange)}</span>
                    </div>` : ''}

                    ${res.dryerLoad > 0 ? `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #999;">
                        <span>Secadora: ${fmt(res.dryerLoad)} a 70% (véase 220.61)</span>
                        <span>${fmt(res.neutralDryer)}</span>
                    </div>` : ''}

                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <span style="margin-left: auto; margin-right: 20px;">Total</span>
                        <span>${fmt(res.neutralTotalVA)}</span>
                    </div>

                    <h4 style="margin-bottom: 5px; color: #000;">Carga Calculada para el Neutro</h4>
                    <div style="font-weight: bold; margin-bottom: 10px;">
                        ${fmt(res.neutralTotalVA)} VA / 240 V = ${fmtDec(res.neutralAmps)} A
                    </div>
                    <div style="background: #e3f2fd; padding: 10px; border-radius: 4px;">
                        <strong>Conductor Neutro Sugerido:</strong> ${res.neutralWireSize} (Cu, THHN/THWN)
                    </div>
                </div>

            </div>
        `;

        // Inject into results area
        document.getElementById(`res-breakdown-${uid}`).innerHTML = html;
        
        // Hide the old summary boxes since we have the full report now, or keep them as quick summary?
        // The user wants the output "segun este formato", so the detailed view is primary.
        // We can hide the default boxes to avoid confusion or redundancy.
        const summaryBoxes = document.querySelector(`#disp-res-results-${uid} .services-grid`);
        if(summaryBoxes) summaryBoxes.style.display = 'none';

        document.getElementById(`disp-res-results-${uid}`).classList.remove('hidden');
    },

    renderCourseView: (courseData, container) => {
        // Flatten slides for linear navigation
        const allSlides = [];
        courseData.modules.forEach(mod => {
            // Module Intro Slide
            allSlides.push({
                isModuleIntro: true,
                title: mod.title,
                content: `Módulo: ${mod.title}`,
                icon: "fa-solid fa-layer-group",
                color: "#1e293b"
            });
            mod.slides.forEach(slide => allSlides.push(slide));
        });

        const uid = Date.now();
        let currentSlideIdx = 0;

        // Visual Assets (Gradients)
        const gradients = [
            'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', // Default Dark
            'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', // Teal/Dark
            'linear-gradient(135deg, #1a2a6c 0%, #b21f1f 100%, #fdbb2d 100%)', // Tri-color (too loud?) -> No, use safer:
            'linear-gradient(135deg, #000428 0%, #004e92 100%)', // Deep Blue
            'linear-gradient(135deg, #373B44 0%, #4286f4 100%)' // Grey-Blue
        ];

        const renderSlide = () => {
             const slide = allSlides[currentSlideIdx];
             const progress = ((currentSlideIdx + 1) / allSlides.length) * 100;
             const isIntro = slide.isModuleIntro;
             
             // Choose a random gradient for intros, or sticky for content? Let's use deep blue for content, fancy for intro
             const bgStyle = isIntro ? 
                `background: ${gradients[1]};` : 
                `background: ${gradients[3]};`;
                
             const slideHtml = `
                <div class="course-player" id="course-${uid}" style="${bgStyle} border-radius: 15px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); position: relative;">
                    
                    <!-- Decorative Background Icon (Watermark) -->
                    <i class="${slide.icon || 'fa-solid fa-lightbulb'}" style="position: absolute; top: 10%; right: -5%; font-size: 300px; color: rgba(255,255,255,0.03); transform: rotate(-15deg); pointer-events: none;"></i>

                    <!-- Header -->
                    <div style="padding: 20px 30px; background: rgba(0,0,0,0.3); display: flex; justify-content: space-between; align-items: center; backdrop-filter: blur(5px);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: var(--safety-orange); font-weight: 800; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">ELECTRMATICS IA</span>
                            <span style="background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; font-size: 10px; color: #fff;">BETA</span>
                        </div>
                        <span style="color: #fff; font-weight: 500; font-family: monospace;">SLIDE ${currentSlideIdx + 1} / ${allSlides.length}</span>
                    </div>
                    
                    <!-- Progress Bar -->
                    <div style="height: 6px; background: rgba(0,0,0,0.4); width: 100%;">
                        <div style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, var(--safety-orange), #ff5722); transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 10px rgba(255, 87, 34, 0.5);"></div>
                    </div>

                    <!-- Slide Content Area -->
                    <div style="padding: 50px; min-height: 350px; display: flex; flex-direction: column; justify-content: center; text-align: center; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); position: relative; z-index: 2;">
                        
                        ${isIntro ? 
                            `<div style="margin-bottom: 30px;">
                                <div style="width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-shadow: 0 0 20px rgba(255,255,255,0.1);">
                                    <i class="${slide.icon}" style="font-size: 40px; color: #FFD700;"></i>
                                </div>
                             </div>` 
                            : 
                            `<div style="font-size: 48px; color: var(--electric-blue); margin-bottom: 25px; text-shadow: 0 0 20px rgba(0, 180, 216, 0.4);">
                                <i class="${slide.icon || 'fa-solid fa-star'}"></i>
                             </div>`
                        }

                        <h2 style="color: #fff; font-size: ${isIntro ? '36px' : '28px'}; margin-bottom: 25px; font-weight: 700; line-height: 1.2; letter-spacing: -0.5px;">${slide.title}</h2>
                        
                        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; border-left: 4px solid ${isIntro ? 'var(--safety-orange)' : 'var(--electric-blue)'}; max-width: 80%; margin: 0 auto;">
                            <p style="color: #e2e8f0; font-size: 18px; line-height: 1.7; font-weight: 400; margin: 0;">${slide.content}</p>
                        </div>

                    </div>

                    <!-- Controls -->
                    <div style="padding: 25px; background: rgba(0,0,0,0.3); display: flex; justify-content: space-between; gap: 20px; backdrop-filter: blur(5px); border-top: 1px solid rgba(255,255,255,0.05);">
                        <button class="nav-btn prev" ${currentSlideIdx === 0 ? 'disabled style="opacity:0.3; cursor: not-allowed;"' : ''} style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 12px 25px; border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                            <i class="fa-solid fa-chevron-left"></i> Anterior
                        </button>
                        <button class="nav-btn next" style="background: var(--electric-blue); border: none; color: white; padding: 12px 30px; border-radius: 10px; cursor: pointer; flex: 1; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(0, 180, 216, 0.3); transition: transform 0.2s;">
                            ${currentSlideIdx === allSlides.length - 1 ? 'Finalizar Curso <i class="fa-solid fa-flag-checkered"></i>' : 'Siguiente <i class="fa-solid fa-arrow-right"></i>'}
                        </button>
                    </div>
                </div>
                
                <style>
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .nav-btn:hover:not(:disabled) {
                        transform: translateY(-2px);
                        filter: brightness(1.1);
                    }
                    .nav-btn:active:not(:disabled) {
                        transform: translateY(0);
                    }
                </style>
             `;
             
             container.innerHTML = slideHtml;

             // Re-attach listeners after render
             const player = document.getElementById(`course-${uid}`);
             player.querySelector('.prev').onclick = () => {
                 if(currentSlideIdx > 0) {
                     currentSlideIdx--;
                     renderSlide();
                 }
             };
             player.querySelector('.next').onclick = () => {
                 if(currentSlideIdx < allSlides.length - 1) {
                     currentSlideIdx++;
                     renderSlide();
                 } else {
                     // Finish screen
                     container.innerHTML = `
                        <div class="ai-message-bubble" style="text-align: center; padding: 40px; background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%); border-radius: 20px; color: white;">
                            <i class="fa-solid fa-trophy" style="font-size: 60px; color: #FFD700; margin-bottom: 20px; filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.5));"></i>
                            <h3 style="font-size: 28px; margin-bottom: 10px;">¡Curso Completado!</h3>
                            <p style="margin-bottom: 30px; font-size: 18px; opacity: 0.9;">Has dominado el tema: <strong>${courseData.title}</strong></p>
                            
                            <div style="display: flex; gap: 15px; justify-content: center;">
                                <button class="btn btn-secondary" onclick="location.reload()"><i class="fa-solid fa-rotate-right"></i> Crear Otro</button>
                                <button class="btn btn-primary" onclick="AIDispatcher.processCommand('Genera otro curso relacionado')">Profundizar</button>
                            </div>
                        </div>
                     `;
                 }
             };
        };

        // Initial render
        renderSlide();
    }
};

document.addEventListener('DOMContentLoaded', AIDispatcher.init);
