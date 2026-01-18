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
            
            // 4. Sequence Logic
            const nextItemNumber = this.partidas.length + 1;
            
            this.addEmptyPartida();
            this.activePartidaIndex = this.partidas.length - 1; 
            
            if (window.apuUI) {
                apuUI.clearForm();
                document.getElementById('apu-partida-no').value = nextItemNumber;
            }
            
            alert(`Partida ${partida.code} aprobada! Presupuesto actualizado.`);
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
        mainContainer.style.padding = '10mm';

        // 1. PAGE: BUDGET SUMMARY
        const summaryTable = document.querySelector('.master-budget-table').cloneNode(true);
        // Clean summary: remove "APU" edit buttons column
        summaryTable.querySelectorAll('th:last-child, td:last-child').forEach(el => el.remove());
        
        const summaryHeader = document.createElement('div');
        summaryHeader.innerHTML = `
            <h1 style="text-align:center; color:#0056b3;">PRESUPUESTO GENERAL</h1>
            <h2 style="text-align:center;">${this.name}</h2>
            <p style="text-align:right;">Total: ${document.getElementById('project-total').innerText}</p>
            <hr style="margin:20px 0;">
        `;
        
        const summaryPage = document.createElement('div');
        summaryPage.appendChild(summaryHeader);
        summaryPage.appendChild(summaryTable);
        mainContainer.appendChild(summaryPage);

        // 2. PAGES: ALL APPROVED APUS
        for (const p of this.partidas) {
            if (p.apuData) {
                const pageBreak = document.createElement('div');
                pageBreak.style.pageBreakBefore = 'always';
                mainContainer.appendChild(pageBreak);

                // Temporarily load into UI to get rendered state
                apuUI.loadState(p.apuData);
                const apuSheet = document.getElementById('apu-sheet');
                const clone = apuPDF.getCleanClone(apuSheet);
                mainContainer.appendChild(clone);
            }
        }

        // 3. EXPORT
        const opt = {
            margin:       [10, 10, 10, 10], 
            filename:     `${this.name.replace(/ /g, '_')}_Completo.pdf`,
            image:        { type: 'jpeg', quality: 0.98 }, 
            html2canvas:  { scale: 2 }, 
            jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };

        // Visible feedback
        const overlay = document.createElement('div');
        overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:20000; color:white; display:flex; align-items:center; justify-content:center; flex-direction:column;";
        overlay.innerHTML = `<i class="fa-solid fa-spinner fa-spin fa-3x"></i><br><h2>Generando Presupuesto Completo...</h2><p>Esto puede tardar unos segundos.</p>`;
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
