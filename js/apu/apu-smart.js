/**
 * APU Smart Logic (ElectrIA Specialist)
 * Contains knowledge base of yields and standard crews.
 */

const APU_TEMPLATES = [
    // --- CONDUITS (E511 / E512) ---
    {
        code: 'E511.111.011',
        keywords: ['tuberia emt 1/2', 'emt 1/2', 'conduit 1/2'],
        description: 'Instalación de Tubería EMT 1/2" con accesorios y soportes (E511)',
        unit: 'm',
        yield: 50.00, 
        materials: [
            { desc: 'Tubería EMT 1/2" (3.05m)', unit: 'pza', qty: 0.33, price: 4.50, waste: 5 },
            { desc: 'Unión EMT 1/2"', unit: 'pza', qty: 0.34, price: 0.60, waste: 0 },
            { desc: 'Abrazadera EMT 1/2"', unit: 'pza', qty: 0.67, price: 0.25, waste: 2 },
            { desc: 'Ramplug y Tornillo', unit: 'pza', qty: 0.70, price: 0.15, waste: 10 }
        ],
        equipment: [{ desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 }],
        labor: [{ role: 'Electricista', count: 1.00 }, { role: 'Ayudante', count: 1.00 }]
    },
    {
        code: 'E511.111.012',
        keywords: ['tuberia emt 3/4', 'emt 3/4', 'conduit 3/4'],
        description: 'Instalación de Tubería EMT 3/4" con accesorios y soportes (E511)',
        unit: 'm',
        yield: 45.00, 
        materials: [
            { desc: 'Tubería EMT 3/4" (3.05m)', unit: 'pza', qty: 0.33, price: 6.20, waste: 5 },
            { desc: 'Unión EMT 3/4"', unit: 'pza', qty: 0.34, price: 0.90, waste: 0 },
            { desc: 'Abrazadera EMT 3/4"', unit: 'pza', qty: 0.67, price: 0.30, waste: 2 },
            { desc: 'Ramplug y Tornillo', unit: 'pza', qty: 0.70, price: 0.15, waste: 10 }
        ],
        equipment: [{ desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 }],
        labor: [{ role: 'Electricista', count: 1.00 }, { role: 'Ayudante', count: 1.00 }]
    },

    // --- CABLING (E521) ---
    {
        code: 'E521.111.001',
        keywords: ['cable 12', 'conductor 12', 'thhn 12'],
        description: 'Cableado de Conductor Cu THHN #12 AWG en Tubería (E521)',
        unit: 'm',
        yield: 180.00,
        materials: [{ desc: 'Cable Cu THHN #12 AWG', unit: 'm', qty: 1.00, price: 0.65, waste: 5 }],
        equipment: [{ desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 }],
        labor: [{ role: 'Electricista', count: 1.00 }, { role: 'Ayudante', count: 2.00 }]
    },
    {
        code: 'E521.111.100',
        keywords: ['cable 4/0', 'thhn 4/0', 'alimentador'],
        description: 'Tendido de Cable Cu THHN 4/0 AWG para Alimentadores (E521)',
        unit: 'm',
        yield: 80.00,
        materials: [
            { desc: 'Cable Cu THHN 4/0 AWG', unit: 'm', qty: 1.00, price: 16.80, waste: 3 },
            { desc: 'Lubricante para Cable (CGE)', unit: 'kg', qty: 0.02, price: 15.00, waste: 0 }
        ],
        equipment: [
            { desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 },
            { desc: 'Doblador de Tubo Hidráulico', qty: 1.00, price: 20.00, factor: 0.20 }
        ],
        labor: [{ role: 'Capataz', count: 0.20 }, { role: 'Electricista', count: 1.00 }, { role: 'Ayudante', count: 3.00 }]
    },

    // --- POINTS (E541) ---
    {
        code: 'E541.111.111',
        keywords: ['salida tomacorriente', 'punto toma', '110v'],
        description: 'Suministro e Inst. de Salida de Tomacorriente Doble 120V con Tubería EMT 1/2" (E541)',
        unit: 'pto',
        yield: 8.00,
        materials: [
            { desc: 'Tubería EMT 1/2" (3.05m)', unit: 'pza', qty: 0.40, price: 4.50, waste: 5 },
            { desc: 'Conector EMT 1/2"', unit: 'pza', qty: 2.00, price: 0.80, waste: 0 },
            { desc: 'Cajetín Metálico 2"x4" (E531)', unit: 'pza', qty: 1.00, price: 1.10, waste: 0 },
            { desc: 'Cable Cu THHN #12 AWG', unit: 'm', qty: 12.00, price: 0.65, waste: 8 },
            { desc: 'Tomacorriente Doble 120V', unit: 'pza', qty: 1.00, price: 3.50, waste: 0 }
        ],
        equipment: [{ desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 }],
        labor: [{ role: 'Electricista', count: 1.00 }, { role: 'Ayudante', count: 1.00 }]
    },
    {
        code: 'E541.111.101',
        keywords: ['salida luz', 'punto iluminacion', 'punto lampara'],
        description: 'Suministro e Inst. de Salida para Alumbrado con Tubería EMT 1/2" e Interruptor (E541)',
        unit: 'pto',
        yield: 10.00,
        materials: [
            { desc: 'Tubería EMT 1/2" (3.05m)', unit: 'pza', qty: 0.40, price: 4.50, waste: 5 },
            { desc: 'Cajetín Octogonal Metálico', unit: 'pza', qty: 1.00, price: 1.40, waste: 0 },
            { desc: 'Cable Cu THHN #12 AWG', unit: 'm', qty: 10.00, price: 0.65, waste: 8 },
            { desc: 'Interruptor Sencillo 120V', unit: 'pza', qty: 1.00, price: 2.50, waste: 0 }
        ],
        equipment: [
            { desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 },
            { desc: 'Andamio Tubular (Cuerpo completo)', qty: 1.00, price: 2.50, factor: 1.0 }
        ],
        labor: [{ role: 'Electricista', count: 1.00 }, { role: 'Ayudante', count: 1.00 }]
    },

    // --- BOXES (E531) ---
    {
        code: 'E531.111.001',
        keywords: ['caja de paso 10x10', 'caja metalica'],
        description: 'Instalación de Caja de Paso Metálica 10x10cm (E531)',
        unit: 'pza',
        yield: 15.00,
        materials: [
            { desc: 'Caja de Paso 10x10cm (E531)', unit: 'pza', qty: 1.00, price: 4.50, waste: 0 },
            { desc: 'Ramplug y Tornillo', unit: 'pza', qty: 4.00, price: 0.15, waste: 0 }
        ],
        equipment: [{ desc: 'Taladro Percutor / Rotomartillo', qty: 1.00, price: 15.00, factor: 0.05 }],
        labor: [{ role: 'Electricista', count: 1.00 }, { role: 'Ayudante', count: 0.50 }]
    },

    // --- PANELS & BREAKERS (E551 / E561) ---
    {
        code: 'E551.111.001',
        keywords: ['tablero 12 ctos', 'embutir'],
        description: 'Instalación de Tablero Eléctrico Monofásico de 12 Circuitos Embutido (E551)',
        unit: 'pza',
        yield: 4.00,
        materials: [
            { desc: 'Tablero 8-12 Ctos Monofásico Embutir', unit: 'pza', qty: 1.00, price: 45.00, waste: 0 },
            { desc: 'Terminales de Ojo/Presión', unit: 'pza', qty: 4.00, price: 0.45, waste: 0 }
        ],
        equipment: [{ desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 }],
        labor: [{ role: 'Electricista', count: 1.00 }, { role: 'Ayudante', count: 1.00 }]
    },
    {
        code: 'E551.112.003',
        keywords: ['tablero 42 ctos', 'trifasico'],
        description: 'Instalación de Tablero Eléctrico Trifásico de 42 Circuitos Superficie (E551)',
        unit: 'pza',
        yield: 1.00,
        materials: [
            { desc: 'Tablero 42 Ctos Trifásico NEMA 1', unit: 'pza', qty: 1.00, price: 280.00, waste: 0 },
            { desc: 'Terminales Bornes Alta Potencia', unit: 'pza', qty: 4.00, price: 5.50, waste: 0 }
        ],
        equipment: [{ desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 }],
        labor: [{ role: 'Capataz', count: 0.20 }, { role: 'Electricista', count: 1.00 }, { role: 'Ayudante', count: 1.00 }]
    },
    {
        code: 'E561.111.001',
        keywords: ['breaker 1p', 'termomagnetico 1p'],
        description: 'Suministro e Inst. de Interruptor Termomagnético 1P (E561)',
        unit: 'pza',
        yield: 30.00,
        materials: [{ desc: 'Breaker 1P 15A/20A Enchufable', unit: 'pza', qty: 1.00, price: 4.50, waste: 0 }],
        equipment: [{ desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 }],
        labor: [{ role: 'Electricista', count: 1.00 }]
    },

    // --- LIGHTING (E371 / E571) ---
    {
        code: 'E371.111.101',
        keywords: ['luminaria led 60x60', 'panel led'],
        description: 'Instalación de Luminaria LED Panel 60x60 Embutida en Techo (E371)',
        unit: 'pza',
        yield: 8.00,
        materials: [
            { desc: 'Luminaria LED Panel 60x60 40W', unit: 'pza', qty: 1.00, price: 25.00, waste: 0 },
            { desc: 'Conector EMT 1/2"', unit: 'pza', qty: 1.00, price: 0.80, waste: 0 }
        ],
        equipment: [{ desc: 'Andamio Tubular (Cuerpo completo)', qty: 1.00, price: 2.50, factor: 1.00 }],
        labor: [{ role: 'Electricista', count: 1.00 }, { role: 'Ayudante', count: 1.00 }]
    },

    // --- GROUNDING (E581) ---
    {
        code: 'E581.111.101',
        keywords: ['barra tierra', 'copperweld', 'electrodo'],
        description: 'Hincado de Electrodo de Tierra (Barra Copperweld 5/8" x 2.4m) (E581)',
        unit: 'pza',
        yield: 4.00,
        materials: [
            { desc: 'Barra Tierra Copperweld 5/8" x 2.4m', unit: 'pza', qty: 1.00, price: 18.00, waste: 0 },
            { desc: 'Conector de Bronce para Barra', unit: 'pza', qty: 1.00, price: 2.50, waste: 0 },
            { desc: 'Compuesto Intensificador de Tierra', unit: 'saco', qty: 0.50, price: 12.00, waste: 0 }
        ],
        equipment: [
            { desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 },
            { desc: 'Martillo de Mecate / Mandarria', qty: 1.00, price: 10.00, factor: 0.50 }
        ],
        labor: [{ role: 'Electricista', count: 1.00 }, { role: 'Ayudante', count: 1.00 }]
    }
];

