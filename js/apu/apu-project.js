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
                document.getElementById('display-project-name').innerText = this.name;
            });
        }

        const fileInput = document.getElementById('pdf-upload');
        if(fileInput) {
            fileInput.addEventListener('change', (e) => this.handlePdfImport(e));
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
        let grandTotal = 0;
        this.partidas.forEach((p, index) => {
            const total = p.qty * p.unitPrice;
            grandTotal += total;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.item}</td>
                <td><b>${p.code}</b></td>
                <td>${p.description}</td>
                <td style="text-align:center">${p.unit}</td>
                <td style="text-align:center">${p.qty}</td>
                <td style="text-align:right">$ ${p.unitPrice.toFixed(2)}</td>
                <td style="text-align:right"><b>$ ${total.toFixed(2)}</b></td>
                <td style="text-align:center">
                    <button class="btn-sm" onclick="apuProject.editPartida(${index})"><i class="fa-solid fa-pen-to-square"></i> APU</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        document.getElementById('project-total').innerText = `$ ${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
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
        if (!window.html2pdf) return;
        
        // Save current UI context
        const savedIndex = this.activePartidaIndex;
        const savedView = document.getElementById('view-project').style.display === 'none' ? 'detail' : 'project';
        const savedState = window.apuUI ? apuUI.getState() : null;

        const mainContainer = document.createElement('div');
        mainContainer.style.background = 'white';
        mainContainer.style.fontFamily = "'Times New Roman', Times, serif";
        // Width for Letter: 215.9mm. Using px equivalent (approx 816px at 96dpi) 
        // but html2pdf handles mm accurately if we set width in style.
        mainContainer.style.width = '215.9mm'; 

        // 1. PAGES: ALL APPROVED APUS FIRST
        let apuCount = 0;
        for (const p of this.partidas) {
            if (p.apuData) {
                const apuPage = document.createElement('div');
                // Avoid blank first page: Apply break only if not the first page
                if (apuCount > 0) {
                    apuPage.style.pageBreakBefore = 'always';
                }
                
                apuPage.style.padding = '15mm'; // Slightly smaller margin to fit content
                apuPage.style.boxSizing = 'border-box';
                apuPage.style.width = '215.9mm';
                
                // Temporarily load into UI to get rendered state
                apuUI.loadState(p.apuData);
                const apuSheet = document.getElementById('apu-sheet');
                const clone = apuPDF.getCleanClone(apuSheet);
                
                apuPage.appendChild(clone);
                mainContainer.appendChild(apuPage);
                apuCount++;
            }
        }

        // 2. PAGE: BUDGET SUMMARY (PRESUPUESTO GENERAL) AT THE END
        const summaryPage = document.createElement('div');
        // Always break before summary if we have APUs, or if it's the only page (count=0) it won't matter
        if (apuCount > 0) {
             summaryPage.style.pageBreakBefore = 'always';
        }
        summaryPage.style.padding = '15mm';
        summaryPage.style.boxSizing = 'border-box';
        summaryPage.style.width = '215.9mm';
        
        const summaryHeader = document.createElement('div');
        summaryHeader.innerHTML = `
            <div style="text-align:center; margin-bottom: 30pt;">
                <h1 style="font-size: 24pt; margin-bottom: 10pt; font-weight:bold;">PRESUPUESTO GENERAL</h1>
                <h2 style="font-size: 18pt; color: #000;">${this.name}</h2>
                <div style="width: 100%; border-top: 2.5pt solid #000; margin: 20pt 0;"></div>
            </div>
        `;
        
        const masterTable = document.querySelector('.master-budget-table').cloneNode(true);
        masterTable.style.width = '100%';
        masterTable.style.borderCollapse = 'collapse';
        masterTable.style.fontSize = '12pt';
        masterTable.querySelectorAll('th, td').forEach(cell => {
            cell.style.border = '1.5pt solid #000';
            cell.style.padding = '8pt';
            cell.style.color = '#000';
        });
        
        masterTable.querySelectorAll('tr').forEach(tr => {
            tr.style.pageBreakInside = 'avoid';
        });
        masterTable.querySelectorAll('th:last-child, td:last-child').forEach(el => el.remove());

        const summaryFooter = document.createElement('div');
        summaryFooter.style.marginTop = '40pt';
        summaryFooter.style.textAlign = 'right';
        summaryFooter.innerHTML = `
            <h3 style="font-size: 18pt; font-weight:bold;">TOTAL DEL PRESUPUESTO: <span style="border-bottom: 4pt double #000; padding: 0 10pt;">${document.getElementById('project-total').innerText}</span></h3>
        `;

        summaryPage.appendChild(summaryHeader);
        summaryPage.appendChild(masterTable);
        summaryPage.appendChild(summaryFooter);
        mainContainer.appendChild(summaryPage);

        // 3. EXPORT SETTINGS (MAX FIDELITY & NO INTERNAL MARGINS)
        const opt = {
            margin:       0, // We control margins with padding in the elements
            filename:     `${this.name.replace(/ /g, '_')}_Completo.pdf`,
            image:        { type: 'jpeg', quality: 1.0 }, 
            html2canvas:  { scale: 3, useCORS: true, letterRendering: true, width: 816 }, // Force 816px which corresponds to Letter 
            jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        };

        const overlay = document.createElement('div');
        overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:20000; color:white; display:flex; align-items:center; justify-content:center; flex-direction:column; font-family: 'Times New Roman', serif;";
        overlay.innerHTML = `
            <i class="fa-solid fa-file-circle-check fa-spin fa-5x" style="margin-bottom:20px; color:#4CAF50;"></i>
            <h2 style="font-size:24pt;">Generando Reporte de Ingeniería</h2>
            <p style="font-size:14pt;">Ajustando Dimensiones Carta (215.9mm)...</p>
        `;
        document.body.appendChild(overlay);

        try {
            await html2pdf().set(opt).from(mainContainer).save();
        } finally {
            document.body.removeChild(overlay);
            // Restore UI
            if (savedState) apuUI.loadState(savedState);
            this.switchView(savedView);
            this.activePartidaIndex = savedIndex;
        }
    }

    updateGlobalParams() {
        this.globalFcas = parseFloat(document.getElementById('global-fcas').value) || 250;
        document.getElementById('fcas-percent').value = this.globalFcas;
        if(window.apuUI) window.apuUI.updateCalculation();
    }
}

window.apuProject = new APUProject();
