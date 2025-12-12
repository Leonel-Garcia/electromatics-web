// Global variables to store calculation data
let panelScheduleData = [];
let lastCalculationData = null;

// Wait for the DOM to be fully loaded to assign listeners
document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculate-btn');
    const userPromptInput = document.getElementById('user-prompt');

    if (calculateBtn) {
        calculateBtn.addEventListener('click', getAiCalculation);
    }

    if (userPromptInput) {
        userPromptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                getAiCalculation();
            }
        });
    }

    // Mobile menu script
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
});

async function getAiCalculation() {
    // La clave de API se carga desde js/config.js
    if (typeof apiKey === 'undefined' || !apiKey) {
        showError("La clave de API no está definida. Asegúrate de que js/config.js esté correctamente configurado.");
        setLoading(false);
        return;
    }

    const userPromptInput = document.getElementById('user-prompt');
    const resultsSection = document.getElementById('results-section');

    const userPrompt = userPromptInput.value;
    if (!userPrompt) {
        showError("Por favor, introduce una solicitud.");
        return;
    }

    setLoading(true);
    hideError();
    resultsSection.classList.add('hidden');

    try {
        const basePrompt = `Eres un asistente experto en cálculo eléctrico. Tu función es analizar la solicitud del usuario, identificar el tipo de cálculo y realizarlo estrictamente según la normativa seleccionada.`;
        const ampacityTable = `
REGLA DE SELECCIÓN DE CONDUCTOR:
Para seleccionar el calibre de un conductor, utiliza OBLIGATORIAMENTE la siguiente tabla de ampacidad para conductores de cobre con aislamiento de 75°C (basada en NEC Tabla 310.16). Debes seleccionar el primer calibre cuyo amperaje sea IGUAL O SUPERIOR a la ampacidad mínima calculada.

⚠️ IMPORTANTE: El calibre mínimo permitido es 12 AWG (20A). NO se permite usar calibre 14 AWG.

- 12 AWG: 20 A (CALIBRE MÍNIMO PERMITIDO)
- 10 AWG: 30 A
- 8 AWG: 50 A
- 6 AWG: 65 A
- 4 AWG: 85 A
- 3 AWG: 100 A
- 2 AWG: 115 A
- 1 AWG: 130 A
- 1/0 AWG: 150 A
- 2/0 AWG: 175 A
- 3/0 AWG: 200 A
- 4/0 AWG: 230 A
- 250 kcmil: 255 A
- 300 kcmil: 285 A
- 350 kcmil: 310 A
- 400 kcmil: 335 A
- 500 kcmil: 380 A
`;
        const motorRules = `
REGLAS UNIVERSALES PARA CÁLCULOS DE MOTORES:
1.  **Cálculo Detallado:** Para cada motor, debes generar objetos de resultado para cada paso del cálculo:
    a.  **FLA:** Un resultado para "Corriente a Plena Carga (FLA)".
    b.  **Conductor:** Un resultado para "Ampacidad Mín. Conductor" mostrando el cálculo (ej: "81.25 A (125% FLA)") y otro para "Calibre de Conductor".
    c.  **Relé Térmico:** Un resultado para "Ajuste Máx. Relé Térmico" mostrando el cálculo (ej: "74.75 A (115% FLA)") y otro para "Interruptor Automático Estándar" con el valor comercial.
    d.  **Interruptor:** Un resultado para "Cálculo Interruptor (Máx)" mostrando el cálculo (ej: "162.5 A (250% FLA)") y otro para "Interruptor Automático Estándar" con el valor comercial.
2.  **Factor de Potencia y Eficiencia:** Si no se especifican, asume FP=0.85 y Eficiencia=90% e indícalo en las notas.`;
        const multiMotorRules = `
REGLAS PARA CÁLCULO DE MÚLTIPLES MOTORES EN UN ALIMENTADOR COMÚN (NEC Art. 430):
1.  Identifica los parámetros para cada motor (Motor 1 es el más grande).
2.  Para CÁLCULOS DE MÚLTIPLES MOTORES, la etiqueta ('label') para cada resultado DEBE seguir este formato estricto: "Motor X (Y HP) - Nombre del Cálculo" o "Alimentador Principal - Nombre del Cálculo".`;
        const feederRules = `
REGLAS PARA CÁLCULO DE ALIMENTADOR PRINCIPAL (MÚLTIPLES MOTORES):
1.  **Cálculo del Conductor del Alimentador (NEC 430.24):
    a.  La ampacidad mínima se calcula sumando dos componentes:
        i.  El 125% de la Corriente a Plena Carga (FLA) del motor de mayor potencia.
        ii. La suma de las FLA de todos los demás motores en el grupo.
    b.  Fórmula: Ampacidad = (1.25 * FLA Motor Más Grande) + (Suma de FLA de los otros motores).
    c.  Ejemplo con 3 motores (50A, 20A, 10A): Ampacidad = (1.25 * 50A) + 20A + 10A = 62.5A + 30A = 92.5A.
    d.  Muestra el cálculo detallado en el resultado "Ampacidad Mín. Conductor".
    e.  Selecciona el calibre del conductor basado en esta ampacidad calculada.
2.  **Cálculo del Interruptor del Alimentador (NEC 430.62):
    a.  **IMPORTANTE:** El interruptor del alimentador NO se basa en la ampacidad del conductor.
    b.  Su capacidad se calcula así: (Capacidad del interruptor de RAMAL del motor más grande) + (la suma de las FLA de todos los demás motores).
    c.  Muestra este cálculo en el resultado "Cálculo Interruptor (Máx)".
    d.  Selecciona el interruptor comercial estándar que no exceda este valor. Si el valor no es estándar, se puede redondear hacia ABAJO al siguiente tamaño estándar.`;
        const panelRules = `
REGLAS UNIVERSALES DE DISEÑO DE TABLEROS (SOLO APLICAN A CÁLCULOS RESIDENCIALES):
1. Asume un sistema de 120/240V, monofásico, 3 hilos por defecto.
2. El tablero es simétrico: impares a la izquierda, pares a la derecha.
3. Asignación Bipolar FÍSICA: Un circuito 2P ocupa dos posiciones de la misma paridad (ej. '1-3', '2-4').
4. Realiza el cálculo de carga, selecciona el tablero estándar y llena las reservas.`;
        const motorPanelRules = `
REGLAS PARA TABLERO DE MOTORES: Para cálculos de motores (individuales o múltiples), DEBES generar un 
panel_schedule
 con un circuito para cada motor y uno para el alimentador principal (si aplica).
1.  **Asignación de Circuitos:** Asigna posiciones de circuito de forma secuencial. Los motores trifásicos ocupan 3 posiciones (ej: 1-3-5). El alimentador principal también ocupa 3 posiciones.
2.  **Descripción:** Usa el nombre del motor (ej: 'Motor 1 (25 HP)') o 'Alimentador Principal'.
3.  **Carga (load_va):** Calcula la potencia aparente en VA. Fórmula para trifásicos: 
VA = Corriente (FLA) * Voltaje * 1.732
. Redondea al entero más cercano. Para el alimentador principal, suma las cargas VA de todos los motores.
4.  **Polos (breaker_poles):** Usa 3 para motores trifásicos y para el alimentador principal.
5.  **Amperios (breaker_amps):** Usa el valor del interruptor estándar que ya calculaste para cada circuito de motor y para el alimentador principal.
6.  **Calibre (wire_size):** Usa el calibre del conductor que ya calculaste para cada circuito.`;
        const outputRules = `
REGLA CRÍTICA DE SALIDA: Devuelve SIEMPRE la respuesta en el formato JSON definido. Los campos 'results' y 'panel_schedule' DEBEN estar presentes. Si el cálculo es residencial, sigue las reglas de diseño de tableros. Si el cálculo es de motores, sigue las reglas de tablero de motores.`;

        let systemPrompt = `${basePrompt}${ampacityTable}${motorRules}${multiMotorRules}${feederRules}${panelRules}${motorPanelRules}${outputRules}`;
        systemPrompt += `
NORMATIVA APLICADA: Fondonorma 200:2009 (Venezuela).
Esta normativa se basa en el NEC. Puedes realizar CUALQUIER tipo de cálculo usando las tablas y procedimientos estándar del NEC, pero con las siguientes reglas locales:
REGLAS ESPECÍFICAS DE VENEZUELA:
1. Calibres Comerciales Estándar: Si un cálculo resulta en un calibre impar (ej. 3 AWG, 1 AWG), DEBES seleccionar el siguiente calibre par o 'x/0' superior disponible.
2. Calibre Mínimo Residencial: El calibre mínimo para instalaciones residenciales es 12 AWG, y por lo tanto, el interruptor mínimo es de 20 Amperios.
3. CÁLCULOS RESIDENCIALES: Para cálculos de carga en viviendas, debes seguir los procedimientos de la SECCIÓN 220 de la norma. Esto incluye:
    - Carga de Alumbrado General: 33 W/m² (referencia Tabla 220-12).
    - Aplicar factores de demanda para cargas de iluminación según la Tabla 220-42.
    - Circuitos para Pequeños Artefactos: 1500 VA por cada circuito de 20A.
    - Circuito de Lavandería: 1500 VA.
    - Cargas de Secadoras y Cocinas Eléctricas: Aplicar factores de demanda según las tablas de la Sección 220.
    - Presentar los resultados de forma clara y desglosada, mostrando cada paso del cálculo.`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nSolicitud de usuario: \"${userPrompt}\" ` }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "calculation_type": { "type": "STRING" },
                        "summary": { "type": "STRING" },
                        "results": {
                            type: "ARRAY",
                            items: { type: "OBJECT", properties: { "label": { "type": "STRING" }, "value": { "type": "STRING" }, "reference": { "type": "STRING" } } }
                        },
                        "panel_schedule": {
                            type: "ARRAY",
                            description: "Puede ser un array vacío.",
                            items: { type: "OBJECT", properties: { "circuit_pos": { "type": "STRING" }, "description": { "type": "STRING" }, "load_va": { "type": "NUMBER" }, "breaker_poles": { "type": "NUMBER" }, "breaker_amps": { "type": "NUMBER" }, "wire_size": { "type": "STRING" } }, "required": ["circuit_pos", "description", "load_va", "breaker_poles", "breaker_amps", "wire_size"] }
                        },
                        "notes": { "type": "STRING" }
                    },
                    required: ["calculation_type", "summary", "results", "panel_schedule", "notes"]
                }
            }
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

        if (!response.ok) throw new Error(`Error en la API: ${response.statusText}`);
        const result = await response.json();

        if (result.candidates && result.candidates[0].content.parts.length > 0) {
            const data = JSON.parse(result.candidates[0].content.parts[0].text);
            if (!data || !data.results || !Array.isArray(data.results)) {
                throw new Error("La respuesta de la IA tiene un formato inválido o no incluyó el campo 'results'.");
            }
            lastCalculationData = data;
            panelScheduleData = data.panel_schedule || [];
            displayResults(data);
            preparePdfContent(data);
        } else {
            throw new Error("La respuesta de la IA no contiene resultados válidos.");
        }
    } catch (error) {
        console.error("Error al calcular con IA:", error);
        showError(`No se pudo completar el cálculo. Razón: ${error.message}.`);
    } finally {
        setLoading(false);
    }
}

