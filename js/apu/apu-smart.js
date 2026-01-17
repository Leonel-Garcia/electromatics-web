/**
 * APU Smart Logic (ElectrIA Specialist)
 * Contains knowledge base of yields and standard crews.
 */

const APU_TEMPLATES = [
    {
        code: 'E541.111.111',
        keywords: ['tomacorriente', 'enchufe', 'salida 110v', 'e541'],
        description: 'Suministro e Inst. de Salida de Tomacorriente Doble con Tubería EMT 1/2" (E541)',
        unit: 'pto',
        yield: 8.00, // 8 pts/day
        materials: [
            { desc: 'Tubería EMT 1/2" (3.05m)', unit: 'pza', qty: 0.30, price: 4.50, waste: 5 },
            { desc: 'Conector EMT 1/2"', unit: 'pza', qty: 2.00, price: 0.80, waste: 0 },
            { desc: 'Cajetín Metálico 2"x4" (E531)', unit: 'pza', qty: 1.00, price: 1.10, waste: 0 },
            { desc: 'Cable Cu THHN #12 AWG', unit: 'm', qty: 12.00, price: 0.65, waste: 5 },
            { desc: 'Tomacorriente Doble 120V', unit: 'pza', qty: 1.00, price: 3.50, waste: 0 }
        ],
        equipment: [
            { desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 }
        ],
        labor: [
            { role: 'Electricista', count: 1.00 },
            { role: 'Ayudante', count: 1.00 }
        ]
    },
    {
        code: 'E541.111.101',
        keywords: ['luz', 'lampara', 'iluminacion', 'alumbrado', 'e541'],
        description: 'Suministro e Inst. de Salida para Alumbrado en Techo/Pared con Tubería EMT 1/2" (E541)',
        unit: 'pto',
        yield: 10.00,
        materials: [
            { desc: 'Tubería EMT 1/2" (3.05m)', unit: 'pza', qty: 0.30, price: 4.50, waste: 5 },
            { desc: 'Cajetín Octogonal Metálico', unit: 'pza', qty: 1.00, price: 1.40, waste: 0 },
            { desc: 'Cable Cu THHN #12 AWG', unit: 'm', qty: 10.00, price: 0.65, waste: 5 },
            { desc: 'Interruptor Sencillo 120V', unit: 'pza', qty: 1.00, price: 2.50, waste: 0 }
        ],
        equipment: [
            { desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 },
            { desc: 'Andamio Tubular (Cuerpo completo)', qty: 1.00, price: 2.50, factor: 1.0 }
        ],
        labor: [
            { role: 'Electricista', count: 1.00 },
            { role: 'Ayudante', count: 1.00 }
        ]
    },
    {
        code: 'E511.111.011',
        keywords: ['tuberia 3/4', 'emt 3/4', 'ducto', 'e511'],
        description: 'Instalación de Tubería EMT 3/4" incluyendo accesorios y soportes (E511)',
        unit: 'm',
        yield: 45.00, 
        materials: [
            { desc: 'Tubería EMT 3/4" (3.05m)', unit: 'pza', qty: 0.34, price: 6.20, waste: 5 },
            { desc: 'Abrazadera EMT 3/4"', unit: 'pza', qty: 1.00, price: 0.30, waste: 2 },
            { desc: 'Conector EMT 3/4"', unit: 'pza', qty: 0.20, price: 1.20, waste: 0 }
        ],
        equipment: [
            { desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 }
        ],
        labor: [
            { role: 'Electricista', count: 1.00 },
            { role: 'Ayudante', count: 1.00 }
        ]
    },
    {
        code: 'E531.111.001',
        keywords: ['caja de paso', 'caja metalica', 'e531'],
        description: 'Suministro e Inst. de Caja de Paso Metálica 10x10cm (E531)',
        unit: 'pza',
        yield: 12.00,
        materials: [
            { desc: 'Caja de Paso 10x10cm (E531)', unit: 'pza', qty: 1.00, price: 4.50, waste: 0 },
            { desc: 'Ramplug y Tornillo', unit: 'pza', qty: 4.00, price: 0.15, waste: 10 }
        ],
        equipment: [
            { desc: 'Taladro Percutor / Rotomartillo', qty: 1.00, price: 15.00, factor: 0.05 }
        ],
        labor: [
            { role: 'Electricista', count: 1.00 },
            { role: 'Ayudante', count: 1.00 }
        ]
    },
    {
        code: 'E521.111.001',
        keywords: ['cable 12', 'conductor 12', 'thhn 12', 'e521'],
        description: 'Tendido de Conductor Cu THHN calibre 12 AWG (E521)',
        unit: 'm',
        yield: 180.00,
        materials: [
            { desc: 'Cable Cu THHN #12 AWG', unit: 'm', qty: 1.00, price: 0.65, waste: 5 }
        ],
        equipment: [
            { desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 }
        ],
        labor: [
            { role: 'Electricista', count: 1.00 },
            { role: 'Ayudante', count: 1.00 }
        ]
    },
    {
        code: 'E551.111.001',
        keywords: ['tablero', 'centro carga', 'e551'],
        description: 'Instalación de Tablero Eléctrico Monofásico de 8 a 12 Circuitos (E551)',
        unit: 'pza',
        yield: 3.00,
        materials: [
            { desc: 'Tablero 8-12 Ctos Monofásico Embutir', unit: 'pza', qty: 1.00, price: 45.00, waste: 0 },
            { desc: 'Ramplug y Tornillo', unit: 'pza', qty: 4.00, price: 0.15, waste: 0 }
        ],
        equipment: [
            { desc: 'Taladro Percutor / Rotomartillo', qty: 1.00, price: 15.00, factor: 0.10 }
        ],
        labor: [
            { role: 'Electricista', count: 1.00 },
            { role: 'Ayudante', count: 1.00 }
        ]
    },
    {
        code: 'E561.111.001',
        keywords: ['breaker', 'interruptor termomagnetico', 'e561'],
        description: 'Suministro e Inst. de Interruptor Termomagnético 1P 15A/20A (E561)',
        unit: 'pza',
        yield: 24.00,
        materials: [
            { desc: 'Breaker 1P 15A/20A Enchufable', unit: 'pza', qty: 1.00, price: 4.50, waste: 0 }
        ],
        equipment: [
            { desc: 'Herramientas Menores (% M.O.)', qty: 1.00, price: 50.00, factor: 0.05 }
        ],
        labor: [
            { role: 'Electricista', count: 1.00 }
        ]
    },
    {
        code: 'E371.111.101',
        keywords: ['led', 'panel led', 'luminaria', 'e371'],
        description: 'Suministro e Inst. de Luminaria LED Panel 60x60 40W (E371)',
        unit: 'pza',
        yield: 6.00,
        materials: [
            { desc: 'Luminaria LED Panel 60x60 40W', unit: 'pza', qty: 1.00, price: 25.00, waste: 0 },
            { desc: 'Conector EMT 1/2"', unit: 'pza', qty: 1.00, price: 0.80, waste: 0 }
        ],
        equipment: [
            { desc: 'Andamio Tubular (Cuerpo completo)', qty: 1.00, price: 2.50, factor: 1.0 }
        ],
        labor: [
            { role: 'Electricista', count: 1.00 },
            { role: 'Ayudante', count: 1.00 }
        ]
    }
];

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
            t.description.toLowerCase().includes(value)
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
            div.style.padding = '8px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid #eee';
            div.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles" style="color: gold;"></i> <b>${match.code}</b> - ${match.description} (Rend: ${match.yield})`;
            
            div.onmouseover = () => { div.style.background = '#f0f0f0'; };
            div.onmouseout = () => { div.style.background = 'white'; };
            
            div.onclick = () => this.applyTemplate(match);
            this.suggestionsBox.appendChild(div);
        });

        this.suggestionsBox.style.display = 'block';
    }

    applyTemplate(template) {
        document.getElementById('partida-desc').value = template.description;
        document.getElementById('partida-unidad').value = template.unit;
        document.getElementById('partida-rendimiento').value = template.yield;
        
        const codeInput = document.getElementById('partida-codigo');
        if (codeInput && template.code) {
            codeInput.value = template.code;
        }
        
        if (window.apuUI) {
            window.apuUI.loadTemplate(template);
        }

        this.suggestionsBox.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.apuSmart = new APUSmart();
});
