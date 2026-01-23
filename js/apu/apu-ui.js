/**
 * APU UI Controller
 * Handles DOM interactions and updates for the "Paper Sheet" design
 */

const apuUI = {
    currentCurrency: 'USD',
    
    init() {
        this.bindEvents();
        this.setDate();
        // Start with some empty rows
        this.addMaterialRow();
        this.addEquipmentRow();
        this.addLaborRow();
        this.updateCalculation();
        
        // Fetch BCV Rate
        this.fetchExchangeRate();
    },

    async fetchExchangeRate() {
        const rateInput = document.getElementById('exchange-rate');
        if (!rateInput) return;

        // Visual indicator
        rateInput.style.opacity = '0.7';

        const updateUI = (rate, updateDateIso, source) => {
            if(!rate || isNaN(rate)) return;
            
            // Clean rate if it's a string with commas
            let cleanRate = rate;
            if (typeof rate === 'string') {
                cleanRate = parseFloat(rate.replace(',', '.'));
            }
            
            rateInput.value = cleanRate.toFixed(2);
            rateInput.style.opacity = '1';
            
            this.updateCalculation();
            console.log(`BCV Rate updated: ${cleanRate} from ${source}`);

            const label = rateInput.previousElementSibling;
            if (label) {
                const existingBadge = label.querySelector('.rate-badge');
                if(existingBadge) existingBadge.remove();

                const now = new Date();
                const dateStr = now.toLocaleString('es-VE', { 
                    day: '2-digit', month: '2-digit', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit', hour12: true 
                });

                const badge = document.createElement('div');
                badge.className = 'rate-badge';
                badge.style = "color:#1565c0; font-size:0.85em; font-weight:600; margin-top:4px; padding:4px; border-top:1px dotted #ccc; background:#e3f2fd; border-radius:4px;";
                const formattedRate = cleanRate.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                badge.innerHTML = `<i class="fa-solid fa-cloud-bolt"></i> BCV: ${formattedRate} Bs ($) <br><span style="font-size:0.9em; color:#666;">Fuente: ${source} <br>Consultado: ${dateStr}</span>`;
                label.appendChild(badge);
            }
        };

        // Source 1: Backend Proxy (Recommended / Auto-hosted)
        try {
            const apiBase = window.API_BASE_URL || "http://localhost:8001";
            console.log("Fetching BCV from Local Backend Proxy...");
            const response = await fetch(`${apiBase}/api/bcv?v=${Date.now()}`, { cache: 'no-cache' });
            if (response.ok) {
                const data = await response.json();
                if (data.rate) {
                    updateUI(data.rate, data.updated_at, data.source || 'Backend API');
                    return;
                }
            }
        } catch (e) { console.warn("Backend BCV API failed", e); }

        // Source 2: Direct DolarAPI (Fallback)
        try {
            console.log("Fetching BCV rate from DolarAPI directly...");
            const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { cache: 'no-cache' });
            if (response.ok) {
                const data = await response.json();
                if (data.promedio && data.promedio > 0) {
                    updateUI(data.promedio, data.fechaActualizacion, 'DolarAPI Direct');
                    return;
                }
            }
        } catch (e) { console.warn("Direct DolarAPI failed", e); }

        // Fail State
        rateInput.style.opacity = '1'; 
        console.error("All exchange rate sources failed.");
        const label = rateInput.previousElementSibling;
        if (label && !label.querySelector('.rate-badge')) {
            const badge = document.createElement('div');
            badge.className = 'rate-badge';
            badge.style = "color:#d32f2f; font-size:0.85em; font-weight:600; margin-top:4px; background:#ffebee; padding:4px; border-radius:4px;";
            badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Error al actualizar tasa.<br><span style="font-weight:normal">Ajuste manualmente si es necesario.</span>`;
            label.appendChild(badge);
        }
    },

    setDate() {
        const date = new Date();
        const fullDateStr = date.toLocaleDateString('es-VE', { 
            day: '2-digit', month: 'long', year: 'numeric' 
        });
        const shortDateStr = date.toLocaleDateString('es-VE', { 
            month: 'short', year: 'numeric' 
        });
        
        // Update both the "Jan 2026" header and any potential full date displays
        const dateEl = document.getElementById('current-date');
        if (dateEl) dateEl.innerText = fullDateStr;

        const displayDateEl = document.getElementById('display-project-date');
        if (displayDateEl) displayDateEl.innerText = `Generado: ${fullDateStr}`;
    },

    bindEvents() {
        document.body.addEventListener('input', (e) => {
            if (e.target.classList.contains('sheet-input') || e.target.tagName === 'INPUT') {
                this.updateCalculation();
            }
        });
    },

    setCurrency(curr) {
        this.currentCurrency = curr;
        if(curr === 'USD') document.querySelectorAll('.currency-symbol').forEach(el => el.innerText = '$');
        else document.querySelectorAll('.currency-symbol').forEach(el => el.innerText = 'Bs');

        this.updateCalculation();
    },
    
    setSector(sector) {
        APU_CONFIG.currentSector = sector;
        // Trigger a re-read of labor rates? 
        // Ideally we should update the rates in the table if they match a standard role.
        // For now, let's just user re-enter or smart-fill again. 
        // Better: iterate rows and update if role exists in DB.
        document.querySelectorAll('#table-labor tbody tr').forEach(tr => {
            const roleInput = tr.querySelector('.lab-role');
            const rateInput = tr.querySelector('.lab-rate');
            const role = roleInput.value;
            if(role && APU_DATA.laborRates[sector][role]) {
                rateInput.value = APU_DATA.laborRates[sector][role];
            }
        });
        this.updateCalculation();
    },

    // --- ROWS ---
    addMaterialRow(data = null) {
        const tbody = document.querySelector('#table-materials tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="align-left">
                <input type="text" class="sheet-input mat-desc" value="${data ? data.desc : ''}" placeholder="Material...">
                <div class="mat-suggestions" style="position:absolute; background:white; border:1px solid #ccc; display:none; z-index:100; font-size: 0.8em; max-width: 200px;"></div>
            </td>
            <td><input type="text" class="sheet-input mat-unit" value="${data ? data.unit : 'und'}" style="text-align:center"></td>
            <td><input type="number" class="sheet-input mat-qty" value="${data ? data.qty : '1.00'}" style="text-align:center"></td>
            <td><input type="number" class="sheet-input mat-waste" value="${data && data.waste ? data.waste : '0'}" style="text-align:center"></td>
            <td><input type="number" class="sheet-input mat-price" value="${data ? data.price : '0.00'}" style="text-align:right"></td>
            <td class="align-right"><span class="row-total">0.00</span></td>
            <td><i class="fa-solid fa-xmark" style="cursor:pointer; color:red;" onclick="this.closest('tr').remove(); apuUI.updateCalculation()"></i></td>
        `;

        const input = tr.querySelector('.mat-desc');
        const suggBox = tr.querySelector('.mat-suggestions');
        
        input.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            if (val.length < 2) { suggBox.style.display = 'none'; return; }
            const matches = APU_DATA.materials.filter(m => m.desc.toLowerCase().includes(val)).slice(0, 5);
            if (matches.length > 0) {
                suggBox.innerHTML = matches.map(m => `<div style="padding:4px; cursor:pointer;" class="sugg-item" data-price="${m.price}" data-unit="${m.unit}">${m.desc}</div>`).join('');
                suggBox.style.display = 'block';
                suggBox.querySelectorAll('.sugg-item').forEach(item => {
                    item.onclick = () => {
                        input.value = item.innerText;
                        tr.querySelector('.mat-unit').value = item.dataset.unit;
                        tr.querySelector('.mat-price').value = item.dataset.price;
                        suggBox.style.display = 'none';
                        this.updateCalculation();
                    };
                });
            } else {
                suggBox.style.display = 'none';
            }
        });

        // Hide suggestions on blur (delayed to allow click)
        input.addEventListener('blur', () => setTimeout(() => suggBox.style.display = 'none', 200));

        tbody.appendChild(tr);
    },

    addEquipmentRow(data = null) {
        const tbody = document.querySelector('#table-equipment tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="align-left">
                <input type="text" class="sheet-input eq-desc" value="${data ? data.desc : ''}" placeholder="Equipo...">
                <div class="eq-suggestions" style="position:absolute; background:white; border:1px solid #ccc; display:none; z-index:100; font-size: 0.8em; max-width: 200px;"></div>
            </td>
            <td><input type="number" class="sheet-input eq-qty" value="${data ? data.qty : '1.00'}" style="text-align:center"></td>
            <td><input type="number" class="sheet-input eq-val" value="${data ? data.price : '0.00'}" style="text-align:right"></td>
            <td><input type="number" class="sheet-input eq-fac" value="${data && data.factor ? data.factor : '0.001'}" style="text-align:center"></td>
            <td class="align-right"><span class="row-total">0.00</span></td>
            <td><i class="fa-solid fa-xmark" style="cursor:pointer; color:red;" onclick="this.closest('tr').remove(); apuUI.updateCalculation()"></i></td>
        `;

        const input = tr.querySelector('.eq-desc');
        const suggBox = tr.querySelector('.eq-suggestions');
        
        input.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            if (val.length < 2) { suggBox.style.display = 'none'; return; }
            const matches = APU_DATA.equipment.filter(eq => eq.desc.toLowerCase().includes(val)).slice(0, 5);
            if (matches.length > 0) {
                suggBox.innerHTML = matches.map(eq => `<div style="padding:4px; cursor:pointer;" class="sugg-item" data-rate="${eq.rate}">${eq.desc}</div>`).join('');
                suggBox.style.display = 'block';
                suggBox.querySelectorAll('.sugg-item').forEach(item => {
                    item.onclick = () => {
                        input.value = item.innerText;
                        tr.querySelector('.eq-val').value = item.dataset.rate;
                        suggBox.style.display = 'none';
                        this.updateCalculation();
                    };
                });
            } else {
                suggBox.style.display = 'none';
            }
        });

        input.addEventListener('blur', () => setTimeout(() => suggBox.style.display = 'none', 200));

        tbody.appendChild(tr);
    },


    addLaborRow(data = null) {
        const tbody = document.querySelector('#table-labor tbody');
        if (!tbody) return;
        const tr = document.createElement('tr');
        
        let rate = data ? data.rate : 0;
        if (!rate && data && data.role) {
             const sectorEl = document.getElementById('labor-sector');
             const sector = sectorEl ? sectorEl.value : 'construction';
             rate = (APU_DATA.laborRates[sector] && APU_DATA.laborRates[sector][data.role]) || 0;
        }

        tr.innerHTML = `
            <td class="align-left"><input type="text" class="sheet-input lab-role" value="${data ? data.role : ''}" placeholder="Cargo..."></td>
            <td><input type="number" class="sheet-input lab-qty" value="${data ? (data.count || data.qty) : '1.00'}" style="text-align:center"></td>
            <td><input type="number" class="sheet-input lab-rate" value="${rate}" style="text-align:right"></td>
            <td class="align-right"><span class="row-total">0.00</span></td>
            <td><i class="fa-solid fa-xmark" style="cursor:pointer; color:red;" onclick="this.closest('tr').remove(); apuUI.updateCalculation()"></i></td>
        `;
        tbody.appendChild(tr);
    },

    // --- CALC ---
    updateCalculation() {
        const model = window.apuSystem;
        if (!model) return;

        const exchangeInput = document.getElementById('exchange-rate');
        const exchangeRate = exchangeInput ? (parseFloat(exchangeInput.value) || 1) : 1;
        const isBs = this.currentCurrency === 'BS';
        const mult = isBs ? exchangeRate : 1;

        // 1. HEADER
        const yieldInput = document.getElementById('partida-rendimiento');
        model.yield = yieldInput ? (parseFloat(yieldInput.value) || 1) : 1;
        
        // 2. MATERIALS
        model.materials = [];
        document.querySelectorAll('#table-materials tbody tr').forEach(tr => {
            const desc = tr.querySelector('.mat-desc').value;
            const unit = tr.querySelector('.mat-unit').value;
            const qty = parseFloat(tr.querySelector('.mat-qty').value) || 0;
            const waste = parseFloat(tr.querySelector('.mat-waste').value) || 0;
            const priceVal = parseFloat(tr.querySelector('.mat-price').value) || 0;
            
            model.addMaterial(desc, unit, qty, priceVal, waste);
            
            const rowTotal = qty * priceVal * (1 + waste/100);
            const rowTotalEl = tr.querySelector('.row-total');
            if (rowTotalEl) {
                const numericRowTotal = isNaN(rowTotal) ? 0 : rowTotal;
                rowTotalEl.innerText = (numericRowTotal * mult).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }
        });
        
        const totalMatEl = document.getElementById('total-materials');
        const unitMatEl = document.getElementById('unit-materials');
        if (totalMatEl) totalMatEl.innerText = (model.MaterialCostTotal * mult).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (unitMatEl) unitMatEl.innerText = (model.MaterialCostUnit * mult).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        // 3. EQUIPMENT
        model.equipment = [];
        document.querySelectorAll('#table-equipment tbody tr').forEach(tr => {
            const desc = tr.querySelector('.eq-desc').value;
            const qty = parseFloat(tr.querySelector('.eq-qty').value) || 0;
            const val = parseFloat(tr.querySelector('.eq-val').value) || 0;
            const fac = parseFloat(tr.querySelector('.eq-fac').value) || 0;
            
            model.addEquipment(desc, qty, val, fac);
            
            const rowTotal = qty * val * fac;
            const rowTotalEl = tr.querySelector('.row-total');
            if (rowTotalEl) {
                const numericRowTotal = isNaN(rowTotal) ? 0 : rowTotal;
                rowTotalEl.innerText = (numericRowTotal * mult).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }
        });
        
        const totalEqEl = document.getElementById('total-equipment');
        const unitEqEl = document.getElementById('unit-equipment');
        if (totalEqEl) totalEqEl.innerText = (model.EquipmentCostTotal * mult).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (unitEqEl) unitEqEl.innerText = (model.EquipmentCostUnit * mult).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        // 4. LABOR
        model.labor = [];
        document.querySelectorAll('#table-labor tbody tr').forEach(tr => {
            const role = tr.querySelector('.lab-role').value;
            const qty = parseFloat(tr.querySelector('.lab-qty').value) || 0;
            const rate = parseFloat(tr.querySelector('.lab-rate').value) || 0;
            
            model.addLabor(role, qty, rate);
            
            const rowTotal = qty * rate;
            const rowTotalEl = tr.querySelector('.row-total');
            if (rowTotalEl) {
                const numericRowTotal = isNaN(rowTotal) ? 0 : rowTotal;
                rowTotalEl.innerText = (numericRowTotal * mult).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }
        });

        // 5. SUMMARY
        const fcasIn = document.getElementById('fcas-percent');
        const adminIn = document.getElementById('admin-percent');
        const utilIn = document.getElementById('util-percent');
        
        model.fcasPercent = fcasIn ? (parseFloat(fcasIn.value) || 0) : 0;
        model.adminPercent = adminIn ? (parseFloat(adminIn.value) || 0) : 0;
        model.utilityPercent = utilIn ? (parseFloat(utilIn.value) || 0) : 0;
        
        // Fill Summary Elements safely
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if(el) {
                const numericVal = isNaN(val) ? 0 : val;
                el.innerText = (numericVal * mult).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }
        };

        setVal('total-labor-base', model.LaborBaseDaily);
        setVal('val-fcas', model.FCASAmount);
        setVal('val-bono', model.FoodBonusTotal);
        setVal('total-labor-day', model.LaborDailyTotal);
        setVal('unit-labor', model.LaborCostUnit);
        
        setVal('cost-direct', model.DirectCost);
        setVal('val-admin', model.AdminAmount);
        setVal('sub-admin', (model.DirectCost + model.AdminAmount));
        setVal('val-util', model.UtilityAmount);
        setVal('sub-util', (model.DirectCost + model.AdminAmount + model.UtilityAmount));
        
        setVal('final-price', model.TotalUnitCost);

        // Sync to Project Model if it exists
        if (window.apuProject) {
            window.apuProject.syncActivePartida();
            window.apuProject.renderMasterTable();
        }
    },
    
    // Call from smart JS
    loadTemplate(template) {
        console.log("Loading template into UI...", template.code);
        const matTbody = document.querySelector('#table-materials tbody');
        const eqTbody = document.querySelector('#table-equipment tbody');
        const labTbody = document.querySelector('#table-labor tbody');

        if(matTbody) matTbody.innerHTML = '';
        if(eqTbody) eqTbody.innerHTML = '';
        if(labTbody) labTbody.innerHTML = '';
        
        if (template.materials) template.materials.forEach(m => this.addMaterialRow(m));
        if (template.equipment) template.equipment.forEach(e => this.addEquipmentRow(e)); 
        if (template.labor) template.labor.forEach(l => this.addLaborRow(l));
        
        this.updateCalculation();
        console.log("Template loaded successfully");
    },

    clearForm() {
        console.log("Clearing APU Form...");
        const matTbody = document.querySelector('#table-materials tbody');
        const eqTbody = document.querySelector('#table-equipment tbody');
        const labTbody = document.querySelector('#table-labor tbody');

        if(matTbody) matTbody.innerHTML = '';
        if(eqTbody) eqTbody.innerHTML = '';
        if(labTbody) labTbody.innerHTML = '';

        // Reset metadata
        document.getElementById('partida-desc').value = '';
        document.getElementById('partida-codigo').value = '';
        document.getElementById('partida-unidad').value = 'und';
        document.getElementById('partida-cantidad').value = '1.00';
        document.getElementById('yield').value = '1.00';

        // Add default empty rows
        this.addMaterialRow();
        this.addEquipmentRow();
        this.addLaborRow();

        this.updateCalculation();
    },

    getState() {
        // Collect all row data for saving/cloning
        const state = {
            metadata: {
                description: document.getElementById('partida-desc').value,
                code: document.getElementById('partida-codigo').value,
                unit: document.getElementById('partida-unidad').value,
                qty: document.getElementById('partida-cantidad').value,
                yield: document.getElementById('partida-rendimiento').value,
                obra: document.getElementById('apu-obra').value,
                partidaNo: document.getElementById('apu-partida-no').value
            },
            materials: [],
            equipment: [],
            labor: [],
            params: {
                fcas: document.getElementById('fcas-percent').value,
                admin: document.getElementById('admin-percent').value,
                util: document.getElementById('util-percent').value
            }
        };

        document.querySelectorAll('#table-materials tbody tr').forEach(tr => {
            state.materials.push({
                desc: tr.querySelector('.mat-desc').value,
                unit: tr.querySelector('.mat-unit').value,
                qty: tr.querySelector('.mat-qty').value,
                waste: tr.querySelector('.mat-waste').value,
                price: tr.querySelector('.mat-price').value
            });
        });

        document.querySelectorAll('#table-equipment tbody tr').forEach(tr => {
            state.equipment.push({
                desc: tr.querySelector('.eq-desc').value,
                qty: tr.querySelector('.eq-qty').value,
                val: tr.querySelector('.eq-val').value,
                fac: tr.querySelector('.eq-fac').value
            });
        });

        document.querySelectorAll('#table-labor tbody tr').forEach(tr => {
            state.labor.push({
                role: tr.querySelector('.lab-role').value,
                count: tr.querySelector('.lab-qty').value,
                rate: tr.querySelector('.lab-rate').value
            });
        });

        return state;
    },

    loadState(state) {
        if (!state) return;

        // Load Metadata
        if (state.metadata) {
            document.getElementById('partida-desc').value = state.metadata.description || '';
            document.getElementById('partida-codigo').value = state.metadata.code || '';
            document.getElementById('partida-unidad').value = state.metadata.unit || 'und';
            document.getElementById('partida-cantidad').value = state.metadata.qty || '1.00';
            document.getElementById('partida-rendimiento').value = state.metadata.yield || '1.00';
            document.getElementById('apu-obra').value = state.metadata.obra || '';
            document.getElementById('apu-partida-no').value = state.metadata.partidaNo || '1';
        }

        // Load Tables
        const matTbody = document.querySelector('#table-materials tbody');
        const eqTbody = document.querySelector('#table-equipment tbody');
        const labTbody = document.querySelector('#table-labor tbody');

        if(matTbody) matTbody.innerHTML = '';
        if(eqTbody) eqTbody.innerHTML = '';
        if(labTbody) labTbody.innerHTML = '';

        if (state.materials) state.materials.forEach(m => this.addMaterialRow(m));
        if (state.equipment) state.equipment.forEach(e => this.addEquipmentRow(e));
        if (state.labor) state.labor.forEach(l => this.addLaborRow(l));

        // Load Params
        if (state.params) {
            document.getElementById('fcas-percent').value = state.params.fcas || 250;
            document.getElementById('admin-percent').value = state.params.admin || 15;
            document.getElementById('util-percent').value = state.params.util || 10;
        }

        this.updateCalculation();
    }
};

window.apuUI = apuUI;

document.addEventListener('DOMContentLoaded', () => {
    apuUI.init();
});