function displayResults(data) {
    const resultsSection = document.getElementById('results-section');
    let resultsHtml = '';

    resultsHtml += `
        <div class="results-container">
            <div class="results-header">
                <div>
                    <h3>${data.calculation_type}</h3>
                    <p>${data.summary}</p>
                </div>
                <div class="results-actions">
                    <button id="export-excel-btn" title="Exportar a Excel" class="btn btn-secondary" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm2 1h12v12H4V4zm4 2v2h2V6H8zm0 3v2h2V9H8zm0 3v2h2v-2H8z" /></svg>
                        <span>Excel</span>
                    </button>
                    <button id="download-pdf-btn" title="Descargar PDF" class="btn btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 11-2 0V4H6v12a1 1 0 11-2 0V4z" clip-rule="evenodd" /><path d="M18 8.5a.5.5 0 01-1 0V5.5a.5.5 0 00-.5-.5h-11a.5.5 0 00-.5.5V8.5a.5.5 0 01-1 0V5.5A1.5 1.5 0 015 4h10a1.5 1.5 0 011.5 1.5v3z" /><path d="M10 18a.5.5 0 01-.5-.5v-6a.5.5 0 011 0v6a.5.5 0 01-.5.5z" /><path d="M9.146 11.646a.5.5 0 01.708 0l2 2a.5.5 0 01-.708.708L10 12.707l-1.146 1.147a.5.5 0 01-.708-.708l2-2z" /></svg>
                        <span>PDF</span>
                    </button>
                </div>
            </div>
            <hr>
            <div class="results-grid">`;

    const groupedResults = data.results.reduce((acc, item) => {
        const key = item.label.match(/^(Motor \d+ \([^)]+\)|Alimentador Principal)/);
        const groupKey = key ? key[0] : 'Resultados Generales';
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
        return acc;
    }, {});

    const groupOrder = Object.keys(groupedResults).sort((a,b) => {
         if (a.startsWith('Motor') && b.startsWith('Motor')) {
            return parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]);
        }
        if (a.startsWith('Motor')) return -1;
        if (b.startsWith('Motor')) return 1;
        if (a === 'Alimentador Principal') return -1;
        if (b === 'Alimentador Principal') return 1;
        return a.localeCompare(b);
    });

    for (const group of groupOrder) {
        if (groupedResults[group].length > 0) {
            let displayTitle = group.startsWith("Motor") ? `${group} (Ramal)` : group;

            resultsHtml += `<div class="result-group">
                <h4>${displayTitle}</h4>
                <div class="service-grid">
`;
            groupedResults[group].forEach(item => {
                const cleanLabel = item.label.replace(/^.*?-\s*/, '');
                resultsHtml += `<div class="result-card"><h5 class="result-label">${cleanLabel}</h5><p class="result-value">${item.value}</p><p class="result-reference">Ref: ${item.reference}</p></div>`;
            });

            resultsHtml += `</div></div>`;
        }
    }

    resultsHtml += '</div></div>';

    if (panelScheduleData && panelScheduleData.length > 0) {
        resultsHtml += `
            <div class="panel-container">
                <h4>Cuadro de Circuitos Simétrico</h4>
                ${generateSymmetricalPanelHtml(panelScheduleData)}
            </div>`;
    }

    resultsHtml += `<div class="notes-container"><p><strong>Notas:</strong> ${data.notes}</p></div>`;
    resultsSection.innerHTML = resultsHtml;
    resultsSection.classList.remove('hidden');

    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', generatePdf);
    const exportBtn = document.getElementById('export-excel-btn');
    if (exportBtn) {
        if (panelScheduleData && panelScheduleData.length > 0) {
            exportBtn.disabled = false;
            exportBtn.title = "Exportar a Excel";
            exportBtn.addEventListener('click', exportToExcel);
        } else {
            exportBtn.title = "Exportación a Excel no disponible para este cálculo.";
        }
    }
}

