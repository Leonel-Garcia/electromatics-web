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
        try {
            // Using DolarAPI.com (Latam standard)
            const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
            if(response.ok) {
                const data = await response.json();
                // Structure: { promedio: 330.38, fechaActualizacion: ... }
                const bcvRate = data.promedio;
                
                if (bcvRate) {
                    rateInput.value = parseFloat(bcvRate).toFixed(2);
                    this.updateCalculation();
                    console.log(`BCV Rate updated: ${bcvRate}`);
                    
                    // Add badge
                    const label = rateInput.previousElementSibling;
                    const badge = label.querySelector('span');
                    if(badge) badge.innerText = `(Actualizado: ${bcvRate})`;
                    else label.innerHTML += ` <span style="color:green; font-size:0.9em;">(Actualizado)</span>`;
                }
            }
        } catch (error) {
            console.warn('Could not fetch BCV rate, using default.', error);
        }
    },

    setDate() {
        const date = new Date();
        const str = date.toLocaleDateString('es-VE', { year: 'numeric', month: 'short' });
        document.getElementById('current-date').innerText = str;
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
