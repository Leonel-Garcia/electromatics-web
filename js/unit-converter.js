/**
 * UNIT CONVERTER ENGINE
 * Electromatics.com.ve
 */

const unitData = {
    potencia: {
        title: "Potencia",
        icon: "fa-bolt",
        units: {
            W: { name: "Vatios (W)", factor: 1 },
            kW: { name: "Kilovatios (kW)", factor: 1000 },
            MW: { name: "Megavatios (MW)", factor: 1000000 },
            hp: { name: "Caballos de Fuerza (hp)", factor: 745.7 },
            "BTU/h": { name: "BTU por hora", factor: 0.293071 }
        }
    },
    voltaje: {
        title: "Voltaje",
        icon: "fa-plug",
        units: {
            V: { name: "Voltios (V)", factor: 1 },
            mV: { name: "Milivoltios (mV)", factor: 0.001 },
            kV: { name: "Kilovoltios (kV)", factor: 1000 }
        }
    },
    corriente: {
        title: "Corriente",
        icon: "fa-microchip",
        units: {
            A: { name: "Amperios (A)", factor: 1 },
            mA: { name: "Miliamperios (mA)", factor: 0.001 },
            kA: { name: "Kilocamperios (kA)", factor: 1000 }
        }
    },
    resistencia: {
        title: "Resistencia",
        icon: "fa-omega",
        units: {
            ohm: { name: "Ohmios (Ω)", factor: 1 },
            mohm: { name: "Miliohmios (mΩ)", factor: 0.001 },
            kohm: { name: "Kilohmios (kΩ)", factor: 1000 },
            Mohm: { name: "Megahmios (MΩ)", factor: 1000000 }
        }
    },
    energia: {
        title: "Energía",
        icon: "fa-battery-full",
        units: {
            J: { name: "Julios (J)", factor: 1 },
            kJ: { name: "Kilojulios (kJ)", factor: 1000 },
            kWh: { name: "Kilovatios-hora (kWh)", factor: 3600000 },
            cal: { name: "Calorías (cal)", factor: 4.184 },
            kcal: { name: "Kilocalorías (kcal)", factor: 4184 }
        }
    },
    presion: {
        title: "Presión",
        icon: "fa-gauge-high",
        units: {
            Pa: { name: "Pascal (Pa)", factor: 1 },
            kPa: { name: "Kilopascal (kPa)", factor: 1000 },
            bar: { name: "Bar (bar)", factor: 100000 },
            psi: { name: "PSI (lb/in²)", factor: 6894.76 },
            atm: { name: "Atmósfera (atm)", factor: 101325 }
        }
    },
    flujo: {
        title: "Flujo",
        icon: "fa-faucet",
        units: {
            "m3/s": { name: "Metro cúbico por seg (m³/s)", factor: 1 },
            LPM: { name: "Litros por min (LPM)", factor: 1/60000 },
            GPM: { name: "Galones por min (GPM)", factor: 1/15850.3 },
            "ft3/min": { name: "Pies cúbicos por min (CFM)", factor: 1/2118.88 }
        }
    },
    fuerza: {
        title: "Fuerza",
        icon: "fa-hand-fist",
        units: {
            N: { name: "Newton (N)", factor: 1 },
            kN: { name: "Kilonewton (kN)", factor: 1000 },
            lbf: { name: "Libra-fuerza (lbf)", factor: 4.44822 },
            kgf: { name: "Kilogramos-fuerza (kgf)", factor: 9.80665 }
        }
    },
    torque: {
        title: "Torque",
        icon: "fa-rotate",
        units: {
            "N·m": { name: "Newton-metro (N·m)", factor: 1 },
            "lb·ft": { name: "Libra-pie (lb·ft)", factor: 1.35582 },
            "kg·m": { name: "Kilogramos-metro (kg·m)", factor: 9.80665 }
        }
    },
    longitud: {
        title: "Longitud",
        icon: "fa-ruler-horizontal",
        units: {
            m: { name: "Metros (m)", factor: 1 },
            cm: { name: "Centímetros (cm)", factor: 0.01 },
            mm: { name: "Milímetros (mm)", factor: 0.001 },
            km: { name: "Kilómetros (km)", factor: 1000 },
            in: { name: "Pulgadas (in)", factor: 0.0254 },
            ft: { name: "Pies (ft)", factor: 0.3048 }
        }
    },
    frecuencia: {
        title: "Frecuencia",
        icon: "fa-wave-square",
        units: {
            Hz: { name: "Herzios (Hz)", factor: 1 },
            kHz: { name: "Kiloherzios (kHz)", factor: 1000 },
            MHz: { name: "Megaherzios (MHz)", factor: 1000000 },
            "rad/s": { name: "Radianes por seg (rad/s)", factor: 1/6.283185 }
        }
    }
};