function generateSymmetricalPanelHtml(circuits) {
    const panelModel = {};
    let maxPos = 0;
    circuits.forEach(c => {
        const pos = parseInt(c.circuit_pos, 10);
        panelModel[pos] = c;
        maxPos = Math.max(maxPos, pos);
    });
    if (maxPos % 2 !== 0) maxPos++;

    let html = '<div class="overflow-x-auto"><table class="w-full text-sm panel-table">';

    for (let i = 1; i <= maxPos / 2; i++) {
        const leftPos = i * 2 - 1;
        const rightPos = i * 2;
        const l = panelModel[leftPos];
        const r = panelModel[rightPos];

        let l_desc = l ? `${l.description} (${l.wire_size} AWG)` : '';
        let l_breaker = l ? (l.breaker_poles > 0 ? `${l.breaker_poles}P-${l.breaker_amps}A` : '-') : '';

        let r_desc = r ? `${r.description} (${r.wire_size} AWG)` : '';
        let r_breaker = r ? (r.breaker_poles > 0 ? `${r.breaker_poles}P-${r.breaker_amps}A` : '-') : '';

        html += `<tr class="border-b">
            <td class="text-right desc-cell">${l_desc}</td>
            <td class="text-right breaker-cell">${l_breaker}</td>
            <td class="pos-cell">${leftPos}</td>
            <td class="pos-cell border-l-4 border-white">${rightPos}</td>
            <td class="text-left breaker-cell">${r_breaker}</td>
            <td class="text-left desc-cell">${r_desc}</td>
        </tr>`;
    }

    html += '</tbody></table></div>';
    return html;
}