// Make templates global
window.APU_TEMPLATES = APU_TEMPLATES;

class APUSmart {
    constructor() {
        this.inputElement = document.getElementById('partida-desc');
        this.suggestionsBox = document.getElementById('smart-suggestions');
        
        if(this.inputElement) {
            this.inputElement.addEventListener('input', (e) => this.handleInput(e));
        }
    }

    handleInput(e) {
        const value = e.target.value.toLowerCase();
        if (value.length < 3) {
            this.suggestionsBox.style.display = 'none';
            return;
        }

        const matches = APU_TEMPLATES.filter(t => 
            t.keywords.some(k => value.includes(k)) || 
            t.description.toLowerCase().includes(value) ||
            t.code.toLowerCase().includes(value)
        );

        this.renderSuggestions(matches);
    }

    renderSuggestions(matches) {
        if (matches.length === 0) {
            this.suggestionsBox.style.display = 'none';
            return;
        }

        this.suggestionsBox.innerHTML = '';
        matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.style.padding = '10px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid #eee';
            div.style.background = 'white';
            div.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles" style="color: gold;"></i> <b>${match.code}</b> - ${match.description} <br><small style="color:#666">Rend: ${match.yield} ${match.unit}/dia</small>`;
            
            div.onmouseover = () => { div.style.background = '#f8f9fa'; };
            div.onmouseout = () => { div.style.background = 'white'; };
            
            div.onclick = () => {
                console.log("Template selected:", match.code);
                this.applyTemplate(match);
            };
            this.suggestionsBox.appendChild(div);
        });

        this.suggestionsBox.style.display = 'block';
    }

    applyTemplate(template) {
        try {
            if(document.getElementById('partida-desc')) document.getElementById('partida-desc').value = template.description;
            if(document.getElementById('partida-unidad')) document.getElementById('partida-unidad').value = template.unit;
            if(document.getElementById('partida-rendimiento')) document.getElementById('partida-rendimiento').value = template.yield;
            
            const codeInput = document.getElementById('partida-codigo');
            if (codeInput && template.code) {
                codeInput.value = template.code;
            }
            
            if (window.apuUI) {
                window.apuUI.loadTemplate(template);
            } else if (typeof apuUI !== 'undefined') {
                apuUI.loadTemplate(template);
            } else {
                console.error("apuUI not found!");
            }

            this.suggestionsBox.style.display = 'none';
        } catch (e) {
            console.error("Error applying template:", e);
        }
    }
}

window.APUSmart = APUSmart;

document.addEventListener('DOMContentLoaded', () => {
    window.apuSmart = new APUSmart();
    console.log("APUSmart initialized");
});
