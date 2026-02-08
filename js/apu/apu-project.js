/**
 * APU Project Management Logic
 * Handles the "Master Budget" and multiple APU items.
 */

class APUProject {
    constructor() {
        this.name = "Nuevo Presupuesto Eléctrico";
        this.partidas = [];
        this.activePartidaIndex = null;
        this.globalFcas = 250;
        
        this.init();
    }

    init() {
        const nameInput = document.getElementById('project-name');
        if(nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.name = e.target.value;
                const displayEl = document.getElementById('display-project-name');
                if(displayEl) displayEl.innerText = this.name;
            });
        }

        const fileInput = document.getElementById('pdf-upload');
        if(fileInput) {
            fileInput.addEventListener('change', (e) => this.handlePdfImport(e));
        }

        const pdvsaInput = document.getElementById('pdvsa-upload');
        if(pdvsaInput) {
            pdvsaInput.addEventListener('change', (e) => this.handlePdvsaImport(e));
        }

        // Ensure dates and rates are set on startup
        if (window.apuUI) {
            window.apuUI.setDate();
            window.apuUI.fetchExchangeRate();
        }
    }

    switchView(view) {
        const projectView = document.getElementById('view-project');
        const detailView = document.getElementById('view-detail');
        const btns = document.querySelectorAll('.view-btn');
        const overviewSidebar = document.getElementById('project-overview-sidebar');

        if(view === 'project') {
            if(projectView) projectView.style.display = 'block';
            if(detailView) detailView.style.display = 'none';
            btns[0].classList.add('active');
            btns[1].classList.remove('active');
            
            // Refresh BCV rate automatically when entering budget view
            if (window.apuUI) {
                window.apuUI.fetchExchangeRate();
            }
            
            this.renderMasterTable();
        } else {
            if(projectView) projectView.style.display = 'none';
            if(detailView) detailView.style.display = 'block';
            btns[1].classList.add('active');
            btns[0].classList.remove('active');
        }

        if(overviewSidebar) overviewSidebar.style.display = 'block';
    }

    approveAndAssign() {
        if (this.activePartidaIndex === null) {
            alert("No hay una partida seleccionada para aprobar.");
            return;
        }
        
        const partida = this.partidas[this.activePartidaIndex];
        
        // 1. Capture State Snapshot
        if (window.apuUI) {
            partida.apuData = apuUI.getState();
        }

        // 2. Final sync of metadata to Master Budget
        partida.description = document.getElementById('partida-desc').value;
        partida.code = document.getElementById('partida-codigo').value;
        partida.unit = document.getElementById('partida-unidad').value;
        partida.qty = parseFloat(document.getElementById('partida-cantidad').value) || 0;

        if (window.apuSystem && window.apuSystem.TotalUnitCost) {
            partida.unitPrice = window.apuSystem.TotalUnitCost;
            
            // 3. Export current APU individually
            if (window.apuPDF) {
                apuPDF.exportToPDF();
            }

            this.renderMasterTable();
            this.renderSidebar();
            
            alert(`Partida ${partida.code} aprobada y exportada! Presupuesto actualizado.`);
            
            // Return to master list to pick the next extracted partida
            this.switchView('project');
            this.activePartidaIndex = null;
        } else {
            alert("Error: No se ha podido obtener el costo unitario.");
        }
    }

    addEmptyPartida() {
        const newPartida = {
            item: this.partidas.length + 1,
            code: 'E.-----',
            description: 'Nueva Partida',
            unit: 'pza',
            qty: 1,
            unitPrice: 0,
            apuData: null 
        };
        this.partidas.push(newPartida);
        this.renderMasterTable();
        this.renderSidebar();
    }

    /**
     * Resetea completamente el presupuesto actual.
     * Limpia todas las partidas y permite comenzar un proyecto nuevo desde cero.
     */
    resetProject() {
        const confirmMsg = `¿Está seguro de que desea iniciar un NUEVO PRESUPUESTO?

⚠️ ADVERTENCIA: Esta acción eliminará TODAS las partidas actuales y sus APUs.

✅ El presupuesto actual será borrado completamente.
✅ Podrá cargar un nuevo PDF con partidas frescas.
✅ El nombre del proyecto será reiniciado.`;

        if (!confirm(confirmMsg)) {
            return; // Usuario canceló
        }

        // 1. Limpiar todas las partidas
        this.partidas = [];
        this.activePartidaIndex = null;

        // 2. Reiniciar el nombre del proyecto
        this.name = "Nuevo Presupuesto Eléctrico";
        const nameInput = document.getElementById('project-name');
        if (nameInput) {
            nameInput.value = this.name;
        }
        const displayName = document.getElementById('display-project-name');
        if (displayName) {
            displayName.innerText = this.name;
        }

        // 3. Limpiar el sistema APU global si existe
        if (window.apuSystem) {
            window.apuSystem.description = '';
            window.apuSystem.unit = 'und';
            window.apuSystem.yield = 1;
            window.apuSystem.materials = [];
            window.apuSystem.equipment = [];
            window.apuSystem.labor = [];
        }

        // 4. Limpiar la interfaz de detalle APU si está visible
        if (window.apuUI) {
            // Limpia los campos del formulario de detalle
            const fields = ['partida-desc', 'partida-codigo', 'partida-unidad', 'partida-cantidad', 'apu-partida-no'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            // Llama a updateCalculation para refrescar
            if (typeof apuUI.updateCalculation === 'function') {
                apuUI.updateCalculation();
            }
        }

        // 5. Reiniciar el input de archivo PDF para permitir seleccionar el mismo archivo otra vez
        const pdfInput = document.getElementById('pdf-upload');
        if (pdfInput) {
            pdfInput.value = '';
        }

        // 6. Actualizar las vistas
        this.renderMasterTable();
        this.renderSidebar();

        // 7. Volver a la vista de presupuesto
        this.switchView('project');

        // 8. Notificar al usuario
        alert('✅ Presupuesto reiniciado correctamente.\n\nAhora puede cargar un nuevo PDF con partidas o agregar partidas manualmente.');
    }

    editPartida(index) {
        this.activePartidaIndex = index;
        const partida = this.partidas[index];

        if (window.apuUI) {
            if (partida.apuData) {
                apuUI.loadState(partida.apuData);
            } else {
                // Initial load for draft
                document.getElementById('partida-desc').value = partida.description;
                document.getElementById('partida-codigo').value = partida.code;
                document.getElementById('partida-unidad').value = partida.unit;
                document.getElementById('partida-cantidad').value = partida.qty;
                document.getElementById('apu-partida-no').value = partida.item;
                
                if (partida.code !== 'E.-----' && window.apuSmart) {
                    const template = window.APU_TEMPLATES.find(t => t.code === partida.code);
                    if (template) apuUI.loadTemplate(template);
                }
            }
            this.switchView('detail');
        }
    }

    syncActivePartida() {
        if (this.activePartidaIndex === null) return;
        const partida = this.partidas[this.activePartidaIndex];
        partida.description = document.getElementById('partida-desc').value;
        partida.code = document.getElementById('partida-codigo').value;
        partida.unit = document.getElementById('partida-unidad').value;
        partida.qty = parseFloat(document.getElementById('partida-cantidad').value) || 0;
        this.renderSidebar();
    }

    renderMasterTable() {
        const tbody = document.getElementById('master-budget-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        // Determine currency mode
        const isBs = window.apuUI && window.apuUI.currentCurrency === 'BS';
        const exchangeInput = document.getElementById('exchange-rate');
        const exchangeVal = exchangeInput ? exchangeInput.value : "1";
        const rate = parseFloat(exchangeVal.toString().replace(',', '.')) || 1;
        const mult = isBs ? rate : 1;
        const symbol = isBs ? 'Bs' : '$';

        let grandTotal = 0;
        this.partidas.forEach((p, index) => {
            // p.unitPrice is in Base Currency (USD) as it comes from TotalUnitCost
            const unitPriceDisplay = p.unitPrice * mult;
            const totalDisplay = (p.qty * p.unitPrice) * mult;
            
            grandTotal += totalDisplay;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.item}</td>
                <td><b>${p.code}</b></td>
                <td>${p.description}</td>
                <td style="text-align:center">${p.unit}</td>
                <td style="text-align:center">${p.qty}</td>
                <td style="text-align:right">${symbol} ${unitPriceDisplay.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="text-align:right"><b>${symbol} ${totalDisplay.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</b></td>
                <td style="text-align:center">
                    <button class="btn-sm" onclick="apuProject.editPartida(${index})"><i class="fa-solid fa-pen-to-square"></i> APU</button>
                    <button class="btn-sm btn-danger" onclick="apuProject.deletePartida(${index})" style="margin-left:5px;"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        document.getElementById('project-total').innerText = `${symbol} ${grandTotal.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }

    deletePartida(index) {
        if(confirm('¿Eliminar esta partida?')) {
            this.partidas.splice(index, 1);
            this.renderMasterTable();
            this.renderSidebar();
        }
    }

    renderSidebar() {
        const list = document.getElementById('sidebar-partida-list');
        if(!list) return;
        list.innerHTML = '';
        this.partidas.forEach((p, index) => {
            const div = document.createElement('div');
            div.className = `partida-item ${this.activePartidaIndex === index ? 'active' : ''}`;
            div.onclick = () => this.editPartida(index);
            const statusIcon = p.apuData ? '<i class="fa-solid fa-circle-check" style="color:green; font-size:10px;"></i>' : '';
            div.innerHTML = `
                <div style="font-size: 11px;">
                    <b>${p.code}</b> ${statusIcon}<br>
                    <span style="color:#666">${p.description.substring(0, 30)}...</span>
                </div>
                <i class="fa-solid fa-chevron-right" style="font-size: 10px; color: #ccc;"></i>
            `;
            list.appendChild(div);
        });
    }

    async handlePdfImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const zone = document.querySelector('.import-zone');
        const originalContent = zone.innerHTML;

        // Limpiar partidas actuales visualmente para que el usuario vea que algo está pasando
        const tbody = document.getElementById('master-budget-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><br>ElectrIA está analizando el nuevo documento...</td></tr>';
        }

        // Mostrar estado de procesamiento en el sidebar
        zone.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin" style="font-size:24px; color:var(--electric-blue)"></i><br>
            <b>Despertando servidor ElectrIA...</b>
            <p style="font-size:10px; margin:5px 0;">Esto puede tardar 20-30 seg si el servidor estaba inactivo.</p>
        `;

        try {
            // Intentar despertar el servidor antes de enviar el archivo pesado
            const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://electromatics-api.onrender.com';
            await fetch(apiUrl).catch(() => {}); // Ignorar errores de ping

            // 1. Configurar PDF.js
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }

            // 2. Leer el archivo PDF
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            // 3. Extraer texto de todas las páginas
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                // Mejorar la extracción para mantener orden de líneas
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
                
                zone.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin" style="font-size:24px; color:var(--electric-blue)"></i><br>
                    <b>Leyendo PDF...</b>
                    <p style="font-size:10px; margin:5px 0;">Página ${i} de ${pdf.numPages} leída.</p>
                `;
            }

            if (!fullText.trim() || fullText.trim().length < 150) {
                // LIKELY SCANNED - Use Vision OCR
                zone.innerHTML = `
                    <i class="fa-solid fa-eye fa-beat-fade" style="font-size:24px; color:var(--electric-blue)"></i><br>
                    <b>Modo Visión Activado</b>
                    <p style="font-size:10px; margin:5px 0;">El PDF parece ser un escaneo. ElectrIA está leyendo las imágenes...</p>
                `;
                const images = await this.pdfToImages(pdf, 5); // First 5 pages are usually enough
                const partidas = await this.extractPartidasWithAI("", images);
                
                if (partidas && partidas.length > 0) {
                    this.partidas = partidas;
                    zone.innerHTML = originalContent;
                    this.renderMasterTable();
                    this.renderSidebar();
                    alert(`✅ Visión IA: Se han extraído ${partidas.length} partidas del escaneo.`);
                } else {
                    throw new Error('No se detectaron partidas incluso con el modo visión.');
                }
                return;
            }

            // 4. Enviar a ElectrIA para análisis (TEXT MODE)
            zone.innerHTML = `
                <i class="fa-solid fa-brain fa-beat-fade" style="font-size:24px; color:var(--safety-orange)"></i><br>
                <b>ElectrIA analizando...</b>
                <p style="font-size:10px; margin:5px 0;">Esto puede tardar unos segundos. Enviando datos reales.</p>
            `;

            const partidas = await this.extractPartidasWithAI(fullText);

            if (partidas && partidas.length > 0) {
                // Éxito: cargar las nuevas partidas
                this.partidas = partidas;
                zone.innerHTML = originalContent;
                this.renderMasterTable();
                this.renderSidebar();
                alert(`✅ ElectrIA ha extraído ${partidas.length} partidas del PDF.\n\nProceda a realizar el APU de cada una.`);
            } else {
                throw new Error('No se pudieron extraer partidas del documento.');
            }

        } catch (error) {
            console.error('Error procesando PDF:', error);
            zone.innerHTML = originalContent;
            
            // Mostrar error descriptivo
            alert(`❌ Error al procesar el PDF:\n\n${error.message}\n\nPuede agregar las partidas manualmente usando el botón "+ Añadir Partida Manual".`);
        }

        // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
        e.target.value = '';
    }

    async handlePdvsaImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const zone = document.querySelector('.import-zone');
        const originalContent = zone.innerHTML;

        // Visual Feedback
        const tbody = document.getElementById('master-budget-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 40px;"><i class="fa-solid fa-microchip fa-spin fa-2x" style="color:#ff9800"></i><br><br><b>INGENIERÍA PDVSA:</b> ElectrIA está realizando un Análisis de Precios Unitarios profundo...</td></tr>';
        }

        zone.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin" style="font-size:24px; color:#ff9800"></i><br>
            <b>Escaneando Pliego PDVSA...</b>
            <p style="font-size:10px; margin:5px 0;">Analizando especificaciones técnicas y tablas de recursos.</p>
        `;

        try {
            // Auto-set sector to Oil
            const sectorEl = document.getElementById('labor-sector');
            if (sectorEl) {
                sectorEl.value = 'oil';
                if (window.apuUI) window.apuUI.setSector('oil');
            }

            // 1. Configure PDF.js
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }

                // 2. Read PDF text
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                
                zone.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin" style="font-size:24px; color:#ff9800"></i><br>
                    <b>Extrayendo Especificaciones...</b>
                    <p style="font-size:10px; margin:5px 0;">Página ${i} de ${pdf.numPages}</p>
                `;
            }

            let images = [];
            if (!fullText.trim() || fullText.trim().length < 200) {
                zone.innerHTML = `
                    <i class="fa-solid fa-eye fa-beat-fade" style="font-size:24px; color:#ff9800"></i><br>
                    <b>Modo Visión PDVSA</b>
                    <p style="font-size:10px; margin:5px 0;">Escaneo detectado. Procesando imágenes para OCR profundo...</p>
                `;
                images = await this.pdfToImages(pdf, 8); // PDVSA pliegos can be longer
            }

            // 3. Deep Extraction with AI
            zone.innerHTML = `
                <i class="fa-solid fa-brain fa-beat-fade" style="font-size:24px; color:#ff9800"></i><br>
                <b>ElectrIA Correlacionando...</b>
                <p style="font-size:10px; margin:5px 0;">${images.length > 0 ? "Analizando imágenes con Visión..." : "Vinculando Partidas -> Recursos -> Tiempos."}</p>
            `;

            const partidas = await this.extractPdvsaPartidasWithAI(fullText, images);

            if (partidas && partidas.length > 0) {
                this.partidas = partidas;
                zone.innerHTML = originalContent;
                this.renderMasterTable();
                this.renderSidebar();
                alert(`✅ PROCESAMIENTO PREMIUM COMPLETADO\n\nElectrIA ha extraído ${partidas.length} partidas con sus Análisis de Precios Unitarios (APU) sugeridos basados en el pliego PDVSA.\n\nRevise cada una en la vista de detalle.`);
            } else {
                throw new Error('No se pudieron extraer los datos con el análisis avanzado.');
            }

        } catch (error) {
            console.error('PDVSA Import Error:', error);
            zone.innerHTML = originalContent;
            alert(`❌ Error en Análisis PDVSA:\n\n${error.message}`);
        }

        e.target.value = '';
    }

    /**
     * Convierte páginas del PDF a imágenes Base64 para OCR Visual con IA
     */
    async pdfToImages(pdf, maxPages = 5) {
        const images = [];
        const numPages = Math.min(pdf.numPages, maxPages);
        
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 }); // Balance calidad/peso
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Extraer solo la data base64 (sin el prefijo data:image/jpeg;base64,)
            const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
            images.push(base64);
        }
        return images;
    }

    async extractPartidasWithAI(pdfText, images = []) {
        let textContent = pdfText.substring(0, 15000);
        let mode = images.length > 0 ? "VISUAL (OCR IA)" : "TEXTO";
        
        const prompt = `Eres un experto en presupuestos de ingeniería eléctrica venezolana.
Analiza este documento (Modo: ${mode}). 
${images.length > 0 ? "He adjuntado imágenes del escaneo porque el PDF no contiene texto legible." : "He extraído el texto del PDF."}

TAREA: Extrae el listado de partidas.
REQUERIMIENTOS:
1. Extrae: código de la partida, descripción, unidad y cantidad.
2. Si es un escaneo, fíjate bien en las tablas y números.
3. Formato: [{item, code, description, unit, qty}] JSON puro.

${images.length > 0 ? "" : "TEXTO DEL PDF:\n" + textContent}`;

        return this.callAiAndParse(prompt, images);
    }

    async extractPdvsaPartidasWithAI(pdfText, images = []) {
        const maxChars = 20000; // Allow more context for PDVSA
        const truncatedText = pdfText.length > maxChars 
            ? pdfText.substring(0, maxChars) + '\n... [TEXTO TRUNCADO]' 
            : pdfText;

        const prompt = `Eres un experto senior en licitaciones de PDVSA (Petróleos de Venezuela). 
Analiza este pliego licitatorio extraído de un PDF. 

EL DOCUMENTO CONTIENE GENERALMENTE:
1. Listado de Partidas (Presupuesto).
2. Especificaciones Técnicas (ET) que detallan los requisitos de ejecución.
3. Secciones de Recursos (Personal, Materiales, Equipos).

TAREA:
Extrae cada partida y genera su APU (Análisis de Precios Unitarios) completo vinculando la información de las ET y los recursos.

REQUERIMIENTOS:
- Metadata: item, code (si no tiene usa PDV-001...), description, unit, qty.
- APU Field (apu):
    - yield: Rendimiento esperado (unidades por día). A menudo sale del "Tiempo de Ejecución".
    - materials: Array de {desc, unit, qty, price, waste}.
    - labor: Array de {role, qty, rate}. (Map roles like Capataz, Electricista, Ayudante).
    - equipment: Array de {desc, qty, val, fac}.
- Si el documento no da precios, usa 0 (el usuario los completará).
- Cruza la información: Si la Partida X menciona "uso de grúa" en su ET, incluye la grúa en 'equipment'.

IMPORTANTE: Responde ÚNICAMENTE con un array JSON válido.

TEXTO DEL PLIEGO PDVSA:
"""
${truncatedText}
"""

FORMATO DE RESPUESTA:
[
  {
    "item": 1,
    "code": "PDV-001",
    "description": "...",
    "unit": "...",
    "qty": 5,
    "apu": {
      "yield": 10,
      "materials": [{"desc": "...", "unit": "...", "qty": 1.05, "price": 0, "waste": 5}],
      "labor": [{"role": "...", "qty": 1, "rate": 0}],
      "equipment": [{"desc": "...", "qty": 1, "val": 0, "fac": 0.005}]
    }
  }
]`;

        // Reuse extraction logic but with different prompt and processing
        return this.callAiAndParse(prompt, images);
    }

    async callAiAndParse(prompt, images = []) {
        const maxRetries = 3;
        let retryCount = 0;

        // Construir el array de partes para la IA (Soporte para Visión)
        const parts = [{ text: prompt }];
        images.forEach(imgData => {
            parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: imgData
                }
            });
        });

        while (retryCount < maxRetries) {
            try {
                const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://electromatics-api.onrender.com';
                
                const response = await fetch(`${apiUrl}/generate-content`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: parts
                        }]
                    })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                let aiResponse = '';
                if (data.text) aiResponse = data.text;
                else if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                    aiResponse = data.candidates[0].content.parts[0].text;
                }

                // Cleanup JSON
                aiResponse = aiResponse.trim();
                if (aiResponse.includes('```')) {
                    aiResponse = aiResponse.replace(/```json|```/g, '').trim();
                }

                const partidasRaw = JSON.parse(aiResponse);
                
                // Final normalization
                return partidasRaw.map((p, index) => ({
                    item: p.item || index + 1,
                    code: p.code || `PDV.${String(index + 1).padStart(3, '0')}`,
                    description: p.description || 'Sin descripción',
                    unit: p.unit || 'und',
                    qty: parseFloat(p.qty) || 1,
                    unitPrice: 0,
                    apuData: p.apu ? this.normalizeApuFromAi(p) : null
                }));

            } catch (error) {
                retryCount++;
                if (retryCount >= maxRetries) throw error;
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }

    normalizeApuFromAi(p) {
        const aiApu = p.apu;
        // Map AI result to the format expected by apuUI.loadState
        return {
            metadata: {
                description: p.description,
                code: p.code,
                unit: p.unit,
                qty: p.qty,
                yield: aiApu.yield || 1,
                obra: this.name,
                partidaNo: p.item
            },
            materials: (aiApu.materials || []).map(m => ({
                desc: m.desc, unit: m.unit, qty: m.qty, waste: m.waste || 0, price: m.price || 0
            })),
            equipment: (aiApu.equipment || []).map(e => ({
                desc: e.desc, qty: e.qty, val: e.val || 0, fac: e.fac || 0.001
            })),
            labor: (aiApu.labor || []).map(l => ({
                role: l.role, count: l.qty || 1, rate: l.rate || 0
            })),
            params: {
                fcas: 190, // Default PDVSA
                admin: 15,
                util: 12   // Default PDVSA Utility
            }
        };
    }

    async exportMasterPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'letter'
        });

        // 1. Overlay for UX
        const overlay = document.createElement('div');
        overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:20000; color:white; display:flex; align-items:center; justify-content:center; flex-direction:column; font-family: 'Times New Roman', serif;";
        overlay.innerHTML = `
            <i class="fa-solid fa-layer-group fa-spin fa-5x" style="margin-bottom:20px; color:#4CAF50;"></i>
            <h2 style="font-size:24pt;">Compilando Proyecto Eléctrico</h2>
            <p style="font-size:14pt;">Generando Análisis y Presupuesto Vectorial...</p>
        `;
        document.body.appendChild(overlay);

        try {
            // 2. PAGES: ALL APPROVED APUS
            let apuCount = 0;
            for (const p of this.partidas) {
                if (p.apuData) {
                    if (apuCount > 0) doc.addPage();
                    apuPDF.drawFullAPUPage(doc, p.apuData);
                    apuCount++;
                }
            }

            // 3. PAGE: BUDGET SUMMARY (PRESUPUESTO GENERAL)
            if (apuCount > 0) doc.addPage();
            
            const margin = 15;
            const pageWidth = doc.internal.pageSize.getWidth();
            const contentWidth = pageWidth - (margin * 2);
            let y = margin;

            doc.setFont("times", "bold");
            doc.setFontSize(18);
            doc.text("PRESUPUESTO GENERAL", pageWidth / 2, y + 10, { align: "center" });
            
            doc.setFontSize(14);
            doc.text(this.name, pageWidth / 2, y + 18, { align: "center" });
            
            doc.setLineWidth(1);
            doc.line(margin, y + 25, margin + contentWidth, y + 25);

            y += 35;

            const summaryRows = this.partidas.map(p => [
                p.item,
                p.code,
                p.description,
                p.unit,
                p.qty,
                apuPDF.formatCurrency(p.unitPrice),
                apuPDF.formatCurrency(p.qty * p.unitPrice)
            ]);

            doc.autoTable({
                startY: y,
                head: [['Item', 'Código', 'Descripción', 'Und', 'Cant', 'Precio U.', 'Total']],
                body: summaryRows,
                margin: { left: margin },
                styles: { font: "times", fontSize: 10, cellPadding: 3, lineColor: [0,0,0], lineWidth: 0.1 },
                headStyles: { fillColor: [22, 31, 41], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 25, halign: 'center' },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 15, halign: 'center' },
                    4: { cellWidth: 15, halign: 'center' },
                    5: { cellWidth: 25, halign: 'right' },
                    6: { cellWidth: 30, halign: 'right' }
                },
                theme: 'grid'
            });

            const finalY = doc.lastAutoTable.finalY;
            const grandTotal = document.getElementById('project-total').innerText;

            doc.setFontSize(12);
            doc.setFont("times", "bold");
            doc.text(`TOTAL DEL PRESUPUESTO:`, pageWidth - margin - 60, finalY + 15, { align: "right" });
            doc.text(grandTotal, pageWidth - margin, finalY + 15, { align: "right" });

            // 4. SAVE
            doc.save(`${this.name.replace(/ /g, '_')}_Completo.pdf`);

        } catch (error) {
            console.error("Master PDF Export Error:", error);
            alert("Error generando el PDF completo. Revise la consola.");
        } finally {
            document.body.removeChild(overlay);
        }
    }

    updateGlobalParams() {
        this.globalFcas = parseFloat(document.getElementById('global-fcas').value) || 250;
        document.getElementById('fcas-percent').value = this.globalFcas;
        if(window.apuUI) window.apuUI.updateCalculation();
        // Also re-render master table because currency/rate might have changed implicitly via UI calls
        this.renderMasterTable();
    }
}

window.apuProject = new APUProject();
