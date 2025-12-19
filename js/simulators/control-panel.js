/**
 * ELECTROMATICS - Simulador de Tableros de Control (Constructor Version 2.0)
 * Enfoque: Diseño Vertical (Breaker -> Contactor -> Térmico -> Motor)
 */

const canvas = document.getElementById('simulatorCanvas');
const ctx = canvas.getContext('2d');

// Estado Global (Exuesto para debug)
window.assets = {}; 
window.components = []; 
window.wires = []; 
window.isSimulating = false;
let simulationTime = 0;

// Alias locales para compatibilidad con código existente
let assets = window.assets;
let components = window.components;
let wires = window.wires;
let isSimulating = window.isSimulating;

// Configuración de Assets
const ASSET_PATHS = {
    'breaker': 'img/simulators/control-panel/breaker.png',
    'contactor': 'img/simulators/control-panel/contactor.png',
    'thermal-relay': 'img/simulators/control-panel/thermal-relay.png',
    'motor': 'img/simulators/control-panel/motor.png',
    'start-btn': 'img/simulators/control-panel/pushbutton-green.png',
    'stop-btn': 'img/simulators/control-panel/pushbutton-red.png',
    'pilot-green': 'img/simulators/control-panel/pilot-green.png',
    'pilot-red': 'img/simulators/control-panel/pilot-red.png'
};

// ================= CLASES =================

class Component {
    constructor(type, x, y, width, height) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.terminals = {}; 
        this.state = {}; 
        this.dragging = false;
    }

    getTerminal(id) {
        if (!this.terminals[id]) return null;
        return { 
            x: this.x + this.terminals[id].x, 
            y: this.y + this.terminals[id].y,
            id: id,
            component: this
        };
    }

    // Hit test para terminales con area expandida para facilitar click
    getHoveredTerminal(mx, my) {
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            if (Math.hypot(mx - tx, my - ty) < 12) return this.getTerminal(id);
        }
        return null;
    }

    isMouseOver(mx, my) {
        return mx > this.x && mx < this.x + this.width &&
               my > this.y && my < this.y + this.height;
    }

    draw(ctx) {
        // 1. Imagen
        if (assets[this.type]) {
            // Sombra para dar profundidad
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets[this.type], this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        } else {
            // Fallback
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#0f172a';
            ctx.fillText(this.type, this.x+10, this.y+20);
        }

        // 2. Terminales
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            // Halo si el mouse está cerca (lo hace en el loop principal, aqui solo dibujo base)
            ctx.beginPath();
            ctx.arc(tx, ty, 5, 0, Math.PI*2);
            ctx.fillStyle = '#fbbf24'; // Oro
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Etiquetas de terminales (L1, T1...)
            if (t.label) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px Inter, sans-serif';
                ctx.textAlign = 'center';
                // Posicionar etiqueta según ubicación
                const ly = ty < this.y + 20 ? ty - 10 : ty + 18; 
                ctx.fillText(t.label, tx, ly);
            }
        }
    }
}

class Breaker extends Component {
    constructor(x, y) {
        super('breaker', x, y, 100, 120);
        this.state = { closed: false };
        // Pines superiores (Entrada) e inferiores (Salida)
        this.terminals = {
            'L1': {x: 18, y: 10, label: 'L1'}, 'L2': {x: 50, y: 10, label: 'L2'}, 'L3': {x: 82, y: 10, label: 'L3'},
            'T1': {x: 18, y: 110, label: 'T1'}, 'T2': {x: 50, y: 110, label: 'T2'}, 'T3': {x: 82, y: 110, label: 'T3'}
        };
    }
    draw(ctx) {
        super.draw(ctx);
        // Indicador visual de estado
        ctx.fillStyle = this.state.closed ? '#22c55e' : '#ef4444';
        ctx.beginPath(); 
        ctx.roundRect(this.x + 40, this.y + 55, 20, 30, 4); // Switch simulado
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '9px Arial';
        ctx.fillText(this.state.closed ? 'ON' : 'OFF', this.x + 50, this.y + 75);
    }
    toggle() { this.state.closed = !this.state.closed; }
}