function exportToExcel() {
    if (!panelScheduleData || panelScheduleData.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    const mainBreakerIndex = panelScheduleData.findIndex(c => c.description && c.description.toLowerCase().includes('principal'));
    const mainBreaker = mainBreakerIndex > -1 ? panelScheduleData.splice(mainBreakerIndex, 1)[0] : null;
    const circuits = panelScheduleData;

    const dataForSheet = [];
    const merges = [];
    let currentRowIndex = 0;

    if (mainBreaker) {
        dataForSheet.push({ A: 'INTERRUPTOR PRINCIPAL' });
        merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 8 } });
        currentRowIndex++;
        dataForSheet.push({ A: 'Descripción', B: mainBreaker.description, C: 'Interruptor', D: `${mainBreaker.breaker_poles}P-${mainBreaker.breaker_amps}A`, E: 'Calibre', F: `${mainBreaker.wire_size} AWG` });
        currentRowIndex++;
        dataForSheet.push({});
        currentRowIndex++;
    }

    const headerRow = {
        A: 'Descripción', B: 'Calibre', C: 'Interruptor', D: 'Posición',
        E: '',
        F: 'Posición', G: 'Interruptor', H: 'Calibre', I: 'Descripción'
    };
    const headerRowExcelIndex = currentRowIndex;
    dataForSheet.push(headerRow);

    const panelModel = {};
    let maxPos = 0;
    circuits.forEach(c => {
        const allPos = c.circuit_pos.split('-').map(p => parseInt(p, 10));
        const firstPos = allPos[0];
        panelModel[firstPos] = c;
        const maxInCircuit = Math.max(...allPos);
        if (maxInCircuit > maxPos) maxPos = maxInCircuit;
    });
    if (maxPos % 2 !== 0) maxPos++;

    for (let i = 0; i < maxPos / 2; i++) {
        const rowData = {};
        const leftPos = i * 2 + 1;
        const rightPos = i * 2 + 2;
        rowData.D = leftPos;
        rowData.F = rightPos;
        dataForSheet.push(rowData);
    }

    const processedPos = new Set();
    circuits.forEach(c => {
        const allPos = c.circuit_pos.split('-').map(p => parseInt(p, 10));
        const firstPos = allPos[0];
        if (processedPos.has(firstPos)) return;

        const startRowIndex = Math.floor((firstPos - 1) / 2);
        const excelRow = headerRowExcelIndex + 1 + startRowIndex;
        const isLeftSide = firstPos % 2 !== 0;

        if (isLeftSide) {
            dataForSheet[excelRow].A = c.description;
            dataForSheet[excelRow].B = c.wire_size;
            dataForSheet[excelRow].C = `${c.breaker_poles}P-${c.breaker_amps}A`;
        } else {
            dataForSheet[excelRow].I = c.description;
            dataForSheet[excelRow].H = c.wire_size;
            dataForSheet[excelRow].G = `${c.breaker_poles}P-${c.breaker_amps}A`;
        }

        if (allPos.length > 1) {
            const endRow = excelRow + allPos.length - 1;
            if (isLeftSide) {
                merges.push({ s: { r: excelRow, c: 0 }, e: { r: endRow, c: 0 } }); // Desc
                merges.push({ s: { r: excelRow, c: 1 }, e: { r: endRow, c: 1 } }); // Calibre
                merges.push({ s: { r: excelRow, c: 2 }, e: { r: endRow, c: 2 } }); // Int
            } else {
                merges.push({ s: { r: excelRow, c: 8 }, e: { r: endRow, c: 8 } }); // Desc
                merges.push({ s: { r: excelRow, c: 7 }, e: { r: endRow, c: 7 } }); // Calibre
                merges.push({ s: { r: excelRow, c: 6 }, e: { r: endRow, c: 6 } }); // Int
            }
        }
        allPos.forEach(p => processedPos.add(p));
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet, { skipHeader: true });
    worksheet["!merges"] = merges;
    worksheet["!cols"] = [ {wch:35}, {wch:10}, {wch:12}, {wch:10}, {wch:3}, {wch:10}, {wch:12}, {wch:10}, {wch:35} ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cuadro de Cargas");
    XLSX.writeFile(workbook, "Cuadro_de_Cargas.xlsx");
}

function getProfessionalPdfHtml(data) {
    const userPromptInput = document.getElementById('user-prompt');
    const selectedNormText = "Fondonorma 200:2009 (Venezuela)";
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const logoImg = document.getElementById('logo-for-pdf');
    const logoSrc = logoImg ? logoImg.src : '';

    const styles = `
        <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10pt; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2px solid #003366; }
            .header img { height: 50px; }
            .header h1 { color: #003366; font-size: 18pt; margin: 0; }
            .content { margin-top: 20px; }
            h2 { font-size: 14pt; color: #003366; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 25px; margin-bottom: 10px; }
            h3 { font-size: 12pt; color: #0055A4; margin-top: 20px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 9pt; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .info-box { background-color: #f9f9f9; border: 1px solid #eee; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .info-box p { margin: 0 0 5px 0; }
            .info-box strong { color: #003366; }
            .result-group { margin-bottom: 20px; page-break-inside: avoid; }
            .notes { margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-top: 2px solid #003366; font-size: 9pt; }
            .panel-schedule .panel-pos { text-align: center; font-weight: bold; background-color: #f2f2f2; }
            .panel-schedule .panel-breaker { text-align: center; }
            .panel-schedule .panel-desc { text-align: left; }
            .panel-schedule .panel-center-gutter { border: none; background-color: #fff; width: 20px; }
        </style>`;

    const headerHtml = `
        <html><head>${styles}</head><body>
            <div class="header">
                <img src="${logoSrc}" alt="Logo">
                <h1>Memoria de Cálculo Eléctrico</h1>
            </div>
        </body></html>`;

    const generateResultTables = (data) => {
        let tablesHtml = '';
        const groupedResults = data.results.reduce((acc, item) => {
            const key = item.label.match(/^(Motor \d+ \([^)]+\)|Alimentador Principal)/);
            const groupKey = key ? key[0] : 'Resultados Generales';
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(item);
            return acc;
        }, {});

        const groupOrder = Object.keys(groupedResults).sort((a, b) => {
            if (a.startsWith('Motor') && b.startsWith('Motor')) {
                return parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]);
            }
            if (a.startsWith('Motor')) return -1;
            if (b.startsWith('Motor')) return 1;
            if (a === 'Alimentador Principal') return -1;
            if (b === 'Alimentador Principal') return 1;
            return a.localeCompare(b);
        });

        for (const group of groupOrder) {
            let displayTitle = group.startsWith("Motor") ? `${group} (Ramal)` : group;
            tablesHtml += `
                <div class="result-group">
                    <h3>${displayTitle}</h3>
                    <table>
                        <thead>
                            <tr>
                                <th class="concept">Concepto</th>
                                <th class="value">Valor</th>
                                <th class="reference">Referencia Normativa</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${groupedResults[group].map(item => `
                                <tr>
                                    <td>${item.label.replace(/^.*?-\s*/, '')}</td>
                                    <td>${item.value}</td>
                                    <td>${item.reference}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        return tablesHtml;
    };

    const contentHtml = `
        <html><head>${styles}</head><body>
            <div class="content">
                <h2>Información General</h2>
                <div class="info-box">
                    <p><strong>Proyecto:</strong> ${data.calculation_type}</p>
                    <p><strong>Fecha:</strong> ${today}</p>
                    <p><strong>Normativa:</strong> ${selectedNormText}</p>
                    <p><strong>Resumen:</strong> ${data.summary}</p>
                </div>
                <div class="info-box">
                    <p><strong>Solicitud Original:</strong></p>
                    <p><em>${userPromptInput.value}</em></p>
                </div>
                <h2>Resultados del Cálculo</h2>
                ${generateResultTables(data)}
                <div class="notes">
                    <h3>Notas Técnicas</h3>
                    <p>${data.notes.replace(/\n/g, '<br>')}</p>
                </div>
            </div>
        </body></html>`;

    return { header: headerHtml, content: contentHtml };
}

