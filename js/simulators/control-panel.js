/**
 * ELECTROMATICS - Simulador de Tableros de Control (Constructor Version 2.0)
 * Enfoque: Diseño Vertical (Breaker -> Contactor -> Térmico -> Motor)
 */

const canvas = document.getElementById('simulatorCanvas');
const ctx = canvas.getContext('2d');

// Estado Global (Expuesto para debug)
window.assets = {}; 
window.components = []; 
window.wires = []; 
window.isSimulating = false;
window.scale = 1.0; // Zoom level
window.selectedWire = null;
window.currentWireColor = '#3b82f6'; // Default Blue
let simulationTime = 0;

// Alias locales para compatibilidad con código existente
let assets = window.assets;
let components = window.components;
let wires = window.wires;
let isSimulating = window.isSimulating;
let scale = window.scale;
let selectedWire = window.selectedWire;
let selectedComponent = null; // New state
let currentWireColor = window.currentWireColor;
let draggingHandle = null; // {wire, cp: 1|2}
let isTripleMode = false; // New state for Triple Cable tool

// Configuración de Assets
const ASSET_PATHS = {
    'breaker': 'img/simulators/control-panel/breaker.png',
    'contactor': 'img/simulators/control-panel/contactor.png',
    'thermal-relay': 'img/simulators/control-panel/thermal-relay.png',
    'motor': 'img/simulators/control-panel/motor.png',
    'start-btn': 'img/simulators/control-panel/pushbutton-green.png',
    'stop-btn': 'img/simulators/control-panel/pushbutton-red.png',
    'pilot-green': 'img/simulators/control-panel/pilot-green.png',
    'pilot-red': 'img/simulators/control-panel/pilot-red.png',
    'pilot-amber': 'img/simulators/control-panel/pilot-amber.png',
    // Fuente no tiene imagen, se dibuja
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
            // Ajustar radio de hit según zoom si fuera necesario, pero coordenadas ya vienen transformadas
            if (Math.hypot(mx - tx, my - ty) < 12) return this.getTerminal(id);
        }
        return null;
    }

    isMouseOver(mx, my) {
        return mx >= this.x && mx <= this.x + this.width &&
               my >= this.y && my <= this.y + this.height;
    }

    serialize() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            state: JSON.parse(JSON.stringify(this.state)) // Deep copy
        };
    }
    draw(ctx) {
        // 1. Imagen
        if (assets[this.type]) {
            // Sombra para dar profundidad
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets[this.type], this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        } else if (this.type === 'power-source') {
             // Dibujo vectorizado para Fuente
             ctx.fillStyle = '#334155';
             ctx.fillRect(this.x, this.y, this.width, this.height);
             ctx.strokeStyle = '#94a3b8';
             ctx.strokeRect(this.x, this.y, this.width, this.height);
             ctx.fillStyle = '#fbbf24';
             ctx.font = 'bold 14px Inter';
             ctx.textAlign = 'center';
             ctx.fillText('3Φ', this.x + this.width/2, this.y + 25);
             ctx.font = '10px Inter';
             ctx.fillStyle = '#fff';
             ctx.fillText('440V', this.x + this.width/2, this.y + 40);
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

class PowerSource extends Component {
    constructor(x, y) {
        super('power-source', x, y, 120, 60);
        // Estandarizado a 32px de separación
        this.terminals = {
            'L1': {x: 20, y: 50, label: 'L1'}, 
            'L2': {x: 52, y: 50, label: 'L2'}, 
            'L3': {x: 84, y: 50, label: 'L3'},
            'N':  {x: 110, y: 50, label: 'N'}
        };
    }
    
    draw(ctx) {
        super.draw(ctx);
        // Draw Neutral Terminal specific color
        const t = this.getTerminal('N');
        if(t) {
             ctx.beginPath();
             ctx.arc(t.x, t.y, 5, 0, Math.PI*2);
             ctx.fillStyle = '#e2e8f0'; // Gray/White for Neutral
             ctx.fill();
             ctx.strokeStyle = '#64748b';
             ctx.stroke();
             ctx.fillStyle = '#fff';
             ctx.font = 'bold 10px Inter';
             ctx.fillText('N', t.x, t.y + 18);
        }
    }
}

class SinglePhaseSource extends Component {
    constructor(x, y) {
        super('single-phase-source', x, y, 70, 60);
        this.terminals = {
            'L': {x: 50, y: 50, label: 'L'},
            'N': {x: 20, y: 50, label: 'N'}
        };
    }
    draw(ctx) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#94a3b8';
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('1Φ', this.x + this.width/2, this.y + 25);
        ctx.font = '10px Inter';
        ctx.fillStyle = '#fff';
        ctx.fillText('220V', this.x + this.width/2, this.y + 40);
        super.draw(ctx);
    }
}

class Breaker extends Component {
    constructor(x, y) {
        super('breaker', x, y, 100, 120);
        this.state = { closed: false };
        // Pines superiores (Entrada) e inferiores (Salida)
        this.terminals = {
            'L1': {x: 20, y: 10, label: 'L1'}, 'L2': {x: 52, y: 10, label: 'L2'}, 'L3': {x: 84, y: 10, label: 'L3'},
            'T1': {x: 20, y: 110, label: 'T1'}, 'T2': {x: 52, y: 110, label: 'T2'}, 'T3': {x: 84, y: 110, label: 'T3'}
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
            'L1': {x: 20, y: 10, label: 'L1'}, 'L2': {x: 52, y: 10, label: 'L2'}, 'L3': {x: 84, y: 10, label: 'L3'},
            'T1': {x: 20, y: 110, label: 'T1'}, 'T2': {x: 52, y: 110, label: 'T2'}, 'T3': {x: 84, y: 110, label: 'T3'},
            'A1': {x: 5, y: 60, label: 'A1'}, 'A2': {x: 95, y: 60, label: 'A2'},
            'NO13': {x: 5, y: 40, label: '13'}, 'NO14': {x: 95, y: 40, label: '14'},
            'NC21': {x: 5, y: 80, label: '21'}, 'NC22': {x: 95, y: 80, label: '22'}
        };
    }
    draw(ctx) {
        super.draw(ctx);
        // Plunger Logic (Visual Feedback)
        const plungerY = this.state.engaged ? 45 : 40;
        const plungerColor = this.state.engaged ? '#d97706' : '#f59e0b'; // Darker when engaged
        
        ctx.fillStyle = '#1e293b'; // Slot background
        ctx.fillRect(this.x + 35, this.y + 35, 30, 40);
        
        ctx.fillStyle = plungerColor;
        // Plunger moves down 5px
        ctx.fillRect(this.x + 38, this.y + plungerY, 24, 25);
        
        // Label on plunger
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(this.state.engaged ? 'I' : 'O', this.x + 50, this.y + plungerY + 15);
        
        if (this.state.engaged) {
            // Glow effect
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 15;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fbbf24';
            ctx.strokeRect(this.x + 38, this.y + plungerY, 24, 25);
            ctx.shadowBlur = 0;
        }
    }
}

class ThermalRelay extends Component {
    constructor(x, y) {
        super('thermal-relay', x, y, 100, 100);
        this.state = { 
            tripped: false,
            currentLimit: 5.0, // Amperes
            currentSense: 0.0,
            tripEnabled: true
        };
        // Entradas (pines de cobre arriba) -> Salidas (tornillos abajo)
        this.terminals = {
            'L1': {x: 20, y: 5}, 'L2': {x: 52, y: 5}, 'L3': {x: 84, y: 5},
            'T1': {x: 20, y: 95, label: 'T1'}, 'T2': {x: 52, y: 95, label: 'T2'}, 'T3': {x: 84, y: 95, label: 'T3'},
            'NC95': {x: 5, y: 65, label: '95'}, 'NC96': {x: 30, y: 65, label: '96'},
            'NO97': {x: 70, y: 65, label: '97'}, 'NO98': {x: 95, y: 65, label: '98'}
        };
    }
    
    draw(ctx) {
        super.draw(ctx);
        if (this.state.tripped) {
            // Indicador visual de disparo
            ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Rojo suave
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
            
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('TRIPPED', this.x + this.width/2, this.y + this.height/2);
        }
    }
}

class Motor extends Component {
    constructor(x, y) {
        super('motor', x, y, 160, 160);
        this.state = { 
            running: false, 
            angle: 0, 
            direction: 1,
            nominalCurrent: 6.5 // Corriente que consume al girar
        }; 
        this.terminals = {
            'U': {x: 48, y: 35, label: 'U'}, 
            'V': {x: 80, y: 35, label: 'V'}, 
            'W': {x: 112, y: 35, label: 'W'}
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
             
             // Flecha de Dirección
             ctx.save();
             ctx.translate(this.x + 80, this.y + 90);
             ctx.strokeStyle = '#22c55e';
             ctx.lineWidth = 4;
             ctx.beginPath();
             // Arco flecha
             ctx.arc(0, 0, 40, 0, Math.PI * (this.state.direction > 0 ? 1 : -1) * 0.5, this.state.direction < 0);
             ctx.stroke();
             // Cabeza flecha (simplificada)
             // TBD: Drawing actual arrow
             ctx.restore();
             this.state.angle += 0.2 * this.state.direction;
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
        // Button Cap
        const btnColor = this.type.includes('green') ? '#22c55e' : '#ef4444';
        const pressOffset = this.state.pressed ? 2 : 0;
        
        // Casing ring
        ctx.beginPath(); ctx.arc(this.x+30, this.y+25, 22, 0, Math.PI*2); 
        ctx.fillStyle = '#cbd5e1'; ctx.fill(); ctx.stroke();

        // Button itself
        ctx.beginPath(); ctx.arc(this.x+30, this.y+25 + pressOffset, 18, 0, Math.PI*2);
        ctx.fillStyle = this.state.pressed ? '#1e293b' : btnColor; // Darken on press or just move
        // Gradient for 3D effect
        const grad = ctx.createRadialGradient(this.x+30-5, this.y+25+pressOffset-5, 2, this.x+30, this.y+25+pressOffset, 18);
        grad.addColorStop(0, this.state.pressed ? '#334155' : '#fff');
        grad.addColorStop(1, this.state.pressed ? '#0f172a' : btnColor);
        ctx.fillStyle = grad;
        
        ctx.fill(); 
        
        if (this.state.pressed) {
           // Inner shadow
           ctx.strokeStyle = 'rgba(0,0,0,0.5)';
           ctx.lineWidth = 2;
           ctx.stroke();
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
            const color = this.type.includes('green') ? '#22c55e' : 
                         (this.type.includes('amber') ? '#f59e0b' : '#ef4444');
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

function getEventPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Scale: Relación entre Pixeles del Buffer (width) y Pixeles CSS (rect.width)
    // Cuando width=100%, es 1:1. Cuando width=2400, rect.width puede ser 2400 o menos si CSS lo restringe.
    // Nosotros quitamos CSS width, así que rect.width debería ser igual a canvas.width (zoom físico).
    const domScaleX = canvas.width / rect.width;
    const domScaleY = canvas.height / rect.height;

    const rawX = (clientX - rect.left) * domScaleX;
    const rawY = (clientY - rect.top) * domScaleY;
    
    // Logical Scale (Zoom del dibujo ctx.scale)
    return {
        x: rawX / scale,
        y: rawY / scale
    };
}

function loop() {
    if (isSimulating) {
        solveCircuit();
    }
    draw();
    requestAnimationFrame(loop);
}

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
        loop(); 
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
                checkDone(); 
            };
        });
    });
}

