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

        // Mostrar estado de procesamiento
        zone.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin" style="font-size:24px; color:var(--electric-blue)"></i><br>
            <b>ElectrIA Procesando PDF...</b>
            <p style="font-size:10px; margin:5px 0;">Extrayendo texto del documento...</p>
        `;

        try {
            // 1. Configurar PDF.js
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }

            // 2. Leer el archivo PDF
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            // 3. Extraer texto de todas las páginas
            let fullText = '';
            zone.innerHTML = `
                <i class="fa-solid fa-file-lines fa-beat" style="font-size:24px; color:#4CAF50"></i><br>
                <b>Leyendo páginas del PDF...</b>
                <p style="font-size:10px; margin:5px 0;">0 / ${pdf.numPages} páginas</p>
            `;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
                
                zone.querySelector('p').innerText = `${i} / ${pdf.numPages} páginas`;
            }

            if (!fullText.trim()) {
                throw new Error('El PDF no contiene texto legible. Podría ser un PDF escaneado.');
            }

            // 4. Enviar a ElectrIA para análisis
            zone.innerHTML = `
                <i class="fa-solid fa-brain fa-beat-fade" style="font-size:24px; color:var(--safety-orange)"></i><br>
                <b>ElectrIA analizando partidas...</b>
                <p style="font-size:10px; margin:5px 0;">Procesando ${fullText.length} caracteres</p>
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

    /**
     * Extrae partidas del texto del PDF usando la IA
     */
    async extractPartidasWithAI(pdfText) {
        // Limitar el texto para no exceder límites de la API
        const maxChars = 15000;
        const truncatedText = pdfText.length > maxChars 
            ? pdfText.substring(0, maxChars) + '\n... [TEXTO TRUNCADO]' 
            : pdfText;

        const prompt = `Eres un experto en presupuestos de obras eléctricas venezolanas.

Analiza el siguiente texto extraído de un PDF de presupuesto eléctrico y extrae TODAS las partidas que encuentres.

TEXTO DEL PDF:
"""
${truncatedText}
"""

INSTRUCCIONES:
1. Identifica cada partida/ítem del presupuesto
2. Para cada partida extrae: código (ej: E541.111.101), descripción, unidad (pto, m, pza, etc.), y cantidad
3. Si no hay código, genera uno apropiado basado en la categoría Covenin/Fondonorma
4. Si no encuentras cantidad, usa 1 como valor por defecto
5. Ignora subtotales, totales, encabezados y pies de página

RESPONDE ÚNICAMENTE con un array JSON válido, sin explicaciones ni markdown:
[
  {"item": 1, "code": "E541.111.111", "description": "Descripción de la partida", "unit": "pto", "qty": 12},
  {"item": 2, "code": "E511.111.011", "description": "Otra partida", "unit": "m", "qty": 100}
]

Si no encuentras partidas válidas, responde con un array vacío: []`;

        try {
            const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://electromatics-api.onrender.com';
            
            const response = await fetch(`${apiUrl}/generate-content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            // Manejar respuesta
            const contentType = response.headers.get('content-type');
            let aiResponse = '';

            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (data.text) {
                    aiResponse = data.text;
                } else if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                    aiResponse = data.candidates[0].content.parts[0].text;
                }
            } else {
                // Streaming response
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    aiResponse += decoder.decode(value, { stream: true });
                }
            }

            // Limpiar y parsear la respuesta JSON
            aiResponse = aiResponse.trim();
            
            // Remover posibles bloques de código markdown
            if (aiResponse.startsWith('```json')) {
                aiResponse = aiResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (aiResponse.startsWith('```')) {
                aiResponse = aiResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            const partidas = JSON.parse(aiResponse);
            
            if (!Array.isArray(partidas)) {
                throw new Error('La respuesta de la IA no es un array válido');
            }

            // Validar y normalizar cada partida
            return partidas.map((p, index) => ({
                item: p.item || index + 1,
                code: p.code || `E.${String(index + 1).padStart(3, '0')}`,
                description: p.description || 'Partida sin descripción',
                unit: p.unit || 'und',
                qty: parseFloat(p.qty) || 1,
                unitPrice: 0,
                apuData: null
            }));

        } catch (error) {
            console.error('Error extrayendo partidas con IA:', error);
            throw new Error(`Error al analizar con IA: ${error.message}`);
        }
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
