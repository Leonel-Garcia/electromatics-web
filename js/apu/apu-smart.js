/**
 * APU Smart Logic (ElectrIA Specialist)
 * Contains knowledge base of yields and standard crews.
 */

const APU_TEMPLATES = [
    {
        keywords: ['tomacorriente', 'enchufe', 'salida 110v'],
        description: 'Suministro e Inst. de Salida de Tomacorriente Doble con Tubería EMT 1/2"',
        unit: 'pto',
        yield: 8.00, // 8 pts/day
        materials: [
            { desc: 'Tubería EMT 1/2"', unit: 'pza', qty: 0.30, price: 4.50, waste: 5 },
            { desc: 'Conector EMT 1/2"', unit: 'pza', qty: 2.00, price: 0.80, waste: 0 },
            { desc: 'Cajetín Metálico 2x4', unit: 'pza', qty: 1.00, price: 1.10, waste: 0 },
            { desc: 'Cable THHN #12 (F+N+T)', unit: 'm', qty: 12.00, price: 0.65, waste: 5 },
            { desc: 'Tomacorriente Doble 110V', unit: 'pza', qty: 1.00, price: 3.50, waste: 0 }
        ],
        equipment: [
            { desc: 'Herramientas Menores', qty: 1.00, price: 50.00, factor: 0.05 }, // 5% de MO value approximation or rent
            { desc: 'Taladro Percutor', qty: 0.50, price: 150.00, factor: 0.01 } // Dep
        ],
        labor: [
            { role: 'Electricista', count: 1.00 },
            { role: 'Ayudante', count: 1.00 }
        ]
    },
    {
        keywords: ['tuberia 3/4', 'emt 3/4', 'ducto'],
        description: 'Suministro e Inst. de Tubería EMT 3/4" (Inc. Accesorios y Soportes)',
        unit: 'm',
        yield: 45.00, // m/day
        materials: [
            { desc: 'Tubería EMT 3/4"', unit: 'pza', qty: 0.34, price: 6.20, waste: 5 }, // 3m pipe -> 1/3 = 0.33 + waste
            { desc: 'Abrazadera EMT 3/4"', unit: 'pza', qty: 1.00, price: 0.30, waste: 2 },
            { desc: 'Tornillo Ramplug', unit: 'pza', qty: 1.00, price: 0.10, waste: 10 }
        ],
        equipment: [
            { desc: 'Andamio Tubular (2 Cuerpos)', qty: 1.00, price: 120.00, factor: 0.02 } // Rent
        ],
        labor: [
            { role: 'Electricista', count: 1.00 },
            { role: 'Ayudante', count: 1.00 }
        ]
    },
    {
        keywords: ['cable 350', 'mcm 350', 'alimentador'],
        description: 'Tendido de Cable de Cobre THHN/THWN calibre 350 MCM',
        unit: 'm',
        yield: 120.00, // m/day
        materials: [
            { desc: 'Cable Cu 350 MCM', unit: 'm', qty: 1.00, price: 18.50, waste: 3 },
            { desc: 'Lubricante para Cable', unit: 'gle', qty: 0.01, price: 45.00, waste: 0 }
        ],
        equipment: [
            { desc: 'Winche Eléctrico', qty: 1.00, price: 2500.00, factor: 0.005 },
            { desc: 'Camión Grúa', qty: 0.20, price: 15000.00, factor: 0.002 } // Occasional
        ],
        labor: [
            { role: 'Capataz', count: 1.00 },
            { role: 'Electricista', count: 2.00 },
            { role: 'Ayudante', count: 4.00 }
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
            div.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles" style="color: gold;"></i> <b>${match.description}</b> (Rend: ${match.yield})`;
            
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
        
        if (window.apuUI) {
            window.apuUI.loadTemplate(template);
        }

        this.suggestionsBox.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.apuSmart = new APUSmart();
});