function setupEventListeners() {
    console.log("Setting up event listeners...");
    
    // Zoom Controls
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    if(btnZoomIn) btnZoomIn.addEventListener('click', () => { 
        scale = Math.min(scale + 0.1, 2.0); 
        resizeCanvas(); 
    });
    if(btnZoomOut) btnZoomOut.addEventListener('click', () => { 
        scale = Math.max(scale - 0.1, 0.5); 
        resizeCanvas(); 
    });

    // Color Selector
    const colorSelect = document.getElementById('wire-color');
    if(colorSelect) {
        colorSelect.addEventListener('change', (e) => {
            currentWireColor = e.target.value;
            // Si hay un cable seleccionado, cambiarle el color
            if (selectedWire) {
                selectedWire.color = currentWireColor;
                draw();
            }
        });
    }

    // Delete Key listener
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedWire) {
                const idx = wires.indexOf(selectedWire);
                if (idx > -1) {
                    wires.splice(idx, 1);
                    selectedWire = null;
                    draw();
                }
            } else if (selectedComponent) {
                // Eliminar componente y sus cables
                const idx = components.indexOf(selectedComponent);
                if (idx > -1) {
                    const compId = selectedComponent.id;
                    components.splice(idx, 1);
                    // Eliminar cables asociados
                    wires = wires.filter(w => w.from.id !== compId && w.to.id !== compId);
                    window.wires = wires; // Sync global
                    selectedComponent = null;
                    draw();
                }
            }
        }
    });

    // Drag from Menu
    document.querySelectorAll('.component-btn').forEach(btn => {
        btn.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', btn.dataset.component);
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    // Drop on Canvas
    const canvasContainer = canvas.parentElement;

    canvasContainer.addEventListener('dragenter', e => {
        e.preventDefault();
        canvasContainer.classList.add('drop-valid');
    });

    canvasContainer.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        canvasContainer.classList.add('drop-valid'); // Asegurar loop
    });

    canvasContainer.addEventListener('dragleave', e => {
        canvasContainer.classList.remove('drop-valid');
    });

    canvasContainer.addEventListener('drop', e => {
        e.preventDefault();
        canvasContainer.classList.remove('drop-valid');
        
        try {
            const type = e.dataTransfer.getData('text/plain');
            if (!type) return;

            // Usar helper unificado (shim para clientX/Y del DropEvent que es MouseEvent)
            const pos = getEventPos(e);
            
            addComponent(type, pos.x, pos.y);

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

    // Context Menu (Right Click)
    const ctxMenu = document.getElementById('context-menu');
    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        const pos = getEventPos(e);
        const mx = pos.x;
        const my = pos.y;

        // Buscar si clicamos en un componente
        for (let i = components.length - 1; i >= 0; i--) {
            const c = components[i];
            if (c.isMouseOver(mx, my)) {
                selectedComponent = c;
                showContextMenu(e.clientX, e.clientY, c);
                return;
            }
        }
        ctxMenu.style.display = 'none';
    });

    // Cerrar menú al hacer clic en cualquier parte
    document.addEventListener('click', () => {
        if(ctxMenu) ctxMenu.style.display = 'none';
    });

    function showContextMenu(x, y, component) {
        const title = document.getElementById('menu-title');
        const thermal = document.getElementById('thermal-controls');
        const inputLimit = document.getElementById('input-limit');
        
        title.innerText = component.type.replace('-', ' ').toUpperCase();
        ctxMenu.style.left = `${x}px`;
        ctxMenu.style.top = `${y}px`;
        ctxMenu.style.display = 'block';

        // Mostrar controles específicos
        if (component instanceof ThermalRelay) {
            thermal.style.display = 'block';
            inputLimit.value = component.state.currentLimit;
            // Guardar referencia al componente actual para el input
            inputLimit.onchange = (e) => {
                component.state.currentLimit = parseFloat(e.target.value);
            };
            document.getElementById('btn-reset-relay').onclick = () => {
                component.state.tripped = false;
                draw();
            };
        } else {
            thermal.style.display = 'none';
        }

        // Eliminar Genérico
        document.getElementById('btn-delete-comp').onclick = () => {
            const idx = components.indexOf(component);
            if(idx > -1) {
                components.splice(idx, 1);
                const compId = component.id;
                wires = wires.filter(w => w.from.id !== compId && w.to.id !== compId);
                selectedComponent = null;
                draw();
            }
            ctxMenu.style.display = 'none';
        };
    }
    
    // UI Buttons (Simulación)
    const btnSim = document.getElementById('btn-simulate');
    const btnStop = document.getElementById('btn-stop-sim');
    const btnReset = document.getElementById('btn-reset');

    if(btnSim) btnSim.addEventListener('click', () => { isSimulating = true; updateStatus(); });
    if(btnStop) btnStop.addEventListener('click', () => { isSimulating = false; updateStatus(); });
    if(btnReset) btnReset.addEventListener('click', () => { 
        components = []; wires = []; isSimulating = false; updateStatus(); draw(); 
    });

    // Triple Cable Toggle
    const btnTriple = document.getElementById('btn-triple-cable');
    if(btnTriple) {
        btnTriple.addEventListener('click', () => {
            isTripleMode = !isTripleMode;
            btnTriple.classList.toggle('selected', isTripleMode);
            // Si activamos cable triple, cambiamos color a potencia (Negro) por defecto
            if(isTripleMode) {
                currentWireColor = '#000000';
                const sel = document.getElementById('wire-color');
                if(sel) sel.value = '#000000';
            }
        });
    }

    // Persistencia
    const btnSaveLocal = document.getElementById('btn-save-local');
    const btnLoadLocal = document.getElementById('btn-load-local');
    const btnExport = document.getElementById('btn-export-json');
    const btnImport = document.getElementById('btn-import-json');

    if(btnSaveLocal) btnSaveLocal.addEventListener('click', saveToLocalStorage);
    if(btnLoadLocal) btnLoadLocal.addEventListener('click', loadFromLocalStorage);
    if(btnExport) btnExport.addEventListener('click', downloadCircuit);
    if(btnImport) btnImport.addEventListener('click', triggerFileUpload);
}

