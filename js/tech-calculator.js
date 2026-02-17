const TechCalc = {
    state: {
        system: '1Phase', // '1Phase' or '3Phase'
        mode: 'AMPS',     // 'AMPS', 'POWER', 'VOLTAGE', 'RESISTANCE', 'VDROP'
        connection: 'Star', // 'Star' or 'Delta'
        powerUnit: 'kW'    // 'W', 'kW', 'HP'
    },

    init() {
        this.renderInputs();
        this.bindEvents();
        this.calculate();
    },

    setSystem(system) {
        this.state.system = system;
        document.getElementById('type-monofasico').classList.toggle('active', system === '1Phase');
        document.getElementById('type-trifasico').classList.toggle('active', system === '3Phase');
        this.renderInputs();
        this.calculate();
    },

    setConnection(conn) {
        this.state.connection = conn;
        document.getElementById('conn-star')?.classList.toggle('active', conn === 'Star');
        document.getElementById('conn-delta')?.classList.toggle('active', conn === 'Delta');
        this.calculate();
    },

    setMode(mode) {
        this.state.mode = mode;
        const buttons = document.querySelectorAll('.mode-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
        });
        this.renderInputs();
        this.calculate();
    },

    renderInputs() {
        const container = document.getElementById('inputs-container');
        container.innerHTML = '';
        
        // Connection Selector (Only for 3-phase)
        let connectionMarkup = '';
        if (this.state.system === '3Phase') {
            connectionMarkup = `
                <div class="input-group-premium">
                    <label>Tipo de Conexión</label>
                    <div class="mode-toggle" style="margin-bottom: 15px; background: rgba(0,0,0,0.2);">
                        <button class="mode-btn ${this.state.connection === 'Star' ? 'active' : ''}" id="conn-star" onclick="TechCalc.setConnection('Star')" style="font-size: 13px;">Estrella (Y)</button>
                        <button class="mode-btn ${this.state.connection === 'Delta' ? 'active' : ''}" id="conn-delta" onclick="TechCalc.setConnection('Delta')" style="font-size: 13px;">Delta (Δ)</button>
                    </div>
                </div>`;
        }

        // Common Input: Voltage
        const voltageInput = `
            <div class="input-group-premium">
                <label>Voltaje de Línea (V)</label>
                <div class="input-wrapper">
                    <i class="fa-solid fa-plug"></i>
                    <input type="number" id="input-voltage" class="input-premium" value="208">
                </div>
            </div>`;

        // Common Input: Amps
        const ampsInput = `
            <div class="input-group-premium">
                <label>Corriente de Línea (A)</label>
                <div class="input-wrapper">
                    <i class="fa-solid fa-gauge"></i>
                    <input type="number" id="input-amps" class="input-premium" value="40" step="any">
                </div>
            </div>`;

        // Common Input: Power
        const powerInput = `
            <div class="input-group-premium">
                <label>Potencia nominal</label>
                <div style="display: flex; gap: 10px;">
                    <div class="input-wrapper" style="flex: 2;">
                        <i class="fa-solid fa-bolt"></i>
                        <input type="number" id="input-power" class="input-premium" value="10" step="any">
                    </div>
                    <select id="select-unit" class="select-premium" style="flex: 1;">
                        <option value="kW">kW</option>
                        <option value="HP">HP</option>
                        <option value="W">W</option>
                    </select>
                </div>
            </div>`;

        switch(this.state.mode) {
            case 'AMPS':
                container.innerHTML = connectionMarkup + powerInput + voltageInput;
                this.updateLabels('Corriente Línea (IL)', 'A', 'Potencia Aparente (S)', 'kVA');
                break;
            case 'POWER':
                container.innerHTML = connectionMarkup + ampsInput + voltageInput;
                this.updateLabels('Potencia Real (P)', 'kW', 'Potencia Aparente (S)', 'kVA');
                break;
            case 'VOLTAGE':
                container.innerHTML = connectionMarkup + powerInput + ampsInput;
                this.updateLabels('Voltaje Línea (VL)', 'V', 'Potencia Aparente (S)', 'kVA');
                break;
            case 'RESISTANCE':
                container.innerHTML = connectionMarkup + voltageInput + ampsInput;
                this.updateLabels('Resist. Fase (Rph)', 'Ω', 'Potencia Total (P)', 'kW');
                break;
            case 'VDROP':
                container.innerHTML = ampsInput + `
                    <div class="input-group-premium">
                        <label>Distancia (metros)</label>
                        <div class="input-wrapper">
                            <i class="fa-solid fa-ruler-horizontal"></i>
                            <input type="number" id="input-dist" class="input-premium" value="50">
                        </div>
                    </div>
                    <div class="input-group-premium">
                        <label>Calibre (mm²)</label>
                        <div class="input-wrapper">
                            <i class="fa-solid fa-layer-group"></i>
                            <input type="number" id="input-wire" class="input-premium" value="8.37">
                        </div>
                        <small style="color: #666; font-size: 11px;">#8 AWG ≈ 8.37 mm²</small>
                    </div>` + voltageInput;
                this.updateLabels('Caída de Tensión', 'V', 'Porcentaje de Caída', '%');
                break;
        }

        this.bindEvents();
    },

    updateLabels(l1, u1, l2, u2) {
        document.getElementById('result-label-1').textContent = l1 + ':';
        document.getElementById('unit-primary').textContent = u1;
        document.getElementById('result-label-2').textContent = l2 + ':';
        document.getElementById('unit-secondary').textContent = u2;
    },

    bindEvents() {
        const inputs = document.querySelectorAll('.input-premium, .select-premium');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.calculate());
        });
    },

    calculate() {
        const V = parseFloat(document.getElementById('input-voltage')?.value) || 0;
        const I = parseFloat(document.getElementById('input-amps')?.value) || 0;
        const FP = parseFloat(document.getElementById('input-fp').value) || 1;
        const Eff = (parseFloat(document.getElementById('input-eff').value) || 100) / 100;
        const sqrt3 = Math.sqrt(3);
        const rho = 0.0172; // Resistividad cobre

        let res1 = 0, res2 = 0;

        const getWatts = () => {
            const pVal = parseFloat(document.getElementById('input-power')?.value) || 0;
            const unit = document.getElementById('select-unit')?.value;
            if (unit === 'kW') return pVal * 1000;
            if (unit === 'HP') return pVal * 745.7;
            return pVal;
        };

        const factor = this.state.system === '1Phase' ? 1 : sqrt3;

        switch(this.state.mode) {
            case 'AMPS':
                const W = getWatts();
                if (V > 0) {
                    res1 = W / (V * factor * FP * Eff);
                    res2 = (V * res1 * factor) / 1000;
                }
                break;
            case 'POWER':
                res1 = (V * I * factor * FP * Eff) / 1000;
                res2 = (V * I * factor) / 1000;
                break;
            case 'VOLTAGE':
                const Wv = getWatts();
                if (I > 0) {
                    res1 = Wv / (I * factor * FP * Eff);
                    res2 = (res1 * I * factor) / 1000;
                }
                break;
            case 'RESISTANCE':
                if (I > 0 && V > 0) {
                    if (this.state.system === '1Phase') {
                        res1 = V / I;
                    } else {
                        // Trifásico: R de fase depende de conexión
                        if (this.state.connection === 'Star') {
                            // Rph = (VL / sqrt3) / IL
                            res1 = V / (sqrt3 * I);
                        } else {
                            // Rph = VL / (IL / sqrt3) = (sqrt3 * VL) / IL
                            res1 = (sqrt3 * V) / I;
                        }
                    }
                    res2 = (V * I * factor * FP * Eff) / 1000;
                }
                break;
            case 'VDROP':
                const dist = parseFloat(document.getElementById('input-dist').value) || 0;
                const mm2 = parseFloat(document.getElementById('input-wire').value) || 1;
                const k = this.state.system === '1Phase' ? 2 : sqrt3;
                res1 = (k * rho * dist * I) / mm2;
                res2 = V > 0 ? (res1 / V) * 100 : 0;
                break;
        }

        this.animateValue('val-primary', res1);
        this.animateValue('val-secondary', res2);
    },

    animateValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.innerText = isFinite(value) ? value.toFixed(2) : "0.00";
        }
    }
};

document.addEventListener('DOMContentLoaded', () => TechCalc.init());