class Contactor extends Component {
    constructor(x, y) {
        super('contactor', x, y, 100, 120);
        this.state = { engaged: false };
        this.terminals = {
            'L1': {x: 18, y: 10, label: 'L1'}, 'L2': {x: 50, y: 10, label: 'L2'}, 'L3': {x: 82, y: 10, label: 'L3'},
            'T1': {x: 18, y: 110, label: 'T1'}, 'T2': {x: 50, y: 110, label: 'T2'}, 'T3': {x: 82, y: 110, label: 'T3'},
            'A1': {x: 10, y: 60, label: 'A1'}, 'A2': {x: 90, y: 60, label: 'A2'},
            'NO13': {x: 10, y: 80, label: '13'}, 'NO14': {x: 90, y: 80, label: '14'}
        };
    }
    draw(ctx) {
        super.draw(ctx);
        if (this.state.engaged) {
            // Brillo central indicando activación magnética
            ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
            ctx.fillRect(this.x + 25, this.y + 40, 50, 40);
        }
    }
}

class ThermalRelay extends Component {
    constructor(x, y) {
        super('thermal-relay', x, y, 100, 100);
        this.state = { tripped: false };
        // Entradas (pines de cobre arriba) -> Salidas (tornillos abajo)
        this.terminals = {
            'L1': {x: 18, y: 5}, 'L2': {x: 50, y: 5}, 'L3': {x: 82, y: 5},
            'T1': {x: 18, y: 95, label: 'T1'}, 'T2': {x: 50, y: 95, label: 'T2'}, 'T3': {x: 82, y: 95, label: 'T3'},
            'NC95': {x: 10, y: 65, label: '95'}, 'NC96': {x: 30, y: 65, label: '96'},
            'NO97': {x: 70, y: 65, label: '97'}, 'NO98': {x: 90, y: 65, label: '98'}
        };
    }
}

class Motor extends Component {
    constructor(x, y) {
        super('motor', x, y, 160, 160);
        this.state = { running: false, angle: 0 };
        this.terminals = {
            'U': {x: 45, y: 35, label: 'U'}, 
            'V': {x: 80, y: 35, label: 'V'}, 
            'W': {x: 115, y: 35, label: 'W'}
        };
    }
    draw(ctx) {
        super.draw(ctx);
        if (this.state.running) {
             // Animación del eje
             ctx.save();
             ctx.translate(this.x + 80, this.y + 90); // Ajustar centro visual del motor
             ctx.rotate(this.state.angle);
             ctx.fillStyle = '#94a3b8';
             ctx.beginPath(); ctx.arc(0,0, 12, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = '#475569';
             ctx.fillRect(-2, -12, 4, 24);
             ctx.restore();
             this.state.angle += 0.3;
        }
    }
}

class PushButton extends Component {
    constructor(type, x, y) {
        super(type, x, y, 60, 60);
        this.terminals = { '1': {x: 10, y: 50}, '2': {x: 50, y: 50} };
        this.state = { pressed: false };
    }
    draw(ctx) {
        super.draw(ctx);
        if (this.state.pressed) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.arc(this.x+30, this.y+25, 20, 0, Math.PI*2); ctx.fill();
        }
    }
}