function addComponent(type, x, y) {
    let c;
    switch(type) {
        case 'power-source':
            c = new PowerSource(x, y);
            break;

        case 'single-phase-source': c = new SinglePhaseSource(x, y); break;
        case 'breaker': c = new Breaker(x, y); break;
        case 'contactor': c = new Contactor(x, y); break;
        case 'thermal-relay': c = new ThermalRelay(x, y); break;
        case 'motor': c = new Motor(x, y); break;
        case 'start-btn': c = new PushButton('start-btn', x, y); break;
        case 'stop-btn': c = new PushButton('stop-btn', x, y); break;
        case 'pilot-green': c = new PilotLight('pilot-green', x, y); break;
        case 'pilot-red': c = new PilotLight('pilot-red', x, y); break;
        case 'pilot-amber': c = new PilotLight('pilot-amber', x, y); break;
        default: return;
    }
    // Calcular posición top-left basada en el mouse (centro)
    let tlX = x - c.width/2;
    let tlY = y - c.height/2;

    // Aplicar Snap to Grid (20px) para alineación perfecta
    c.x = snapToGrid(tlX); 
    c.y = snapToGrid(tlY);

    components.push(c);
    if (selectedWire) {
        selectedWire = null; // Deseleccionar al agregar componente
    }
    draw();
}

