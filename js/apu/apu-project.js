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

        // Keep sidebar visible as requested
        if(overviewSidebar) overviewSidebar.style.display = 'block';
    }

    /**
     * Formal Approval: Pushes the calculated APU unit price to the Master Budget.
     */
    approveAndAssign() {
        if (this.activePartidaIndex === null) {
            alert("No hay una partida seleccionada para aprobar.");
            return;
        }
        
        const partida = this.partidas[this.activePartidaIndex];
        
        // Final sync of metadata
        partida.description = document.getElementById('partida-desc').value;
        partida.code = document.getElementById('partida-codigo').value;
        partida.unit = document.getElementById('partida-unidad').value;
        partida.qty = parseFloat(document.getElementById('partida-cantidad').value) || 0;

        // Formal assignment of calculated price
        if (window.apuSystem && window.apuSystem.TotalUnitCost) {
            partida.unitPrice = window.apuSystem.TotalUnitCost;
            
            // 1. Export current APU to PDF (Internal Save)
            if (window.apuPDF) {
                apuPDF.exportToPDF();
            }

            // 2. Refresh the Master Budget data
            this.renderMasterTable();
            this.renderSidebar();
            
            // 3. Prepare for NEXT Partida
            const currentNum = parseInt(document.getElementById('apu-partida-no').value) || 0;
            const nextNum = currentNum + 1;
            
            console.log("Preparing next partida...", nextNum);

            // Create new empty partida in the project list
            this.addEmptyPartida();
            this.activePartidaIndex = this.partidas.length - 1; // Make the new one active
            
            // 4. Reset UI Form
            if (window.apuUI) {
                apuUI.clearForm();
                document.getElementById('apu-partida-no').value = nextNum;
            }
            
            alert(`Partida ${partida.code} aprobada y exportada! Formulario listo para la Partida Nº ${nextNum}.`);
            
            // Stay in Detail view (UI is already there, but now cleared)
        } else {
            alert("Error: No se ha podido obtener el costo unitario del cálculo APU.");
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
            model: null // This will store the full PriceAnalysis object
        };
        this.partidas.push(newPartida);
        this.renderMasterTable();
        this.renderSidebar();
    }

    editPartida(index) {
        this.activePartidaIndex = index;
        const partida = this.partidas[index];

        // Load into the APU UI
        if (window.apuUI) {
            // First, update the header fields
            document.getElementById('partida-desc').value = partida.description;
            document.getElementById('partida-codigo').value = partida.code;
            document.getElementById('partida-unidad').value = partida.unit;
            document.getElementById('partida-cantidad').value = partida.qty;
            document.getElementById('apu-partida-no').value = partida.item;
            
            // If we have a model saved, load it
            // Trigger template search to fill tables if empty
            if (partida.code !== 'E.-----' && window.apuSmart) {
                const template = window.APU_TEMPLATES.find(t => t.code === partida.code);
                if (template) {
                    window.apuUI.loadTemplate(template);
                }
            }

            this.switchView('detail');
        }
    }

    // This is called by apuUI.updateCalculation
    // Only Syncs metadata (Draft mode)
    syncActivePartida() {
        if (this.activePartidaIndex === null) return;
        
        const partida = this.partidas[this.activePartidaIndex];
        partida.description = document.getElementById('partida-desc').value;
        partida.code = document.getElementById('partida-codigo').value;
        partida.unit = document.getElementById('partida-unidad').value;
        partida.qty = parseFloat(document.getElementById('partida-cantidad').value) || 0;
        
        // We DON'T update unitPrice here automatically anymore.
        // It requires the "Approve" button for official budget inclusion.
        
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
            div.innerHTML = `
                <div style="font-size: 11px;">
                    <b>${p.code}</b><br>
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

        // Visual simulation of IA processing
        const zone = document.querySelector('.import-zone');
        const originalContent = zone.innerHTML;
        zone.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size:24px; color:var(--electric-blue)"></i><br><b>ElectrIA Procesando...</b>`;

        setTimeout(() => {
            // Mock Data Extraction
            this.partidas = [
                { item: 1, code: 'E541.111.111', description: 'Salida de Tomacorriente Doble 120V', unit: 'pto', qty: 12, unitPrice: 0 },
                { item: 2, code: 'E541.111.101', description: 'Salida para Alumbrado en Techo', unit: 'pto', qty: 8, unitPrice: 0 },
                { item: 3, code: 'E511.111.011', description: 'Tubería EMT 1/2" embutida', unit: 'm', qty: 150, unitPrice: 0 },
                { item: 4, code: 'E521.111.001', description: 'Cable Cu THHN #12 AWG', unit: 'm', qty: 300, unitPrice: 0 }
            ];

            // Auto-apply templates for each extracted item to get initial values
            this.partidas.forEach(p => {
                const template = window.APU_TEMPLATES.find(t => t.code === p.code);
                if (template) {
                    // We need a silent way to calculate the unit price without touching the active UI
                    // For now, let's just mark them. 
                    // To actually get values, we'd need to run PriceAnalysis for each.
                }
            });

            zone.innerHTML = originalContent;
            this.renderMasterTable();
            this.renderSidebar();
            alert("ElectrIA ha extraído 4 partidas de su presupuesto. Puede editarlas individualmente.");
        }, 2000);
    }

    updateGlobalParams() {
        this.globalFcas = parseFloat(document.getElementById('global-fcas').value) || 250;
        document.getElementById('fcas-percent').value = this.globalFcas;
        if(window.apuUI) window.apuUI.updateCalculation();
    }
}

window.apuProject = new APUProject();