const siPrefixes = [
    { prefix: "Yotta", symbol: "Y", factor: "10²⁴", example: "1 YW = 1,000,000,000,000,000,000,000,000 W" },
    { prefix: "Zetta", symbol: "Z", factor: "10²¹", example: "1 ZV = 1,000,000,000,000,000,000,000 V" },
    { prefix: "Exa", symbol: "E", factor: "10¹⁸", example: "1 EJ = 1,000,000,000,000,000,000 J" },
    { prefix: "Peta", symbol: "P", factor: "10¹⁵", example: "1 PΩ = 1,000,000,000,000,000 Ω" },
    { prefix: "Tera", symbol: "T", factor: "10¹²", example: "1 TW = 1,000,000,000,000 W" },
    { prefix: "Giga", symbol: "G", factor: "10⁹", example: "1 GHz = 1,000,000,000 Hz" },
    { prefix: "Mega", symbol: "M", factor: "10⁶", example: "1 MW = 1,000,000 W" },
    { prefix: "Kilo", symbol: "k", factor: "10³", example: "1 kV = 1,000 V" },
    { prefix: "Hecto", symbol: "h", factor: "10²", example: "1 hPa = 100 Pa" },
    { prefix: "Deca", symbol: "da", factor: "10¹", example: "1 dam = 10 m" },
    { prefix: "(base)", symbol: "-", factor: "10⁰", example: "1 m, 1 V, 1 W" },
    { prefix: "Deci", symbol: "d", factor: "10⁻¹", example: "1 dm = 0.1 m" },
    { prefix: "Centi", symbol: "c", factor: "10⁻²", example: "1 cm = 0.01 m" },
    { prefix: "Milli", symbol: "m", factor: "10⁻³", example: "1 mA = 0.001 A" },
    { prefix: "Micro", symbol: "µ", factor: "10⁻⁶", example: "1 µF = 0.000001 F" },
    { prefix: "Nano", symbol: "n", factor: "10⁻⁹", example: "1 ns = 0.000000001 s" },
    { prefix: "Pico", symbol: "p", factor: "10⁻¹²", example: "1 pF = 0.000000000001 F" },
    { prefix: "Femto", symbol: "f", factor: "10⁻¹⁵", example: "1 fA = 0.000000000000001 A" },
    { prefix: "Atto", symbol: "a", factor: "10⁻¹⁸", example: "1 aJ = 10⁻¹⁸ J" },
    { prefix: "Zepto", symbol: "z", factor: "10⁻²¹", example: "1 zC = 10⁻²¹ C" },
    { prefix: "Yocto", symbol: "y", factor: "10⁻²⁴", example: "1 yg = 10⁻²⁴ g" }
];

let currentCategory = 'potencia';

function initConverter() {
    const categoryGrid = document.getElementById('converter-categories');
    const fromUnitSelect = document.getElementById('from-unit');
    const toUnitSelect = document.getElementById('to-unit');
    const fromInput = document.getElementById('from-value');
    const toInput = document.getElementById('to-value');
    const swapBtn = document.getElementById('swap-units');
    const copyBtn = document.getElementById('copy-result');
    const siTableBody = document.getElementById('si-table-body');

    // Populate Categories
    Object.keys(unitData).forEach(catKey => {
        const cat = unitData[catKey];
        const btn = document.createElement('div');
        btn.className = `category-card ${catKey === currentCategory ? 'active' : ''}`;
        btn.innerHTML = `
            <i class="fa-solid ${cat.icon}"></i>
            <span>${cat.title}</span>
        `;
        btn.onclick = () => switchCategory(catKey);
        categoryGrid.appendChild(btn);
    });

    // Populate SI Table
    siPrefixes.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.prefix}</strong></td>
            <td><span class="prefix-symbol">${item.symbol}</span></td>
            <td>${item.factor}</td>
            <td class="prefix-example">${item.example}</td>
        `;
        siTableBody.appendChild(row);
    });

    // Initial Units
    updateUnits();

    // Event Listeners
    fromInput.oninput = performConversion;
    fromUnitSelect.onchange = performConversion;
    toUnitSelect.onchange = performConversion;
    
    swapBtn.onclick = () => {
        const temp = fromUnitSelect.value;
        fromUnitSelect.value = toUnitSelect.value;
        toUnitSelect.value = temp;
        performConversion();
    };

    copyBtn.onclick = () => {
        const text = `${fromInput.value} ${fromUnitSelect.value} = ${toInput.value} ${toUnitSelect.value}`;
        navigator.clipboard.writeText(text).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => copyBtn.innerHTML = originalIcon, 2000);
        });
    };
}

function switchCategory(catKey) {
    currentCategory = catKey;
    
    // Update active class
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
        if (card.innerText.includes(unitData[catKey].title)) card.classList.add('active');
    });

    updateUnits();
    performConversion();
}

function updateUnits() {
    const fromUnitSelect = document.getElementById('from-unit');
    const toUnitSelect = document.getElementById('to-unit');
    
    fromUnitSelect.innerHTML = '';
    toUnitSelect.innerHTML = '';

    const units = unitData[currentCategory].units;
    Object.keys(units).forEach(unitKey => {
        const opt1 = new Option(units[unitKey].name, unitKey);
        const opt2 = new Option(units[unitKey].name, unitKey);
        fromUnitSelect.add(opt1);
        toUnitSelect.add(opt2);
    });

    // Default selection
    if (fromUnitSelect.options.length > 1) {
        toUnitSelect.selectedIndex = 1;
    }
}

function performConversion() {
    const fromValue = parseFloat(document.getElementById('from-value').value);
    const fromUnit = document.getElementById('from-unit').value;
    const toUnit = document.getElementById('to-unit').value;
    const toInput = document.getElementById('to-value');

    if (isNaN(fromValue)) {
        toInput.value = '';
        return;
    }

    const units = unitData[currentCategory].units;
    const valueInBase = fromValue * units[fromUnit].factor;
    const convertedValue = valueInBase / units[toUnit].factor;

    // Precision handling
    const precision = 6;
    let result = convertedValue;
    if (convertedValue.toString().includes('e')) {
        result = convertedValue.toExponential(4);
    } else {
        result = parseFloat(convertedValue.toFixed(precision));
    }

    toInput.value = result;
}

document.addEventListener('DOMContentLoaded', initConverter);