// Helper para obtener Puntos de Control (Default o Custom)
function getWireControlPoints(w) {
    const p1 = w.from.getTerminal(w.fromId);
    const p2 = w.to.getTerminal(w.toId);
    if (!p1 || !p2) return null;

    if (w.customCP1 && w.customCP2) {
        return { cp1: w.customCP1, cp2: w.customCP2, isCustom: true };
    }
    
    // Default Auto-Route (U-Shape)
    const midY = Math.max(p1.y, p2.y) + 40;
    return {
        cp1: { x: p1.x, y: midY },
        cp2: { x: p2.x, y: midY },
        isCustom: false
    };
}

function onMouseDown(e) {
    if (e.touches) e.preventDefault(); // Prevenir scroll en touch
    const pos = getEventPos(e);
    const mx = pos.x;
    const my = pos.y;

    // 0. Handle Dragging (Wire Control Points)
    if (selectedWire) {
        const cps = getWireControlPoints(selectedWire);
        if (cps) {
            // Check CP1
            if (Math.hypot(mx - cps.cp1.x, my - cps.cp1.y) < 8) {
                // Initialize custom CPs if not valid
                if (!selectedWire.customCP1) {
                    selectedWire.customCP1 = { ...cps.cp1 };
                    selectedWire.customCP2 = { ...cps.cp2 };
                }
                draggingHandle = { wire: selectedWire, cp: 1 };
                return;
            }
            // Check CP2
            if (Math.hypot(mx - cps.cp2.x, my - cps.cp2.y) < 8) {
                if (!selectedWire.customCP1) {
                    selectedWire.customCP1 = { ...cps.cp1 };
                    selectedWire.customCP2 = { ...cps.cp2 };
                }
                draggingHandle = { wire: selectedWire, cp: 2 };
                return;
            }
        }
    }

    // 0.5 Reset Selection (unless clicking valid object)
    let hitObject = false;

    // 1. Tocar Terminal? -> Iniciar Cableado
    for (const c of components) {
        const t = c.getHoveredTerminal(mx, my);
        if (t) {
            wireStartObj = { component: c, terminalId: t.id, x: t.x, y: t.y };
            return;
        }
    }

    // 2. Tocar Componente? -> Draguear o Activar
    for (let i = components.length - 1; i >= 0; i--) {
        const c = components[i];
        if (c.isMouseOver(mx, my)) {
            dragItem = { comp: c, offX: mx - c.x, offY: my - c.y };
            
            // Interacción Click
            if (c instanceof Breaker) c.toggle();
            if (c instanceof PushButton) c.state.pressed = true;

            // Selección de componente
            selectedComponent = c;
            selectedWire = null;
            draw();
            return;
        }
    }

    // 3. Tocar Cable? (Selección)
    for (const w of wires) {
        if (isMouseOverWire(mx, my, w)) {
            selectedWire = w;
            selectedComponent = null; // Clear comp selection
            // Update color picker to match wire
            if(w.color) {
                currentWireColor = w.color;
                const sel = document.getElementById('wire-color');
                if(sel) sel.value = w.color;
            }
            hitObject = true;
            draw();
            return; // Stop propagation
        }
    }

    // Si no tocamos nada, limpiar selección
    if (!hitObject) {
        selectedWire = null;
        selectedComponent = null;
        draw();
    }
}