function preparePdfContent(data) {
    const { header, content } = getProfessionalPdfHtml(data);
    document.getElementById('pdf-header-area').innerHTML = header;
    document.getElementById('pdf-content-area').innerHTML = content;
}

async function generatePdf() {
    if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
        showError("Librerías PDF no cargadas.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' });

    const headerElement = document.getElementById('pdf-header-area');
    const contentElement = document.getElementById('pdf-content-area');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    try {
        const headerCanvas = await html2canvas(headerElement, { scale: 2, useCORS: true });
        const headerImgData = headerCanvas.toDataURL('image/png');
        const headerImgProps = pdf.getImageProperties(headerImgData);
        const headerHeight = (headerImgProps.height * (pdfWidth - margin * 2)) / headerImgProps.width;

        const contentCanvas = await html2canvas(contentElement, { scale: 2, useCORS: true });
        const contentImgHeight = (contentCanvas.height * (pdfWidth - margin * 2)) / contentCanvas.width;

        let numPages = Math.ceil(contentImgHeight / (pdfHeight - headerHeight - (margin * 2) - 10));
        let yPos = 0;

        for (let i = 1; i <= numPages; i++) {
            pdf.setPage(i);
            pdf.addImage(headerImgData, 'PNG', margin, margin, pdfWidth - margin * 2, headerHeight);

            const sliceHeight = pdfHeight - headerHeight - (margin * 2) - 10;
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = contentCanvas.width;
            sliceCanvas.height = (sliceHeight * contentCanvas.width) / (pdfWidth - margin * 2);
            const sliceCtx = sliceCanvas.getContext('2d');

            sliceCtx.drawImage(contentCanvas, 0, yPos, sliceCanvas.width, sliceCanvas.height, 0, 0, sliceCanvas.width, sliceCanvas.height);

            const sliceImgData = sliceCanvas.toDataURL('image/png');
            pdf.addImage(sliceImgData, 'PNG', margin, margin + headerHeight + 5, pdfWidth - margin * 2, sliceHeight);

            yPos += sliceCanvas.height;

            if (i < numPages) {
                pdf.addPage();
            }
        }

        for (let i = 1; i <= numPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150);
            pdf.text(`Página ${i} de ${numPages}`, pdf.internal.pageSize.getWidth() / 2, pdfHeight - 10, { align: 'center' });
        }

        pdf.save(`Reporte_${lastCalculationData.calculation_type.replace(/ /g, '_')}.pdf`);

    } catch (err) {
        console.error("Error generating PDF:", err);
        showError("Hubo un error al generar el PDF. Por favor, intente de nuevo.");
    }
}

function setLoading(isLoading) {
    const calculateBtn = document.getElementById('calculate-btn');
    const btnText = document.getElementById('btn-text');
    const loader = document.getElementById('loader');

    if(calculateBtn){
        calculateBtn.disabled = isLoading;
        btnText.classList.toggle('hidden', isLoading);
        loader.classList.toggle('hidden', !isLoading);
    }
}

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    if(errorMessage){
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
}

function hideError() {
    const errorMessage = document.getElementById('error-message');
    if(errorMessage){
        errorMessage.classList.add('hidden');
    }
}
