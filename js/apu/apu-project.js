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

        // Ensure dates are set on startup
        if (window.apuUI) {
            window.apuUI.setDate();
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
        const rateInput = document.getElementById('exchange-rate');
        const rate = rateInput ? (parseFloat(rateInput.value) || 1) : 1;
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

    handlePdfImport(e) {
        const file = e.target.files[0];
        if(!file) return;
        const zone = document.querySelector('.import-zone');
        const originalContent = zone.innerHTML;
        zone.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size:24px; color:var(--electric-blue)"></i><br><b>ElectrIA Procesando...</b>`;
        setTimeout(() => {
            this.partidas = [
                { item: 1, code: 'E541.111.111', description: 'Salida de Tomacorriente Doble 120V', unit: 'pto', qty: 12, unitPrice: 0, apuData: null },
                { item: 2, code: 'E541.111.101', description: 'Salida para Alumbrado en Techo', unit: 'pto', qty: 8, unitPrice: 0, apuData: null },
                { item: 3, code: 'E511.111.011', description: 'Tubería EMT 1/2" embutida', unit: 'm', qty: 150, unitPrice: 0, apuData: null },
                { item: 4, code: 'E521.111.001', description: 'Cable Cu THHN #12 AWG', unit: 'm', qty: 300, unitPrice: 0, apuData: null }
            ];
            zone.innerHTML = originalContent;
            this.renderMasterTable();
            this.renderSidebar();
            alert("ElectrIA ha extraído las partidas. Proceda a realizar el APU de cada una.");
        }, 2000);
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