function onMouseMove(e) {
    if (e.touches) e.preventDefault();
    const pos = getEventPos(e);
    mousePos.x = pos.x;
    mousePos.y = pos.y;

    if (dragItem) {
        const rawX = mousePos.x - dragItem.offX;
        const rawY = mousePos.y - dragItem.offY;
        // Snap dragging
        dragItem.comp.x = snapToGrid(rawX);
        dragItem.comp.y = snapToGrid(rawY);
    }

    if (draggingHandle) {
         // Free movement for handles (no snap needed usually, but can be added)
         if (draggingHandle.cp === 1) draggingHandle.wire.customCP1 = { x: mousePos.x, y: mousePos.y };
         else draggingHandle.wire.customCP2 = { x: mousePos.x, y: mousePos.y };
         draw();
    }
}

function onMouseUp(e) {
    // Soltar Boton
    if (dragItem && dragItem.comp instanceof PushButton) {
        dragItem.comp.state.pressed = false;
    }
    dragItem = null;
    draggingHandle = null;

    // Finalizar Cableado
    if (wireStartObj) {
        // Ver si soltamos sobre otro terminal
        for (const c of components) {
            const t = c.getHoveredTerminal(mousePos.x, mousePos.y);
            if (t && t.component !== wireStartObj.component) {
                // Crear cable
                if (isTripleMode) {
                    // Mapeo de fases para cables triples
                    const phases = ['L1', 'L2', 'L3'];
                    const fromPrefix = wireStartObj.terminalId.substring(0, 1); // 'L'
                    const toPrefix = t.id.substring(0, 1); // 'L' o 'U' etc.

                    // Intentar conectar las 3 fases si existen
                    const connections = [
                        {f: 'L1', t: 'T1'}, {f: 'L2', t: 'T2'}, {f: 'L3', t: 'T3'}, // Breaker/Contactor
                        {f: 'L1', t: 'L1'}, {f: 'L2', t: 'L2'}, {f: 'L3', t: 'L3'}, // Bus/Source
                        {f: 'L1', t: 'U'}, {f: 'L2', t: 'V'}, {f: 'L3', t: 'W'}     // Motor
                    ];

                    // Creamos UN SOLO objeto wire con propiedad isTriple
                    // La lógica de dibujado y simulación se encargará de las otras 2 fases
                    wires.push({
                        from: wireStartObj.component, fromId: wireStartObj.terminalId,
                        to: t.component, toId: t.id,
                        color: '#000000',
                        isTriple: true
                    });
                } else {
                    wires.push({
                        from: wireStartObj.component, fromId: wireStartObj.terminalId,
                        to: t.component, toId: t.id,
                        color: currentWireColor
                    });
                }
                draw(); // Redraw immediately
            }
        }
        wireStartObj = null;
    }
    // Redraw on release (snap fix visual update)
    draw();
}