class PilotLight extends Component {
    constructor(type, x, y) {
        super(type, x, y, 50, 50);
        this.terminals = { 'X1': {x: 10, y: 45}, 'X2': {x: 40, y: 45} };
        this.state = { on: false };
    }
    draw(ctx) {
        super.draw(ctx);
        if(this.state.on) {
            const color = this.type.includes('green') ? '#22c55e' : '#ef4444';
            ctx.shadowColor = color; ctx.shadowBlur = 20;
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(this.x+25, this.y+25, 12, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;
        }
    }
}


// ================= LOGICA DE INTERACCION =================

let dragItem = null;
let wireStartObj = null; // { component, terminalId }
let mousePos = {x:0, y:0};

function init() {
    console.log("Iniciando Simulador Tablero...");
    
    // 1. Setup Canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 2. Setup Events
    setupEventListeners();

    // 3. Load Assets & Kickstart
    loadAssets().then(() => {
        console.log("Assets cargados/verificados. Dibujando inicial...");
        draw(); 
        loop(); // Iniciar loop de animación/simulación
    });
}

function loadAssets() {
    return new Promise((resolve) => {
        let loaded = 0;
        const keys = Object.keys(ASSET_PATHS);
        const total = keys.length;
        
        if (total === 0) { resolve(); return; }

        keys.forEach(key => {
            const img = new Image();
            img.src = ASSET_PATHS[key];
            
            const checkDone = () => {
                loaded++;
                if (loaded === total) resolve();
            };

            img.onload = () => { 
                console.log(`Asset cargado: ${key}`);
                assets[key] = img; 
                checkDone(); 
            };
            
            img.onerror = () => { 
                console.warn(`Error cargando asset: ${key} (${ASSET_PATHS[key]})`);
                // No lo agregamos a assets[], usaremos fallback
                checkDone(); 
            };
        });
    });
}

function setupEventListeners() {
    console.log("Setting up event listeners...");
    
    // Drag from Menu
    document.querySelectorAll('.component-btn').forEach(btn => {
        btn.addEventListener('dragstart', e => {
            console.log("Drag start:", btn.dataset.component);
            e.dataTransfer.setData('type', btn.dataset.component);
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    // Drop on Canvas
    // IMPORTANTE: dragover debe prevenir default para permitir drop
    canvas.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    canvas.addEventListener('drop', e => {
        e.preventDefault();
        console.log("Drop event detected!");
        
        try {
            const rect = canvas.getBoundingClientRect();
            const type = e.dataTransfer.getData('type');
            
            if (!type) {
                console.warn("Drop sin tipo válido");
                return;
            }

            // Coordenadas relativas al canvas
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            console.log(`Adding component: ${type} at ${x},${y}`);
            addComponent(type, x, y);

        } catch (err) {
            console.error("Error en Drop:", err);
        }
    });

    // Mouse Interaction
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    // Touch support (básico)
    canvas.addEventListener('touchstart', onMouseDown, {passive: false});
    canvas.addEventListener('touchmove', onMouseMove, {passive: false});
    canvas.addEventListener('touchend', onMouseUp);
    
    // UI Buttons (Simulación)
    const btnSim = document.getElementById('btn-simulate');
    const btnStop = document.getElementById('btn-stop-sim');
    const btnReset = document.getElementById('btn-reset');

    if(btnSim) btnSim.addEventListener('click', () => { isSimulating = true; updateStatus(); });
    if(btnStop) btnStop.addEventListener('click', () => { isSimulating = false; updateStatus(); });
    if(btnReset) btnReset.addEventListener('click', () => { 
        components = []; wires = []; isSimulating = false; updateStatus(); draw(); 
    });
}

function addComponent(type, x, y) {
    let c;
    switch(type) {
        case 'breaker': c = new Breaker(x, y); break;
        case 'contactor': c = new Contactor(x, y); break;
        case 'thermal-relay': c = new ThermalRelay(x, y); break;
        case 'motor': c = new Motor(x, y); break;
        case 'start-btn': c = new PushButton('start-btn', x, y); break;
        case 'stop-btn': c = new PushButton('stop-btn', x, y); break;
        case 'pilot-green': c = new PilotLight('pilot-green', x, y); break;
        case 'pilot-red': c = new PilotLight('pilot-red', x, y); break;
        default: return;
    }
    // Center logic
    c.x -= c.width/2; 
    c.y -= c.height/2;
    components.push(c);
    draw();
}

function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 1. Tocar Terminal? -> Iniciar Cableado
    for (const c of components) {
        const t = c.getHoveredTerminal(mx, my);
        if (t) {
            wireStartObj = { component: c, terminalId: t.id, x: t.x, y: t.y };
            return;
        }
    }

    // 2. Tocar Componente? -> Draguear o Activar
    // Reverse loop para tocar el de arriba
    for (let i = components.length - 1; i >= 0; i--) {
        const c = components[i];
        if (c.isMouseOver(mx, my)) {
            dragItem = { comp: c, offX: mx - c.x, offY: my - c.y };
            
            // Interacción Click (Toggle Breaker / Push Button)
            if (c instanceof Breaker) c.toggle();
            if (c instanceof PushButton) c.state.pressed = true;
            return;
        }
    }
}

function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;

    if (dragItem) {
        dragItem.comp.x = mousePos.x - dragItem.offX;
        dragItem.comp.y = mousePos.y - dragItem.offY;
    }
}

function onMouseUp(e) {
    // Soltar Boton
    if (dragItem && dragItem.comp instanceof PushButton) {
        dragItem.comp.state.pressed = false;
    }
    dragItem = null;

    // Finalizar Cableado
    if (wireStartObj) {
        // Ver si soltamos sobre otro terminal
        for (const c of components) {
            const t = c.getHoveredTerminal(mousePos.x, mousePos.y);
            if (t && t.component !== wireStartObj.component) {
                // Crear cable
                wires.push({
                    from: wireStartObj.component, fromId: wireStartObj.terminalId,
                    to: t.component, toId: t.id
                });
            }
        }
        wireStartObj = null;
    }
}

function updateStatus() {
    const el = document.getElementById('status-text');
    const dot = document.getElementById('status-dot');
    if (isSimulating) {
        el.innerText = "Simulando...";
        dot.className = "status-dot running";
    } else {
        el.innerText = "Detenido (Edición)";
        dot.className = "status-dot";
        // Reset states
        components.forEach(c => {
             if (c instanceof Motor) c.state.running = false;
             if (c instanceof Contactor) c.state.engaged = false;
             if (c instanceof PilotLight) c.state.on = false;
        });
    }
}


// ================= SIMULACION DE CIRCUITO (SOLVER) =================

function loop() {
    if (isSimulating) solveCircuit();
    draw();
    requestAnimationFrame(loop);
}

function solveCircuit() {
    // 1. Resetear nodos
    const nodes = {}; // Mapa "ComponentID_TerminalID" -> { voltage: boolean, phase: 'L1'|'L2'|'L3'|null }
    
    // Función auxiliar para setear estatus de un pin
    const setNode = (comp, term, phase) => {
        const key = `${comp.id}_${term}`;
        if (!nodes[key]) nodes[key] = new Set();
        nodes[key].add(phase);
    };

    const hasPhase = (comp, term, phase) => {
        const key = `${comp.id}_${term}`;
        return nodes[key] && nodes[key].has(phase);
    };

    // 2. Fuentes de Poder (StartPoints)
    // Asumimos que la entrada del Breaker (L1, L2, L3) SIEMPRE tiene energía
    components.filter(c => c instanceof Breaker).forEach(b => {
        setNode(b, 'L1', 'L1');
        setNode(b, 'L2', 'L2');
        setNode(b, 'L3', 'L3');
    });

    // 3. Propagación Iterativa (Max 10 iteraciones para estabilizar)
    let changed = true;
    for(let iter=0; iter<10 && changed; iter++) {
        changed = false;
        
        // A. Transferencia interna de Componentes
        components.forEach(c => {
            if (c instanceof Breaker && c.state.closed) {
                ['L1','L2','L3'].forEach((inT, i) => {
                    const outT = ['T1','T2','T3'][i];
                    if (hasPhase(c, inT, inT)) setNode(c, outT, inT); 
                });
            }
            if (c instanceof Contactor && c.state.engaged) {
                ['L1','L2','L3'].forEach((inT, i) => {
                     const outT = ['T1','T2','T3'][i];
                     // Transferir si tiene fase correspondiente
                     // NOTA: Simplificamos, si L1 tiene L1 fase, pasa a T1.
                     if (hasPhase(c, inT, inT)) setNode(c, outT, inT); 
                });
            }
            if (c instanceof ThermalRelay && !c.state.tripped) {
                ['L1','L2','L3'].forEach((inT, i) => {
                     const outT = ['T1','T2','T3'][i];
                     if (hasPhase(c, inT, inT)) setNode(c, outT, inT); 
                });
                // Contacto NC 95-96 (Control)
                // Si 95 tiene algo, pasarlo a 96
                // (Implementación básica de control single-phase)
                // Asumimos control voltage es L1 o cualquier fase.
            }
            if (c instanceof PushButton && c.state.pressed) {
                // Paso 1->2
                // Chequear qué fases hay en 1
                const k1 = `${c.id}_1`;
                if(nodes[k1]) nodes[k1].forEach(p => setNode(c, '2', p));
            }
        });

        // B. Transferencia por Cables
        wires.forEach(w => {
            // De Start a End
            const kStart = `${w.from.id}_${w.fromId}`;
            const kEnd = `${w.to.toId}_${w.toId}`; // BUG: w.to is component, w.toId is term
            
            // Corregir acceso
            const ks = `${w.from.id}_${w.fromId}`;
            const ke = `${w.to.id}_${w.toId}`;

            if(nodes[ks]) {
                nodes[ks].forEach(p => {
                    if (!nodes[ke] || !nodes[ke].has(p)) {
                        setNode(w.to, w.toId, p);
                        changed = true;
                    }
                });
            }
            // Cables son bidireccionales
            if(nodes[ke]) {
                nodes[ke].forEach(p => {
                    if (!nodes[ks] || !nodes[ks].has(p)) {
                        setNode(w.from, w.fromId, p);
                        changed = true;
                    }
                });
            }
        });
        
        // C. Lógica de Activación de Bobinas y Motores (Consumidores)
        
        // Bobina Contactor (A1 - A2)
        // Requiere diferencia de potencial (Fase-Neutro o Fase-Fase).
        // Simplificacion: Si A1 tiene fase y A2 tiene fase distinta o Neutro (no simulado), activar.
        // HACK: Si A1 tiene 'L1' (control) -> activar.
        components.filter(c => c instanceof Contactor).forEach(k => {
            const hasA1 = nodes[`${k.id}_A1`];
            // Lógica Auto-Enclavamiento si cableado:
            // Si A1 recibe señal...
            if (hasA1 && hasA1.size > 0) k.state.engaged = true;
            else k.state.engaged = false;
        });

        // Motor (U, V, W)
        components.filter(c => c instanceof Motor).forEach(m => {
            const u = hasPhase(m, 'U', 'L1');
            const v = hasPhase(m, 'V', 'L2');
            const w = hasPhase(m, 'W', 'L3');
            m.state.running = (u && v && w);
        });

        // Luces
        components.filter(c => c instanceof PilotLight).forEach(p => {
            const x1 = nodes[`${p.id}_X1`];
            if (x1 && x1.size > 0) p.state.on = true;
            else p.state.on = false; 
        });
    }
}


// ================= RENDER =================

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Cables
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    wires.forEach(w => {
        const p1 = w.from.getTerminal(w.fromId);
        const p2 = w.to.getTerminal(w.toId);
        
        if (p1 && p2) {
             // Determinar color: Si simulando y tiene voltaje -> Rojo/Vivo, sino Azul.
             ctx.strokeStyle = '#3b82f6'; 
             ctx.lineWidth = 4;
             
             // Visualizar flujo si simulando
             if (isSimulating) {
                 // Check if start or end has voltage
                 // (Sería ideal pintar todo el cable caliente)
             }

             ctx.beginPath();
             ctx.moveTo(p1.x, p1.y);
             
             // Cableado "Ortohonal" o "Natural"
             // Curva simple "colgante"
             const midY = Math.max(p1.y, p2.y) + 40;
             ctx.bezierCurveTo(p1.x, midY, p2.x, midY, p2.x, p2.y);
             ctx.stroke();
        }
    });

    // 2. Wire Creation Line
    if (wireStartObj) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        const p1 = wireStartObj.component.getTerminal(wireStartObj.terminalId);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 3. Componentes
    components.forEach(c => c.draw(ctx));
}

// Init
document.addEventListener('DOMContentLoaded', init);
