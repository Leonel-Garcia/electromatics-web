export class SchematicManager {
    constructor() {
        this.viewer = document.getElementById('schematic-viewer');
        this.content = document.getElementById('schematic-content');
        this.title = document.getElementById('schematic-title');
        this.description = document.getElementById('schematic-description');
        this.closeBtn = document.getElementById('close-schematic');
        this.header = this.viewer.querySelector('.schematic-header');
        
        if (this.closeBtn) {
            this.closeBtn.onclick = () => this.hide();
        }

        this.initDragging();
    }

    initDragging() {
        let isDragging = false;
        let offset = { x: 0, y: 0 };

        this.header.onmousedown = (e) => {
            isDragging = true;
            offset.x = e.clientX - this.viewer.offsetLeft;
            offset.y = e.clientY - this.viewer.offsetTop;
            this.header.style.cursor = 'grabbing';
            e.preventDefault();
        };

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const x = e.clientX - offset.x;
            const y = e.clientY - offset.y;
            this.viewer.style.left = `${x}px`;
            this.viewer.style.top = `${y}px`;
            this.viewer.style.bottom = 'auto'; // Disable bottom constraint
            this.viewer.style.right = 'auto';  // Disable right constraint
            this.viewer.style.transform = 'none'; // Remove any centering transform
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            if (this.header) this.header.style.cursor = 'grab';
        });
    }

    show(component) {
        if (!this.viewer || !this.content) return;

        const name = component.metadata.name;
        const data = this.getSchematicData(name);
        
        if (data) {
            this.title.innerHTML = `📋 Datasheet: ${data.title}`;
            this.description.innerHTML = `<strong>Descripción:</strong><br>${data.desc}`;
            
            if (data.image) {
                this.content.innerHTML = `<img src="${data.image}" style="max-width:100%; height:auto; border-radius:4px; border:1px solid #333; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">`;
            } else {
                this.content.innerHTML = `<div style="padding: 20px; color: #888; text-align: center;">Imagen del catálogo no disponible para este componente.</div>`;
            }
            
            this.viewer.style.display = 'flex';
        } else {
            this.hide();
        }
    }

    hide() {
        if (this.viewer) this.viewer.style.display = 'none';
    }

    getSchematicData(name) {
        const specs = {
            '7400': {
                title: 'SN7400 Quad 2-Input NAND Gate',
                desc: 'Diagrama de pines estándar (DIP-14). Contiene 4 compuertas NAND independientes de 2 entradas. Alimentación: Pin 14 (VCC), Pin 7 (GND). Salida Y = NOT (A • B).',
                image: 'simutron/assets/datasheets/7400.png'
            },
            '7408': {
                title: 'SN7408 Quad 2-Input AND Gate',
                desc: 'Diagrama de pines estándar (DIP-14). Contiene 4 compuertas AND independientes de 2 entradas. Alimentación: Pin 14 (VCC), Pin 7 (GND). Salida Y = A • B.',
                image: 'simutron/assets/datasheets/7408.png'
            },
            '7404': {
                title: 'SN7404 Hex Inverter',
                desc: 'Diagrama de pines estándar (DIP-14). Contiene 6 inversores independientes. Alimentación: Pin 14 (VCC), Pin 7 (GND). Salida Y = NOT A.',
                image: 'simutron/assets/datasheets/7404.png'
            },
            '7432': {
                title: 'SN7432 Quad 2-Input OR Gate',
                desc: 'Diagrama de pines estándar (DIP-14). Contiene 4 compuertas OR independientes de 2 entradas. Alimentación: Pin 14 (VCC), Pin 7 (GND). Salida Y = A + B.',
                image: 'simutron/assets/datasheets/7432.png'
            },
            '7490': {
                title: 'SN7490 Decade Counter (Asíncrono)',
                desc: 'Contador de décadas (DIV-10). Configuración estándar: Conectar Salida estandar QA (Pin 12) a Entrada B (Pin 1) para conteo BCD 0-9. Alimentación: Pin 5 (VCC), Pin 10 (GND). Reset 0: Pines 2 y 3 en ALTO.',
                image: 'simutron/assets/datasheets/7490.png'
            },
            '7447': {
                title: 'SN7447 BCD to 7-Segment Decoder',
                desc: 'Decodificador BCD a 7 Segmentos (Salidas Activas en BAJO, Open Collector). Diseñado para displays de Ánodo Común. Alimentación: Pin 16 (VCC), Pin 8 (GND).',
                image: 'simutron/assets/datasheets/7447.png'
            },
            'LM741': {
                title: 'uA741 Operational Amplifier',
                desc: 'Amplificador Operacional de propósito general. Pines clave: 2 (In-), 3 (In+), 6 (Salida). Alimentación simétrica: 7 (V+), 4 (V-).',
                image: 'simutron/assets/datasheets/741.png'
            },
            'LM555': {
                title: 'NE555 Precision Timer',
                desc: 'Temporizador de precisión. Modos: Monoestable y Astable. Alimentación: Pin 8 (VCC), Pin 1 (GND). Salida en Pin 3. Trigger < 1/3 VCC activa la salida.',
                image: 'simutron/assets/datasheets/555.png'
            },
            '7-Segment': {
                title: 'Display de 7 Segmentos (Ánodo Común)',
                desc: 'Configuración de pines estándar. Pines 3 y 8 son Ánodo Común (Conectar a VCC). Los segmentos (a-g) se encienden al ponerlos a tierra (Lógica Negativa, ideal para 7447).',
                image: 'simutron/assets/datasheets/7segment.png'
            },
            '74283': {
                title: 'SN74LS283 4-Bit Binary Full Adder',
                desc: 'Sumador completo de 4 bits con acarreo rápido. Suma dos palabras binarias (A y B) más un acarreo de entrada (C0). Salida Sigma 1-4. Alimentación: Pin 16 (VCC), Pin 8 (GND).',
                image: 'simutron/assets/datasheets/74283.png'
            }
        };
        return specs[name];
    }
}