function updateStatus() {
    const el = document.getElementById('status-text');
    const dot = document.getElementById('status-dot');
    if (isSimulating) {
        el.innerText = "Simulando...";
        dot.className = "status-dot running";
    } else {
        el.innerText = "Detenido";
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

function solveCircuit() {
    let changed = true;
    // 1. Resetear nodos
    const nodes = {}; // Mapa "ComponentID_TerminalID" -> { voltage: boolean, phase: 'L1'|'L2'|'L3'|null }
    
    // Función auxiliar para setear estatus de un pin
    const setNode = (comp, term, phase) => {
        const key = `${comp.id}_${term}`;
        if (!nodes[key]) nodes[key] = new Set();
        if (!nodes[key].has(phase)) {
            nodes[key].add(phase);
            changed = true; // Cualquier nuevo potencial debe gatillar otra iteración
        }
    };

    const hasPhase = (comp, term, phase) => {
        const key = `${comp.id}_${term}`;
        return nodes[key] && nodes[key].has(phase);
    };

    // 2. Fuentes de Poder (StartPoints)
    components.filter(c => c instanceof PowerSource).forEach(p => {
        setNode(p, 'L1', 'L1');
        setNode(p, 'L2', 'L2');
        setNode(p, 'L3', 'L3');
        setNode(p, 'N', 'N'); // Emit Neutral
    });

    components.filter(c => c instanceof SinglePhaseSource).forEach(p => {
        setNode(p, 'L', 'L1'); // L acts as L1
        setNode(p, 'N', 'N');
    });

    // 3. Propagación Iterativa (Max 10 iteraciones para estabilizar)
    for(let iter=0; iter<10 && changed; iter++) {
        changed = false;
        
        // A. Transferencia interna de Componentes
        components.forEach(c => {
            if (c instanceof Breaker && c.state.closed) {
                ['L1','L2','L3'].forEach((inT, i) => {
                    const outT = ['T1','T2','T3'][i];
                    // Bidireccional
                    if (nodes[`${c.id}_${inT}`]) nodes[`${c.id}_${inT}`].forEach(p => setNode(c, outT, p));
                    if (nodes[`${c.id}_${outT}`]) nodes[`${c.id}_${outT}`].forEach(p => setNode(c, inT, p));
                });
            }
            if (c instanceof Contactor && c.state.engaged) {
                // Principales (Bidireccional)
                ['L1','L2','L3'].forEach((inT, i) => {
                     const outT = ['T1','T2','T3'][i];
                     if (nodes[`${c.id}_${inT}`]) nodes[`${c.id}_${inT}`].forEach(p => setNode(c, outT, p));
                     if (nodes[`${c.id}_${outT}`]) nodes[`${c.id}_${outT}`].forEach(p => setNode(c, inT, p));
                });
                // Auxiliares NO (13-14)
                // Bidireccional simple: Lo que hay en 13 pasa a 14 y viceversa
                const k13 = `${c.id}_NO13`;
                const k14 = `${c.id}_NO14`;
                if(nodes[k13]) nodes[k13].forEach(p => setNode(c, 'NO14', p));
                if(nodes[k14]) nodes[k14].forEach(p => setNode(c, 'NO13', p));
            }
            if (c instanceof Contactor && !c.state.engaged) {
                // Auxiliares NC (21-22)
                const k21 = `${c.id}_NC21`;
                const k22 = `${c.id}_NC22`;
                if(nodes[k21]) nodes[k21].forEach(p => setNode(c, 'NC22', p));
                if(nodes[k22]) nodes[k22].forEach(p => setNode(c, 'NC21', p));
            }
            
            if (c instanceof ThermalRelay && !c.state.tripped) {
                ['L1','L2','L3'].forEach((inT, i) => {
                     const outT = ['T1','T2','T3'][i];
                     if (hasPhase(c, inT, inT)) setNode(c, outT, inT); 
                });
                // Contacto NC 95-96 (Bidireccional)
                const k95 = `${c.id}_NC95`, k96 = `${c.id}_NC96`;
                if(nodes[k95]) nodes[k95].forEach(p => setNode(c, 'NC96', p));
                if(nodes[k96]) nodes[k96].forEach(p => setNode(c, 'NC95', p));
            }
            // NO 97-98 térmico (solo si trip, Bidireccional)
            if (c instanceof ThermalRelay && c.state.tripped) {
                const k97 = `${c.id}_NO97`, k98 = `${c.id}_NO98`;
                if(nodes[k97]) nodes[k97].forEach(p => setNode(c, 'NO98', p));
                if(nodes[k98]) nodes[k98].forEach(p => setNode(c, 'NO97', p));
            }

            if (c instanceof PushButton) {
                const isNC = c.type === 'stop-btn';
                const isConducting = isNC ? !c.state.pressed : c.state.pressed;
                
                if (isConducting) {
                    const k1 = `${c.id}_1`;
                    const k2 = `${c.id}_2`;
                    // Conducción Bidireccional
                    if(nodes[k1]) nodes[k1].forEach(p => setNode(c, '2', p));
                    if(nodes[k2]) nodes[k2].forEach(p => setNode(c, '1', p));
                }
            }
        });

        // B. Transferencia por Cables
        wires.forEach(w => {
            if (w.isTriple) {
                // Propagación trifásica automática
                const phaseSets = [['L1', 'L2', 'L3'], ['T1', 'T2', 'T3'], ['U', 'V', 'W']];

                let setFrom = phaseSets.find(s => s.includes(w.fromId));
                let setTo = phaseSets.find(s => s.includes(w.toId));

                if (setFrom && setTo) {
                    for (let i = 0; i < 3; i++) {
                        const fid = setFrom[i], tid = setTo[i];
                        const ks = `${w.from.id}_${fid}`, ke = `${w.to.id}_${tid}`;
                        if (nodes[ks]) nodes[ks].forEach(p => setNode(w.to, tid, p));
                        if (nodes[ke]) nodes[ke].forEach(p => setNode(w.from, fid, p));
                    }
                }
            } else {
                const ks = `${w.from.id}_${w.fromId}`, ke = `${w.to.id}_${w.toId}`;
                if (nodes[ks]) nodes[ks].forEach(p => setNode(w.to, w.toId, p));
                if (nodes[ke]) nodes[ke].forEach(p => setNode(w.from, w.fromId, p));
            }
        });
        
        // C. Consumidores
        // Limpiar sensores de corriente
        components.filter(c => c instanceof ThermalRelay).forEach(r => r.state.currentSense = 0);

        // Motores y otros receptores
        components.filter(c => c instanceof Motor).forEach(m => {
            const hasU = nodes[`${m.id}_U`];
            const hasV = nodes[`${m.id}_V`];
            const hasW = nodes[`${m.id}_W`];
            
            if (hasU && hasU.size > 0 && hasV && hasV.size > 0 && hasW && hasW.size > 0) {
                // Secuencia y Giro
                const uPhase = [...hasU][0];
                const vPhase = [...hasV][0];
                const wPhase = [...hasW][0];

                if (uPhase !== vPhase && vPhase !== wPhase && uPhase !== wPhase) {
                    if(!m.state.running) {
                        m.state.running = true;
                        changed = true;
                    }
                    // Detectar secuencia
                    if (uPhase==='L1' && vPhase==='L2') m.state.direction = 1;
                    else if (uPhase==='L1' && vPhase==='L3') m.state.direction = -1;
                    else m.state.direction = 1;

                    // Propagar Corriente hacia los Relés Térmicos en serie
                    components.filter(c => c instanceof ThermalRelay && !c.state.tripped).forEach(r => {
                        const hasT1 = nodes[`${r.id}_T1`], hasT2 = nodes[`${r.id}_T2`], hasT3 = nodes[`${r.id}_T3`];
                        
                        // Verificar si las salidas del relé están conectadas a las entradas del motor
                        // Comparamos los conjuntos de fases. Si comparten al menos una fase de potencia, asumimos conexión
                        const connected = (t, m) => t && m && [...t].some(p => m.has(p));

                        if (connected(hasT1, hasU) && connected(hasT2, hasV) && connected(hasT3, hasW)) {
                            r.state.currentSense += m.state.nominalCurrent || 6.5;
                        }
                    });
                } else {
                    if(m.state.running) { m.state.running = false; changed = true; }
                }
            } else {
                if(m.state.running) { m.state.running = false; changed = true; }
            }
        });

        // Disparo de Térmicos
        components.filter(c => c instanceof ThermalRelay).forEach(r => {
            if (r.state.tripEnabled && !r.state.tripped && r.state.currentSense > r.state.currentLimit) {
                r.state.tripped = true;
                changed = true;
                console.log(`Relé Térmico ${r.id} DISPARADO por sobrecarga (${r.state.currentSense}A > ${r.state.currentLimit}A)`);
            }
        });

        // Bobina Contactor
        components.filter(c => c instanceof Contactor).forEach(k => {
            const hasA1 = nodes[`${k.id}_A1`];
            const hasA2 = nodes[`${k.id}_A2`];
            
            let shouldEngage = false;
            if (hasA1 && hasA1.size > 0 && hasA2 && hasA2.size > 0) {
                const p1 = [...hasA1][0], p2 = [...hasA2][0];
                if (p1 !== p2) shouldEngage = true;
            }
            
            if (k.state.engaged !== shouldEngage) {
                k.state.engaged = shouldEngage;
                changed = true;
            }
        });


        // Luces (Requieren Diferencia de Potencial entre X1 y X2)
        components.filter(c => c instanceof PilotLight).forEach(p => {
            const hasX1 = nodes[`${p.id}_X1`];
            const hasX2 = nodes[`${p.id}_X2`];
            
            if (hasX1 && hasX1.size > 0 && hasX2 && hasX2.size > 0) {
                const p1 = [...hasX1][0];
                const p2 = [...hasX2][0];
                // Se enciende si hay diferencia de potencial (fases distintas o Fase-Neutro)
                if (p1 !== p2) p.state.on = true;
                else p.state.on = false;
            } else {
                p.state.on = false;
            }
        });
    }
}


// ================= RENDER =================

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.scale(scale, scale);

    // 0. Grid
    drawGrid(ctx);

    // 1. Cables
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    wires.forEach(w => {
        const p1 = w.from.getTerminal(w.fromId);
        const p2 = w.to.getTerminal(w.toId);
        
        if (p1 && p2) {
             const isSelected = (w === selectedWire);
             const cps = getWireControlPoints(w);

             // Base color or Selected Highlight
             ctx.strokeStyle = isSelected ? '#fbbf24' : (w.color || '#3b82f6'); 
             ctx.lineWidth = isSelected ? 6 : 4;
             
             // Glow effect for selection
             if (isSelected) {
                 ctx.shadowColor = '#fbbf24';
                 ctx.shadowBlur = 15;
             }

             // Curva Bezier con CPs
             if (w.isTriple) {
                 // Dibujar 3 líneas paralelas
                 const offsets = [-32, 0, 32];
                 ctx.strokeStyle = '#000000'; // Siempre negro para potencia trifásica
                 offsets.forEach(offset => {
                     ctx.beginPath();
                     ctx.moveTo(p1.x + offset, p1.y);
                     ctx.bezierCurveTo(cps.cp1.x + offset, cps.cp1.y, cps.cp2.x + offset, cps.cp2.y, p2.x + offset, p2.y);
                     ctx.stroke();
                 });
             } else {
                 ctx.beginPath();
                 ctx.moveTo(p1.x, p1.y);
                 ctx.bezierCurveTo(cps.cp1.x, cps.cp1.y, cps.cp2.x, cps.cp2.y, p2.x, p2.y);
                 ctx.stroke();
             }

             // Reset shadow
             ctx.shadowBlur = 0;

             // Mejora visual: Circulo en unión para tapar extremos cuadrados
             ctx.fillStyle = ctx.strokeStyle;
             ctx.beginPath(); ctx.arc(p1.x, p1.y, isSelected ? 3 : 2, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(p2.x, p2.y, isSelected ? 3 : 2, 0, Math.PI*2); ctx.fill();

             // Draw Handles if Selected
             if (isSelected) {
                 // Dashed lines to handles
                 ctx.lineWidth = 1;
                 ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                 ctx.setLineDash([3, 3]);
                 ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(cps.cp1.x, cps.cp1.y); ctx.stroke();
                 ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(cps.cp2.x, cps.cp2.y); ctx.stroke();
                 ctx.setLineDash([]);

                 // Handles
                 ctx.fillStyle = '#fbbf24';
                 ctx.beginPath(); ctx.arc(cps.cp1.x, cps.cp1.y, 5, 0, Math.PI*2); ctx.fill();
                 ctx.beginPath(); ctx.arc(cps.cp2.x, cps.cp2.y, 5, 0, Math.PI*2); ctx.fill();
                 ctx.strokeStyle = '#000';
                 ctx.lineWidth = 1;
                 ctx.strokeRect(cps.cp1.x-5, cps.cp1.y-5, 10, 10); // dummy stroke
             }
        }
    });

    // 2. Wire Creation Line
    if (wireStartObj) {
        ctx.strokeStyle = currentWireColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        const p1 = wireStartObj.component.getTerminal(wireStartObj.terminalId);
        ctx.moveTo(p1.x, p1.y);
        
        // Simple curve draft
        const cp1x = p1.x;
        const cp1y = Math.max(p1.y, mousePos.y) + 40;
        const cp2x = mousePos.x;
        const cp2y = cp1y;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, mousePos.x, mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 3. Componentes
    components.forEach(c => {
        if (c === selectedComponent) {
            ctx.save();
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            // Draw a rounded rect around the component
            ctx.beginPath();
            ctx.roundRect(c.x - 5, c.y - 5, c.width + 10, c.height + 10, 8);
            ctx.stroke();
            ctx.restore();
        }
        c.draw(ctx);
    });

    ctx.restore();
}

// ================= UTILIDADES =================

// Hit test simple para cables (Bezier Curve distance approximation)
// Verifica si el punto (mx, my) está cerca de la curva definida por p1, p2
function isMouseOverWire(mx, my, wire) {
    const p1 = wire.from.getTerminal(wire.fromId);
    const p2 = wire.to.getTerminal(wire.toId);
    if (!p1 || !p2) return false;

    const cps = getWireControlPoints(wire);
    if (!cps) return false;

    const cp1 = cps.cp1;
    const cp2 = cps.cp2;

    // Hight Precision Sampling (50 points)
    // Reduce false negatives on sharp curves
    const steps = 50;
    const threshold = 8; // detection radius

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const it = 1 - t;
        // Bezier Cubic Formula
        const x = (it*it*it)*p1.x + 3*(it*it)*t*cp1.x + 3*it*(t*t)*cp2.x + (t*t*t)*p2.x;
        const y = (it*it*it)*p1.y + 3*(it*it)*t*cp1.y + 3*it*(t*t)*cp2.y + (t*t*t)*p2.y;
        
        if (Math.hypot(mx - x, my - y) < threshold) return true;
    }
    return false;
}

function drawGrid(ctx) {
    const w = 2400;
    const h = 1600;
    const step = 20;
    
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Vertical
    for(let x=0; x<=w; x+=step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
    }
    // Horizontal
    for(let y=0; y<=h; y+=step) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
    }
    ctx.stroke();
}

function snapToGrid(val, gridSize = 20) {
    return Math.round(val / gridSize) * gridSize;
}

function resizeCanvas() {
    const parent = canvas.parentElement;
    if (parent) {
        // Área lógica base 2400x1600. Escalamos el canvas físicamente según el zoom
        // para que siempre haya espacio para los elementos lógicos y el scroll funcione
        canvas.width = Math.max(parent.clientWidth, 2400 * scale);
        canvas.height = Math.max(parent.clientHeight || 600, 1600 * scale); 
        draw(); 
    }
}

// ================= PERSISTENCIA (SAVE/LOAD) =================

function serializeCircuit() {
    return JSON.stringify({
        version: "1.0",
        components: components.map(c => c.serialize()),
        wires: wires.map(w => ({
            from: w.from.id,
            fromId: w.fromId,
            to: w.to.id,
            toId: w.toId,
            color: w.color,
            isTriple: w.isTriple,
            cp1: w.customCP1,
            cp2: w.customCP2
        }))
    });
}

function saveToLocalStorage() {
    const data = serializeCircuit();
    localStorage.setItem('saved_circuit', data);
    alert('Circuito guardado en el navegador.');
}

function downloadCircuit() {
    const data = serializeCircuit();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuito_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function loadFromLocalStorage() {
    const data = localStorage.getItem('saved_circuit');
    if (data) deserializeCircuit(data);
    else alert('No hay circuitos guardados localmente.');
}

function deserializeCircuit(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        components = [];
        wires = [];
        selectedComponent = null;
        selectedWire = null;

        // 1. Recrear Componentes
        data.components.forEach(cData => {
            addComponent(cData.type, cData.x + 50, cData.y + 50); // addComponent offsets from center
            const c = components[components.length - 1];
            // Overwrite specific props
            c.id = cData.id;
            c.x = cData.x;
            c.y = cData.y;
            if (cData.state) Object.assign(c.state, cData.state);
        });

        // 2. Recrear Cables
        data.wires.forEach(wData => {
            const fromComp = components.find(c => c.id === wData.from);
            const toComp = components.find(c => c.id === wData.to);

            if (fromComp && toComp) {
                wires.push({
                    from: fromComp,
                    fromId: wData.fromId,
                    to: toComp,
                    toId: wData.toId,
                    color: wData.color,
                    isTriple: wData.isTriple,
                    customCP1: wData.cp1,
                    customCP2: wData.cp2
                });
            }
        });

        draw();
        console.log("Circuito cargado con éxito.");
    } catch (err) {
        console.error("Error al cargar circuito:", err);
        alert("Error al procesar el archivo del circuito.");
    }
}

function triggerFileUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => deserializeCircuit(event.target.result);
        reader.readAsText(file);
    };
    input.click();
}

window.removeEventListener('resize', resizeCanvas); 
window.addEventListener('resize', resizeCanvas);
document.addEventListener('DOMContentLoaded', init);
