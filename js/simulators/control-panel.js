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
let activeMultimeter = null; // Instancia global del tester

// Audio y Deshacer/Rehacer
let audioUnlocked = false;
let undoStack = [];
let redoStack = [];
const MAX_HISTORY = 50;

class MotorAudioManager {
    constructor() {
        this.audioCtx = null;
        this.masterGain = null;
        this.oscillators = [];
        this.isPlaying = false;
        this.targetVolume = 0;
        this.pendingStart = false;
    }

    init() {
        if (this.audioCtx) return true;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0;
            this.masterGain.connect(this.audioCtx.destination);
            console.log('Audio context created, state:', this.audioCtx.state);
            return true;
        } catch(e) {
            console.warn('Web Audio API not supported:', e);
            return false;
        }
    }

    // Must be called from a user interaction event (click)
    unlock() {
        if (audioUnlocked) return;
        
        if (!this.audioCtx) {
            if (!this.init()) return;
        }
        
        // Resume suspended context
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().then(() => {
                console.log('Audio context resumed successfully');
                audioUnlocked = true;
                // If there was a pending start, do it now
                if (this.pendingStart) {
                    this.pendingStart = false;
                    this.start();
                }
            }).catch(e => console.warn('Failed to resume audio:', e));
        } else {
            audioUnlocked = true;
            console.log('Audio already unlocked');
        }
    }

    start() {
        if (!audioUnlocked) {
            this.pendingStart = true;
            console.log('Audio not unlocked yet, pending start...');
            return;
        }
        
        if (!this.audioCtx) {
            if (!this.init()) return;
        }
        
        if (this.isPlaying) return;

        // Resume context if needed
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        // Base frequency (60Hz - power line frequency)
        const baseFreq = 60;
        
        // Create layered oscillators for realistic motor sound
        const frequencies = [
            { freq: baseFreq, gain: 0.4, type: 'sine' },           // Stronger base hum (60Hz)
            { freq: baseFreq * 2, gain: 0.3, type: 'triangle' },   // Strong harmonics (120Hz)
            { freq: baseFreq * 3, gain: 0.15, type: 'sine' },      // 180Hz
            { freq: baseFreq * 4, gain: 0.12, type: 'sawtooth' },  // 240Hz - adds mechanical "bite"
            { freq: baseFreq * 6, gain: 0.08, type: 'sine' },      // 360Hz
            { freq: baseFreq * 8, gain: 0.05, type: 'sine' },      // 480Hz - high whine
            { freq: 30, gain: 0.2, type: 'sine' }                  // Sub-harmonic rumble (mechanical rotation)
        ];

        frequencies.forEach(config => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            osc.type = config.type;
            osc.frequency.value = config.freq;
            gain.gain.value = config.gain;
            
            // Add slight modulation for vibration effect
            const lfo = this.audioCtx.createOscillator();
            const lfoGain = this.audioCtx.createGain();
            lfo.frequency.value = 2 + Math.random(); // 2-3 Hz wobble
            lfoGain.gain.value = config.freq * 0.02; // Slight pitch variation
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            
            this.oscillators.push({ osc, gain, lfo, lfoGain });
        });

        // Fade in - Increased volume to 0.7
        this.targetVolume = 0.7;
        this.isPlaying = true;
        this.fadeToTarget();
        console.log('Motor audio started');
    }

    stop() {
        if (!this.isPlaying) return;
        this.pendingStart = false;
        this.targetVolume = 0;
        this.fadeToTarget(() => {
            this.oscillators.forEach(({ osc, lfo }) => {
                try { osc.stop(); lfo.stop(); } catch(e) {}
            });
            this.oscillators = [];
            this.isPlaying = false;
            console.log('Motor audio stopped');
        });
    }

    fadeToTarget(callback) {
        if (!this.masterGain || !this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(this.targetVolume, now + 0.5);
        
        if (callback) {
            setTimeout(callback, 550);
        }
    }

    // Call this from the main loop to sync with motor state
    update(anyMotorRunning) {
        if (anyMotorRunning && !this.isPlaying) {
            this.start();
        } else if (!anyMotorRunning && this.isPlaying) {
            this.stop();
        }
    }
}

// Global audio manager instance
const motorAudio = new MotorAudioManager();

// Unlock audio on first user interaction
document.addEventListener('click', () => motorAudio.unlock(), { once: true });
document.addEventListener('touchstart', () => motorAudio.unlock(), { once: true });




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
    'pilot-amber': 'img/simulators/control-panel/pilot-ambar.png',
    'timer': 'img/simulators/control-panel/timer.png',
    'motor6t': 'img/simulators/control-panel/motor6t.png'
};

// ... (Rest of file) ...


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
        } else {
            // Fallback
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#0f172a';
            ctx.fillText(this.type, this.x+10, this.y+20);
        }

        // 2. Terminales
        this.drawTerminals(ctx);
    }

    drawTerminals(ctx) {
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            // Verificar tensión para feedback visual en terminales
            const nodes = window.lastSolvedNodes || {};
            const key = `${this.id}_${id}`;
            const energized = isSimulating && nodes[key] && nodes[key].size > 0;

            ctx.beginPath();
            ctx.arc(tx, ty, energized ? 7 : 5, 0, Math.PI*2);
            ctx.fillStyle = energized ? '#fcd34d' : '#fbbf24'; 
            if (energized) {
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 15;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = energized ? '#fff' : '#78350f';
            ctx.lineWidth = energized ? 2 : 1;
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
        this.state = { voltage: 480 }; // Default normalized voltage
        // Estandarizado a 32px de separación (20, 52, 84, 116)
        this.terminals = {
            'L1': {x: 20, y: 50, label: 'L1'}, 
            'L2': {x: 52, y: 50, label: 'L2'}, 
            'L3': {x: 84, y: 50, label: 'L3'},
            'N':  {x: 116, y: 50, label: 'N'}
        };
    }
    
    draw(ctx) {
        // Dibujo vectorizado para Fuente
        ctx.fillStyle = '#334155';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#94a3b8';
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('3Φ', this.x + this.width/2, this.y + 25);
        
        ctx.font = 'bold 11px Inter';
        ctx.fillStyle = '#fff';
        // Mostrar Voltaje y Frecuencia (60Hz fijo)
        ctx.fillText(`${this.state.voltage}V - 60Hz`, this.x + this.width/2, this.y + 42);

        // Terminales (usando el método modular para evitar overpaint)
        this.drawTerminals(ctx);

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
        this.state = { voltage: 120 }; // Default normalized voltage
        this.terminals = {
            'L': {x: 52, y: 50, label: 'L'},
            'N': {x: 20, y: 50, label: 'N'}
        };
    }
    
    draw(ctx) {
        // Dibujo vectorizado para Fuente Monofásica
        ctx.fillStyle = '#334155';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#94a3b8';
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('1Φ', this.x + this.width/2, this.y + 25);
        
        ctx.font = 'bold 11px Inter';
        ctx.fillStyle = '#fff';
        // Mostrar Voltaje y Frecuencia (60Hz fijo)
        ctx.fillText(`${this.state.voltage}V - 60Hz`, this.x + this.width/2, this.y + 42);

        // Terminales usando el método modular con colores personalizados
        this.drawTerminals(ctx);
    }

    drawTerminals(ctx) {
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            const nodes = window.lastSolvedNodes || {};
            const key = `${this.id}_${id}`;
            const energized = isSimulating && nodes[key] && nodes[key].size > 0;

            // Determinar color base (Regla del usuario)
            let color = '#fbbf24'; // Defecto
            if (this.state.voltage === 120) {
                if (id === 'N') color = '#ffffff'; // Neutro Blanco
                if (id === 'L') color = '#000000'; // Fase Negro
            } else {
                // 208V o 240V -> Ambas son fases (Negro)
                color = '#000000';
            }

            ctx.beginPath();
            ctx.arc(tx, ty, energized ? 7 : 6, 0, Math.PI * 2);
            ctx.fillStyle = energized ? '#fcd34d' : color; 
            ctx.fill();
            
            // Borde del terminal
            ctx.strokeStyle = energized ? '#fff' : (color === '#ffffff' ? '#94a3b8' : '#78350f');
            ctx.lineWidth = energized ? 2 : 1;
            ctx.stroke();

            if (t.label) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px Inter';
                ctx.textAlign = 'center';
                const ly = ty + 18; 
                ctx.fillText(t.label, tx, ly);
            }
        }
    }
}

class Multimeter {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 120;
        this.probes = {
            red: { x: x - 50, y: y + 150, target: null },
            black: { x: x + 130, y: y + 150, target: null }
        };
        // Clamp Meter (Current Probe)
        this.clamp = { x: x + 40, y: y + 150, target: null };
        
        this.draggingProbe = null; // 'red', 'black', or 'clamp'
        this.draggingBody = false;
        this.offX = 0;
        this.offY = 0;
        this.mode = 'VAC'; // 'VAC' or 'AAC'
        this.value = 0;
        this.unit = 'V';
    }

    update() {
        // Probe & Clamp Stability: Follow targets if they exist
        const activeProbes = this.mode === 'VAC' ? ['red', 'black'] : ['clamp'];
        activeProbes.forEach(key => {
            const p = key === 'clamp' ? this.clamp : this.probes[key];
            if (p.target && p.target.component) {
                const c = p.target.component;
                const t = c.terminals[p.target.terminalId];
                if (t) {
                    p.x = c.x + t.x;
                    p.y = c.y + t.y;
                }
            }
        });

        if (!isSimulating) {
            this.value = 0;
            return;
        }

        const nodes = window.lastSolvedNodes || {};
        
        // Función para obtener fases de un objetivo (clic point)
        const getPhases = (probe) => {
            if (probe.target) {
                const key = `${probe.target.component.id}_${probe.target.terminalId}`;
                return nodes[key] || new Set();
            }
            return new Set();
        };

        if (this.mode === 'VAC') {
            const redPhases = getPhases(this.probes.red);
            const blackPhases = getPhases(this.probes.black);

            if (redPhases.size === 0 || blackPhases.size === 0) {
                this.value = 0;
                return;
            }
            this.value = getVoltage(redPhases, blackPhases);
            this.unit = 'V';
        } else if (this.mode === 'AAC') {
            // Current measurement: logic based on clamp position
            this.value = this.calculateCurrent(this.clamp.target);
            this.unit = 'A';
        }
    }

    calculateCurrent(target) {
        if (!target || !isSimulating) return 0;

        // Start tracing from the target component/terminal
        const visited = new Set();
        const activeMotors = new Set();
        
        // Find all motors that are fed from this point
        const trace = (compId, termId) => {
            const key = `${compId}_${termId}`;
            if (visited.has(key)) return;
            visited.add(key);

            const comp = components.find(c => c.id === compId);
            if (!comp) return;

            // If it's a motor and it's running, add it
            if ((comp instanceof Motor || comp instanceof Motor6T) && comp.state.running) {
                activeMotors.add(comp);
                return; // Reached a load
            }

            // Propagate through the component logic
            // 1. Through internal connectivity
            const getLinkedTerms = (c, tid) => {
                // Standard logic for Breakers, Contactors, Thermal Relays
                if (c instanceof Breaker && c.state.closed) {
                    if (['L1','L2','L3'].includes(tid)) return [['T1','T2','T3'][['L1','L2','L3'].indexOf(tid)]];
                }
                if (c instanceof Contactor && c.state.engaged) {
                    if (['L1','L2','L3'].includes(tid)) return [['T1','T2','T3'][['L1','L2','L3'].indexOf(tid)]];
                }
                if (c instanceof ThermalRelay && !c.state.tripped) {
                    if (['L1','L2','L3'].includes(tid)) return [['T1','T2','T3'][['L1','L2','L3'].indexOf(tid)]];
                }
                // Motor terminals are inputs, they don't propagate further as "series" tracing for current
                return [];
            };

            const linked = getLinkedTerms(comp, termId);
            linked.forEach(nextTerm => trace(compId, nextTerm));

            // 2. Through wires (downstream)
            wires.forEach(w => {
                if (w.from === comp && w.fromId === termId) {
                    trace(w.to.id, w.toId);
                } else if (w.to === comp && w.toId === termId) {
                    trace(w.from.id, w.fromId);
                }
            });
        };

        trace(target.component.id, target.terminalId);

        let totalCurrent = 0;
        activeMotors.forEach(m => {
            totalCurrent += m.state.nominalCurrent || 6.5;
        });

        return Math.round(totalCurrent * 10) / 10;
    }

    draw(ctx) {
        // Dibujar cables (Curvas de Bezier)
        const drawCable = (startX, startY, endX, endY, color) => {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.bezierCurveTo(
                startX, startY + 50,
                endX, endY + 50,
                endX, endY
            );
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.stroke();
            // Efecto de brillo en el cable
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        };

        if (this.mode === 'VAC') {
            drawCable(this.x + 20, this.y + this.height - 10, this.probes.black.x, this.probes.black.y, '#333');
            drawCable(this.x + 60, this.y + this.height - 10, this.probes.red.x, this.probes.red.y, '#b91c1c');
        } else {
            // Un solo cable para la pinza (o representación de par trenzado)
            drawCable(this.x + 40, this.y + this.height - 10, this.clamp.x, this.clamp.y, '#475569');
        }

        // Cuerpo del Tester
        ctx.fillStyle = this.mode === 'VAC' ? '#ef4444' : '#f59e0b'; // Rojo para Volt, Ambar para Amp
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = this.mode === 'VAC' ? '#991b1b' : '#b45309';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pantalla (Digital)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(this.x + 10, this.y + 15, this.width - 20, 35);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(this.x + 10, this.y + 15, this.width - 20, 35);

        // Valor digital
        ctx.fillStyle = '#4ade80';
        ctx.font = '22px "Courier New"';
        ctx.textAlign = 'right';
        const displayValue = isSimulating ? this.value.toString().padStart(3, ' ') : '0.0';
        ctx.fillText(displayValue, this.x + this.width - 25, this.y + 40);
        ctx.font = '10px Inter';
        ctx.fillText(this.unit, this.x + this.width - 15, this.y + 40);

        // Perilla (Selector) - Girar según modo
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + 80);
        if (this.mode === 'AAC') ctx.rotate(Math.PI / 4);
        else ctx.rotate(-Math.PI / 4);
        
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.stroke();
        
        // Marca de la perilla
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-2, -15, 4, 10);
        ctx.restore();

        // Puertos de entrada
        const drawPort = (px, py, pColor) => {
            ctx.fillStyle = pColor;
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        };
        drawPort(this.x + 20, this.y + this.height - 15, '#333'); // COM
        drawPort(this.x + 60, this.y + this.height - 15, '#b91c1c'); // V

        // Dibujar Puntas o Pinza
        if (this.mode === 'VAC') {
            const drawProbe = (px, py, pColor) => {
                ctx.fillStyle = pColor;
                ctx.fillRect(px - 5, py, 10, 40);
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(px - 1, py - 10, 2, 10);
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(px - 3, py + 5, 2, 30);
            };
            drawProbe(this.probes.black.x, this.probes.black.y, '#333');
            drawProbe(this.probes.red.x, this.probes.red.y, '#b91c1c');
        } else {
            // Dibujar Pinza Amperimétrica (Clamp)
            const cx = this.clamp.x;
            const cy = this.clamp.y;
            
            ctx.save();
            ctx.translate(cx, cy);
            
            // Mango de la pinza
            ctx.fillStyle = '#f59e0b'; // Ambar
            ctx.roundRect(-10, 10, 20, 50, 5);
            ctx.fill();
            
            // Mandíbulas (Abiertas/Cerradas según target)
            const gap = this.clamp.target ? 2 : 15;
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            
            // Mandíbula izquierda
            ctx.beginPath();
            ctx.arc(-10 - gap/2, 0, 15, Math.PI * 0.5, Math.PI * 1.5);
            ctx.stroke();
            
            // Mandíbula derecha
            ctx.beginPath();
            ctx.arc(10 + gap/2, 0, 15, Math.PI * 1.5, Math.PI * 2.5);
            ctx.stroke();
            
            // Gatillo
            ctx.fillStyle = '#b45309';
            ctx.beginPath();
            ctx.moveTo(-10, 25);
            ctx.lineTo(-20, 35);
            ctx.lineTo(-10, 45);
            ctx.fill();
            
            ctx.restore();
        }
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
        // Dibuja imagen base si existe
        if (assets[this.type]) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets[this.type], this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        } else {
            // Fallback vectorial
            ctx.fillStyle = '#475569';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // Indicador LED de estado (pequeño, no cubre la imagen)
        const ledX = this.x + this.width - 15;
        const ledY = this.y + 15;
        ctx.fillStyle = this.state.closed ? '#22c55e' : '#ef4444';
        ctx.shadowColor = this.state.closed ? '#22c55e' : '#ef4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ledX, ledY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Terminales
        this.drawTerminals(ctx);
    }
    
    drawTerminals(ctx) {
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            // Halo / Base Oro
            ctx.beginPath();
            ctx.arc(tx, ty, 5, 0, Math.PI*2);
            ctx.fillStyle = '#fbbf24'; 
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Etiqueta
            if (t.label) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px Inter';
                ctx.textAlign = 'center';
                // Lower label to avoid overlap
                const ly = ty + 18; 
                if(ty < this.y + 20) {
                     // Top terminals (Input) still above
                     ctx.fillText(t.label, tx, ty - 10);
                } else {
                     // Side/Bottom terminals below
                     ctx.fillText(t.label, tx, ly);
                }
            }
        }
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
            // Bobina A1/A2 en los bordes para visibilidad
            'A1': {x: 0, y: 60, label: 'A1'}, 'A2': {x: 100, y: 60, label: 'A2'},
            'NO13': {x: 0, y: 40, label: '13'}, 'NO14': {x: 100, y: 40, label: '14'},
            'NC21': {x: 0, y: 80, label: '21'}, 'NC22': {x: 100, y: 80, label: '22'}
        };
    }
    draw(ctx) {
        // Dibuja imagen base si existe
        if (assets[this.type]) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets[this.type], this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#475569';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // Indicador LED de estado (pequeño LED en esquina)
        const ledX = this.x + this.width - 15;
        const ledY = this.y + 15;
        ctx.fillStyle = this.state.engaged ? '#22c55e' : '#64748b';
        ctx.shadowColor = this.state.engaged ? '#22c55e' : 'transparent';
        ctx.shadowBlur = this.state.engaged ? 12 : 0;
        ctx.beginPath();
        ctx.arc(ledX, ledY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Terminales
        this.drawTerminals(ctx);
    }
    
    drawTerminals(ctx) {
        // Misma lógica visual dorada para Contactores
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            ctx.beginPath();
            ctx.arc(tx, ty, 5, 0, Math.PI*2);
            ctx.fillStyle = '#fbbf24'; 
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (t.label) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 9px Inter';
                ctx.textAlign = 'center';
                let ly = ty + 15;
                if(ty < this.y + 20) ly = ty - 8; // Top terminals
                if(id.startsWith('A')) ly = ty + 18; // Coil side text (Moved down)
                
                ctx.fillText(t.label, tx, ly);
            }
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
        // Dibuja imagen base si existe
        if (assets[this.type]) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets[this.type], this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#475569';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // Indicador de disparo (solo borde rojo y LED, no cubre la imagen)
        if (this.state.tripped) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
            
            // LED rojo parpadeante (simulado con glow)
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(this.x + this.width - 15, this.y + 15, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        // Terminales
        this.drawTerminals(ctx);
    }
    
    drawTerminals(ctx) {
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            ctx.beginPath();
            ctx.arc(tx, ty, 5, 0, Math.PI*2);
            ctx.fillStyle = '#fbbf24'; 
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Etiquetas (Lowered)
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(id, tx, ty + 18);
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
            hp: 5,
            voltage: 480,
            pf: 0.86,
            eff: 90,
            rpm: 1800,
            nominalCurrent: 6.5 // Default baseline
        }; 
        this.terminals = {
            'U': {x: 20, y: 35, label: 'U'}, 
            'V': {x: 52, y: 35, label: 'V'}, 
            'W': {x: 84, y: 35, label: 'W'}
        };
        this.calculateFLA();
    }

    calculateFLA() {
        // formula: FLA = (HP * 746) / (V * sqrt(3) * PF * EFF)
        const hpToWatts = this.state.hp * 746;
        const root3 = Math.sqrt(3);
        const pf = this.state.pf;
        const eff = this.state.eff / 100;
        const v = this.state.voltage;
        
        const fla = hpToWatts / (v * root3 * pf * eff);
        this.state.nominalCurrent = Math.round(fla * 10) / 10;
        return this.state.nominalCurrent;
    }
    draw(ctx) {
        // Dibuja imagen base si existe
        if (assets[this.type]) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets[this.type], this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(this.x + 38, this.y + 110, 60, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Indicador de estado (LED en esquina)
        const ledX = this.x + this.width - 20;
        const ledY = this.y + 20;
        ctx.fillStyle = this.state.running ? '#22c55e' : '#64748b';
        ctx.shadowColor = this.state.running ? '#22c55e' : 'transparent';
        ctx.shadowBlur = this.state.running ? 12 : 0;
        ctx.beginPath();
        ctx.arc(ledX, ledY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Animación de rotor mejorada (solo cuando está corriendo)
        if (this.state.running) {
            const centerX = this.x + 38; // Shifted even further left-down for axis alignment
            const centerY = this.y + 110;
            const rotorRadius = 35;
            const numSegments = 8;
            
            // Actualizar ángulo
            this.state.angle += 0.08 * this.state.direction;
            
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(this.state.angle);
            
            // Dibujar segmentos del rotor con efecto de brillo
            for (let i = 0; i < numSegments; i++) {
                const segAngle = (i / numSegments) * Math.PI * 2;
                const nextAngle = ((i + 1) / numSegments) * Math.PI * 2;
                
                // Alternar colores para efecto visual
                const brightness = 0.4 + 0.3 * Math.sin(segAngle + this.state.angle * 2);
                ctx.fillStyle = i % 2 === 0 
                    ? `rgba(34, 197, 94, ${brightness})` 
                    : `rgba(59, 130, 246, ${brightness})`;
                
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, rotorRadius, segAngle, nextAngle);
                ctx.closePath();
                ctx.fill();
            }
            
            // Círculo central (eje)
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Punto de referencia de dirección
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(rotorRadius - 8, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            
            // Efecto de glow alrededor del rotor
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, rotorRadius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.restore();
            
            // Indicador de dirección (pequeña flecha)
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.state.direction > 0 ? '⟳' : '⟲', this.x + 20, this.y + 130);

            // Placa de características (Nameplate info)
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'left';
            ctx.fillText(`${this.state.hp}HP ${this.state.voltage}V`, this.x + 100, this.y + 110);
            ctx.fillText(`${this.state.nominalCurrent}A ${this.state.rpm}RPM`, this.x + 100, this.y + 125);
        }
        
        // Terminales
        this.drawTerminals(ctx);
    }

    
    drawTerminals(ctx) {
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            ctx.beginPath();
            ctx.arc(tx, ty, 5, 0, Math.PI*2);
            ctx.fillStyle = '#fbbf24'; 
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (t.label) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(t.label, tx, ty + 15); // Label correction
            }
        }
    }
}



class PushButton extends Component {
    constructor(type, x, y) {
        super(type, x, y, 60, 60);
        this.terminals = { '1': {x: 0, y: 50}, '2': {x: 60, y: 50} };
        this.state = { pressed: false };
    }
    draw(ctx) {
        // Si hay imagen cargada, usar la imagen base y solo agregar efectos de presión
        if (assets[this.type]) {
            // Sombra para dar profundidad
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets[this.type], this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
            
            // Efecto de presión: oscurecer levemente el botón
            if (this.state.pressed) {
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.arc(this.x + 30, this.y + 25, 18, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Fallback: dibujar botón vectorial si no hay imagen
            const btnColor = this.type.includes('green') ? '#22c55e' : '#ef4444';
            const pressOffset = this.state.pressed ? 2 : 0;
            
            // Casing ring
            ctx.beginPath(); ctx.arc(this.x+30, this.y+25, 22, 0, Math.PI*2); 
            ctx.fillStyle = '#cbd5e1'; ctx.fill(); ctx.stroke();

            // Button itself
            ctx.beginPath(); ctx.arc(this.x+30, this.y+25 + pressOffset, 18, 0, Math.PI*2);
            const grad = ctx.createRadialGradient(this.x+30-5, this.y+25+pressOffset-5, 2, this.x+30, this.y+25+pressOffset, 18);
            grad.addColorStop(0, this.state.pressed ? '#334155' : '#fff');
            grad.addColorStop(1, this.state.pressed ? '#0f172a' : btnColor);
            ctx.fillStyle = grad;
            ctx.fill();
            
            if (this.state.pressed) {
               ctx.strokeStyle = 'rgba(0,0,0,0.5)';
               ctx.lineWidth = 2;
               ctx.stroke();
            }
        }
        
        // Dibujar terminales (heredado de Component pero llamamos directamente para control)
        this.drawTerminals(ctx);
    }
    
    drawTerminals(ctx) {
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            // Gold Standard
            ctx.beginPath();
            ctx.arc(tx, ty, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24'; 
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Label Lowered
            ctx.fillStyle = '#fff'; // White text
            ctx.shadowColor = '#000'; ctx.shadowBlur = 4; // Shadow for readability
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(id, tx, ty + 18);
            ctx.shadowBlur = 0;
        }
    }
}

class PilotLight extends Component {
    constructor(type, x, y) {
        super(type, x, y, 50, 50);
        this.terminals = { 'X1': {x: 0, y: 45}, 'X2': {x: 50, y: 45} };
        this.state = { on: false };
    }
    draw(ctx) {
        // 1. Dibujar imagen base si existe
        if (assets[this.type]) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets[this.type], this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        } else {
            // Fallback: círculo gris
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.arc(this.x + 25, this.y + 25, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#64748b';
            ctx.stroke();
        }
        
        // 2. Efecto de encendido (glow)
        if(this.state.on) {
            const color = this.type.includes('green') ? '#22c55e' : 
                         (this.type.includes('amber') ? '#f59e0b' : '#ef4444');
            ctx.shadowColor = color; 
            ctx.shadowBlur = 25;
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7;
            ctx.beginPath(); 
            ctx.arc(this.x + 25, this.y + 25, 14, 0, Math.PI * 2); 
            ctx.fill();
            ctx.globalAlpha = 1.0; 
            ctx.shadowBlur = 0;
        }
        
        // 3. Terminales (Gold Standard + Edges)
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            ctx.beginPath();
            ctx.arc(tx, ty, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(id, tx, ty + 18);
            ctx.shadowBlur = 0;
        }
    }
}

class Selector extends Component {
    constructor(x, y) {
        super('selector', x, y, 60, 60);
        this.terminals = {
            '13': {x: 0, y: 10, label: '13'}, '14': {x: 60, y: 10, label: '14'},
            '23': {x: 0, y: 50, label: '23'}, '24': {x: 60, y: 50, label: '24'}
        };
        // Position: -1: Left (Man), 0: Center (Off), 1: Right (Auto)
        this.state = { position: 0 }; 
    }
    
    toggle() {
        // Cycle: 0 -> 1 -> -1 -> 0
        if (this.state.position === 0) this.state.position = 1;
        else if (this.state.position === 1) this.state.position = -1;
        else this.state.position = 0;
    }
    
    draw(ctx) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Knob
        ctx.save();
        ctx.translate(this.x + 30, this.y + 30);
        const rotation = this.state.position * (Math.PI / 4); // +/- 45 deg
        ctx.rotate(rotation);
        
        // Knob Shape
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 20, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-1, -15, 2, 10); // Indicator line
        
        ctx.restore();
        
        // Labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('M', this.x + 10, this.y + 55);
        ctx.fillText('0', this.x + 30, this.y + 55);
        ctx.fillText('A', this.x + 50, this.y + 55);
        
        this.drawTerminals(ctx);
    }

    drawTerminals(ctx) {
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            ctx.beginPath();
            ctx.arc(tx, ty, 5, 0, Math.PI*2);
            ctx.fillStyle = '#fbbf24'; 
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (t.label) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 9px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(t.label, tx, ty + 18);
            }
        }
    }
}

class TimerRelay extends Component {
    constructor(x, y) {
        super('timer', x, y, 60, 100);
        this.terminals = {
            'A1': {x: 0, y: 10}, 'A2': {x: 0, y: 90},
            'NC55': {x: 60, y: 30}, 'NC56': {x: 60, y: 50}, 
            'NO67': {x: 60, y: 70}, 'NO68': {x: 60, y: 90}
        };
        this.state = { 
            timeElapsed: 0, 
            done: false, 
            active: false,
            setting: 5000 // 5 seconds
        };
    }
    
    draw(ctx) {
        if (assets['timer']) {
             ctx.save();
             ctx.shadowColor = 'rgba(0,0,0,0.3)';
             ctx.shadowBlur = 10;
             ctx.drawImage(assets['timer'], this.x, this.y, this.width, this.height);
             ctx.shadowBlur = 0;
             ctx.restore();
        } else {
            // Body
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Dial / Face
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.arc(this.x + 30, this.y + 30, 20, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Hand (Animated) - Always draw over
        if (this.state.active) {
            const angle = -Math.PI/2 + (this.state.timeElapsed / this.state.setting) * (2*Math.PI);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + 30, this.y + 30);
            ctx.lineTo(this.x + 30 + 15 * Math.cos(angle), this.y + 30 + 15 * Math.sin(angle));
            ctx.stroke();
        }

        this.drawTerminals(ctx);
    }

    drawTerminals(ctx) {
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            ctx.beginPath();
            ctx.arc(tx, ty, 5, 0, Math.PI*2);
            ctx.fillStyle = '#fbbf24'; 
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (id.includes('A')) {
                // Coil terminals
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 9px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(id, tx + 12, ty + 3); 
            } else if (t.label || id) {
                 // Side terminals
                 ctx.fillStyle = '#fff';
                 ctx.font = 'bold 9px Inter';
                 ctx.textAlign = 'center';
                 ctx.fillText(id, tx, ty + 18);
            }
        }
    }
}

class Motor6T extends Component {
    constructor(x, y) {
        super('motor6t', x, y, 160, 160);
        // Standard IEC Terminal Layout for 6-post block
        // W2 U2 V2 (Bottom)
        // U1 V1 W1 (Top)
        this.terminals = {
            'U1': {x: 40, y: 30, label: 'U1'}, 'V1': {x: 80, y: 30, label: 'V1'}, 'W1': {x: 120, y: 30, label: 'W1'},
            'W2': {x: 40, y: 130, label: 'W2'}, 'U2': {x: 80, y: 130, label: 'U2'}, 'V2': {x: 120, y: 130, label: 'V2'}
        };
        this.state = { 
            running: false, 
            direction: 1, 
            connection: 'None',
            hp: 7.5,
            voltage: 480,
            pf: 0.86,
            eff: 90,
            rpm: 1750,
            nominalCurrent: 10.0
        };
        this.calculateFLA();
    }

    calculateFLA() {
        const hpToWatts = this.state.hp * 746;
        const root3 = Math.sqrt(3);
        const pf = this.state.pf;
        const eff = this.state.eff / 100;
        const v = this.state.voltage;
        
        const fla = hpToWatts / (v * root3 * pf * eff);
        this.state.nominalCurrent = Math.round(fla * 10) / 10;
        return this.state.nominalCurrent;
    }
    draw(ctx) {
        if (assets['motor6t']) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets['motor6t'], this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        } else {
             // Fallback
             ctx.fillStyle = '#ea580c'; // Orange
             ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // Status LED (Top Right)
        const ledX = this.x + this.width - 20;
        const ledY = this.y + 20;
        ctx.fillStyle = this.state.running ? '#22c55e' : '#64748b';
        ctx.shadowColor = this.state.running ? '#22c55e' : 'transparent';
        ctx.shadowBlur = this.state.running ? 12 : 0;
        ctx.beginPath();
        ctx.arc(ledX, ledY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Animación de rotor mejorada
        if (this.state.running) {
            // Inicializar ángulo si no existe
            if (this.state.angle === undefined) this.state.angle = 0;
            
            const centerX = this.x + 38; // Shifted even further left-down for axis alignment
            const centerY = this.y + 90;
            const rotorRadius = 30;
            const numSegments = 8;
            
            // Actualizar ángulo
            this.state.angle += 0.08 * this.state.direction;
            
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(this.state.angle);
            
            // Dibujar segmentos del rotor
            for (let i = 0; i < numSegments; i++) {
                const segAngle = (i / numSegments) * Math.PI * 2;
                const nextAngle = ((i + 1) / numSegments) * Math.PI * 2;
                
                const brightness = 0.4 + 0.3 * Math.sin(segAngle + this.state.angle * 2);
                // Usar colores según tipo de conexión
                const color1 = this.state.connection === 'Star' ? 'rgba(234, 179, 8' : 'rgba(34, 197, 94';
                const color2 = this.state.connection === 'Star' ? 'rgba(251, 191, 36' : 'rgba(59, 130, 246';
                ctx.fillStyle = i % 2 === 0 
                    ? `${color1}, ${brightness})` 
                    : `${color2}, ${brightness})`;
                
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, rotorRadius, segAngle, nextAngle);
                ctx.closePath();
                ctx.fill();
            }
            
            // Círculo central (eje)
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Punto de referencia
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(rotorRadius - 6, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            
            // Efecto de glow
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, rotorRadius + 4, 0, Math.PI * 2);
            const glowColor = this.state.connection === 'Star' ? '#eab308' : '#22c55e';
            ctx.strokeStyle = glowColor + '66';
            ctx.lineWidth = 3;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.restore();
            
            // Indicador de conexión (Star/Delta) y dirección
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 11px Inter';
            ctx.textAlign = 'center';
            const connSymbol = this.state.connection === 'Star' ? '★ Y' : '△ Δ';
            ctx.fillText(connSymbol, this.x + 80, this.y + 145);
            
            // Flecha de dirección
            ctx.font = 'bold 14px Arial';
            ctx.fillText(this.state.direction > 0 ? '⟳' : '⟲', this.x + 20, this.y + 80);

            // Placa de características (Nameplate info)
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'left';
            ctx.fillText(`${this.state.hp}HP ${this.state.voltage}V`, this.x + 100, this.y + 70);
            ctx.fillText(`${this.state.nominalCurrent}A ${this.state.rpm}RPM`, this.x + 100, this.y + 85);
        }
        
        this.drawTerminals(ctx);
    }

    
    drawTerminals(ctx) {
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            ctx.beginPath();
            ctx.arc(tx, ty, 5, 0, Math.PI*2);
            ctx.fillStyle = '#fbbf24'; 
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (t.label) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px Inter';
                ctx.textAlign = 'center';
                const ly = ty < this.y + 80 ? ty - 10 : ty + 18; // Top vs Bottom
                ctx.fillText(t.label, tx, ly);
            }
        }
    }
}

class PhaseBridge extends Component {
    constructor(x, y) {
        super('bridge', x, y, 100, 20);
        this.state = { spacing: 32 }; 
        this.updateTerminals();
    }
    updateTerminals() {
        const s = this.state.spacing;
        this.terminals = {
            '1': { x: 20, y: 10 },
            '2': { x: 20 + s, y: 10 },
            '3': { x: 20 + s * 2, y: 10 }
        };
        this.width = 40 + s * 2;
    }
    draw(ctx) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        const s = this.state.spacing;
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#b45309');
        gradient.addColorStop(0.5, '#f59e0b');
        gradient.addColorStop(1, '#b45309');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 4);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(this.state.spacing === 32 ? 'IEC' : 'MOT', this.x + this.width/2, this.y + 13);
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            ctx.beginPath();
            ctx.arc(tx, ty, 6, 0, Math.PI*2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
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
        
        // Sincronizar audio del motor con el estado de los motores
        const anyMotorRunning = components.some(c => 
            (c instanceof Motor || c instanceof Motor6T) && c.state.running
        );
        motorAudio.update(anyMotorRunning);
    } else {
        // Detener audio si la simulación está detenida
        motorAudio.update(false);
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
        if (isSimulating) return; // Proteccion: No borrar mientras se simula
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
        
        if (isSimulating) return; // Proteccion: No agregar componentes mientras se simula

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

    // Multímetro (Tester)
    const btnTester = document.getElementById('btn-add-tester');
    if (btnTester) {
        btnTester.onclick = () => {
            if (activeMultimeter) {
                activeMultimeter = null;
            } else {
                // Spawn near the center of the visible area
                activeMultimeter = new Multimeter(400, 300);
            }
            draw();
        };
    }

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

        // Buscar si clicamos en el multímetro
        if (activeMultimeter) {
            const m = activeMultimeter;
            if (mx > m.x && mx < m.x + m.width && my > m.y && my < m.y + m.height) {
                showContextMenu(e.clientX, e.clientY, m);
                return;
            }
        }

        ctxMenu.style.display = 'none';
    });

    // Cerrar menú al hacer clic en cualquier parte (fuera del menú)
    document.addEventListener('click', () => {
        if(ctxMenu) ctxMenu.style.display = 'none';
    });
    
    // Evitar que el menú se cierre al hacer clic dentro de él (para interactuar con inputs)
    if(ctxMenu) {
        ctxMenu.addEventListener('click', e => e.stopPropagation());
    }

    function showContextMenu(x, y, component) {
        const title = document.getElementById('menu-title');
        const thermal = document.getElementById('thermal-controls');
        const inputLimit = document.getElementById('input-limit');
        
        // Handle title for different component types
        if (component instanceof Multimeter || component === activeMultimeter) {
            title.innerText = 'MULTÍMETRO';
        } else if (component.type) {
            title.innerText = component.type.replace('-', ' ').toUpperCase();
        } else {
            title.innerText = 'COMPONENTE';
        }
        
        ctxMenu.style.left = `${x}px`;
        ctxMenu.style.top = `${y}px`;
        ctxMenu.style.display = 'block';

        // Mostrar controles específicos
        if (component instanceof ThermalRelay || component.type === 'thermal-relay') {
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

        // Toggle Espaciado Puente
        const bridgeControls = document.getElementById('bridge-controls');
        if (bridgeControls) {
            bridgeControls.style.display = (component instanceof PhaseBridge || component.type === 'bridge') ? 'block' : 'none';
            document.getElementById('btn-toggle-spacing').onclick = () => {
                component.state.spacing = (component.state.spacing === 32) ? 40 : 32;
                component.updateTerminals();
                ctxMenu.style.display = 'none';
                draw();
            };
        }
        
        // Temporizador Controls
        const timerControls = document.getElementById('timer-controls');
        if (timerControls) {
            if (component instanceof TimerRelay || component.type === 'timer') {
                timerControls.style.display = 'block';
                const inputTimer = document.getElementById('input-timer-sec');
                inputTimer.value = component.state.setting / 1000;
                inputTimer.onchange = (e) => {
                    component.state.setting = parseFloat(e.target.value) * 1000;
                };
            } else {
                timerControls.style.display = 'none';
            }
        }

        // Fuente de Poder Controls
        const sourceControls = document.getElementById('source-controls');
        if (sourceControls) {
            if (component instanceof PowerSource || component.type === 'power-source' || 
                component instanceof SinglePhaseSource || component.type === 'single-phase-source') {
                
                sourceControls.style.display = 'block';
                const selectVoltage = document.getElementById('select-voltage');
                
                // Limpiar opciones previas
                selectVoltage.innerHTML = '';
                
                let options = [];
                if (component.type === 'power-source') {
                    options = [
                        { val: 480, text: '480 V' },
                        { val: 208, text: '208 V' }
                    ];
                } else {
                    options = [
                        { val: 120, text: '120 V' },
                        { val: 208, text: '208 V' },
                        { val: 240, text: '240 V' }
                    ];
                }
                
                options.forEach(opt => {
                    const el = document.createElement('option');
                    el.value = opt.val;
                    el.textContent = opt.text;
                    if (component.state.voltage == opt.val) el.selected = true;
                    selectVoltage.appendChild(el);
                });

                selectVoltage.onchange = (e) => {
                    component.state.voltage = parseInt(e.target.value);
                    draw();
                };
            } else {
                sourceControls.style.display = 'none';
            }
        }

        // Multímetro Controls
        const multimeterControls = document.getElementById('multimeter-controls');
        if (multimeterControls) {
            if (component instanceof Multimeter || component === activeMultimeter) {
                multimeterControls.style.display = 'block';
                const selectMode = document.getElementById('select-tester-mode');
                selectMode.value = component.mode || 'VAC';
                selectMode.onchange = (e) => {
                    component.mode = e.target.value;
                    component.unit = (e.target.value === 'AAC') ? 'A' : 'V';
                    draw();
                };
            } else {
                multimeterControls.style.display = 'none';
            }
        }

        // Motor Controls
        const motorControls = document.getElementById('motor-controls');
        if (motorControls) {
            if (component instanceof Motor || component instanceof Motor6T) {
                motorControls.style.display = 'block';
                
                const selectVoltage = document.getElementById('select-motor-voltage');
                const selectHP = document.getElementById('select-motor-hp');
                const inputPF = document.getElementById('input-motor-pf');
                const inputEff = document.getElementById('input-motor-eff');
                
                selectVoltage.value = component.state.voltage;
                selectHP.value = component.state.hp;
                inputPF.value = component.state.pf;
                inputEff.value = component.state.eff;
                
                selectVoltage.onchange = (e) => {
                    component.state.voltage = parseInt(e.target.value);
                    component.calculateFLA();
                    draw();
                };
                
                selectHP.onchange = (e) => {
                    component.state.hp = parseFloat(e.target.value);
                    component.calculateFLA();
                    draw();
                };
                
                inputPF.onchange = (e) => {
                    component.state.pf = parseFloat(e.target.value);
                    component.calculateFLA();
                    draw();
                };
                
                inputEff.onchange = (e) => {
                    component.state.eff = parseFloat(e.target.value);
                    component.calculateFLA();
                    draw();
                };
            } else {
                motorControls.style.display = 'none';
            }
        }

        // Eliminar Genérico
        const btnDelete = document.getElementById('btn-delete-comp');
        btnDelete.style.display = isSimulating ? 'none' : 'block';
        btnDelete.onclick = () => {
            if (isSimulating) return;
            pushHistory();
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
    if(btnStop) btnStop.addEventListener('click', () => { 
        isSimulating = false; 
        updateStatus(); 
        // Reset Visual States
        components.forEach(c => {
            if (c.state) {
                if (c.state.running !== undefined) c.state.running = false;
                if (c.state.on !== undefined) c.state.on = false;
                if (c.state.engaged !== undefined) c.state.engaged = false;
                if (c.state.pressed !== undefined) c.state.pressed = false;
                if (c.state.active !== undefined) c.state.active = false;
            }
        });
        draw();
    });
    if(btnReset) btnReset.addEventListener('click', () => { 
        pushHistory();
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

    // Undo/Redo Buttons
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const btnUndoFull = document.getElementById('btn-undo-full');
    const btnRedoFull = document.getElementById('btn-redo-full');

    if (btnUndo) btnUndo.onclick = undo;
    if (btnRedo) btnRedo.onclick = redo;
    if (btnUndoFull) btnUndoFull.onclick = undo;
    if (btnRedoFull) btnRedoFull.onclick = redo;

    // Keyboard Shortcuts
    window.addEventListener('keydown', e => {
        if (e.ctrlKey) {
            if (e.key === 'z' || e.key === 'Z') {
                e.preventDefault();
                undo();
            } else if (e.key === 'y' || e.key === 'Y') {
                e.preventDefault();
                redo();
            }
        }
    });
}

function addComponent(type, x, y, skipHistory = false) {
    if (!skipHistory) pushHistory();
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
        case 'selector': c = new Selector(x, y); break;
        case 'timer': c = new TimerRelay(x, y); break;
        case 'bridge': c = new PhaseBridge(x, y); break;
        case 'motor6t': c = new Motor6T(x, y); break;
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


function onMouseDown(e) {
    if (e.touches) e.preventDefault(); // Prevenir scroll en touch
    const pos = getEventPos(e);
    const mx = pos.x;
    const my = pos.y;

    // 0. Handle Dragging (Waypoints)
    if (selectedWire && selectedWire.path && !isSimulating) {
        for (let i = 0; i < selectedWire.path.length; i++) {
            const pt = selectedWire.path[i];
            if (Math.hypot(mx - pt.x, my - pt.y) < 8) {
                pushHistory();
                draggingHandle = { wire: selectedWire, index: i };
                return;
            }
        }
    }

    // 0.2 Multímetro (Instrumento)
    if (activeMultimeter) {
        const m = activeMultimeter;
        if (m.mode === 'VAC') {
            if (Math.hypot(mx - m.probes.red.x, my - m.probes.red.y) < 20) {
                m.draggingProbe = 'red';
                return;
            }
            if (Math.hypot(mx - m.probes.black.x, my - m.probes.black.y) < 20) {
                m.draggingProbe = 'black';
                return;
            }
        } else {
            // AAC Mode (Clamp)
            if (Math.hypot(mx - m.clamp.x, my - m.clamp.y) < 30) {
                m.draggingProbe = 'clamp';
                return;
            }
        }
        
        // Context Menu or Toggle Mode (Right Click or Special Area)
        // For now, let's add a small area to toggle mode? 
        // Or just clicking the selector knob?
        if (Math.hypot(mx - (m.x + m.width/2), my - (m.y + 80)) < 25) {
            m.mode = (m.mode === 'VAC' ? 'AAC' : 'VAC');
            m.value = 0;
            draw();
            return;
        }

        // Tocar cuerpo?
        if (mx > m.x && mx < m.x + m.width && my > m.y && my < m.y + m.height) {
            m.draggingBody = true;
            m.offX = mx - m.x;
            m.offY = my - m.y;
            return;
        }
    }

    // 0.5 Reset Selection (unless clicking valid object)
    let hitObject = false;

    // 1. Tocar Terminal? -> Iniciar Cableado o Agregar Waypoint si ya iniciamos
    if (!isSimulating) {
        for (const c of components) {
            const t = c.getHoveredTerminal(mx, my);
            if (t) {
                if (wireStartObj) {
                    // Si ya iniciamos cableado, intentar cerrar si es otro terminal
                    if (c !== wireStartObj.component) {
                        onMouseUp(e); // Helper para cerrar
                        return;
                    }
                } else {
                    // Iniciar nuevo cable
                    pushHistory();
                    wireStartObj = { component: c, terminalId: t.id, x: t.x, y: t.y, path: [] };
                    return;
                }
            }
        }
    }

    // 2. Tocar Componente? -> Draguear o Activar
    for (let i = components.length - 1; i >= 0; i--) {
        const c = components[i];
        if (c.isMouseOver(mx, my)) {
            // Interacción Click (Siempre permitida si es componente interactivo)
            if (c instanceof Breaker) c.toggle();
            if (c instanceof Selector) c.toggle();
            if (c instanceof PushButton) c.state.pressed = true;

            // Selección y arrastre (Solo si NO estamos simulando)
            if (!isSimulating) {
                pushHistory();
                dragItem = { comp: c, offX: mx - c.x, offY: my - c.y };
                selectedComponent = c;
                selectedWire = null;
            }
            
            draw();
            return;
        }
    }

    // 3. Tocar Cable? (Selección - Solo si NO estamos simulando)
    if (!isSimulating) {
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
    }

    // Si no tocamos nada, limpiar selección o agregar waypoint si estamos cableando
    if (!hitObject) {
        if (wireStartObj && !isSimulating) {
            // Agregar waypoint al cable actual
            wireStartObj.path.push({ x: snapToGrid(mx), y: snapToGrid(my) });
            draw();
            return;
        }
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
         draggingHandle.wire.path[draggingHandle.index].x = snapToGrid(mousePos.x);
         draggingHandle.wire.path[draggingHandle.index].y = snapToGrid(mousePos.y);
         draw();
    }

    if (activeMultimeter) {
        const m = activeMultimeter;
        if (m.draggingProbe) {
            const p = m.draggingProbe === 'clamp' ? m.clamp : m.probes[m.draggingProbe];
            p.x = mousePos.x;
            p.y = mousePos.y;
            draw();
        } else if (m.draggingBody) {
            m.x = mousePos.x - m.offX;
            m.y = mousePos.y - m.offY;
            draw();
        }
    }
}

function onMouseUp(e) {
    // Soltar Boton
    if (dragItem && dragItem.comp instanceof PushButton) {
        dragItem.comp.state.pressed = false;
    }
    dragItem = null;
    draggingHandle = null;

    if (activeMultimeter) {
        const m = activeMultimeter;
        if (m.draggingProbe) {
            const probeKey = m.draggingProbe;
            const p = probeKey === 'clamp' ? m.clamp : m.probes[probeKey];
            
            // Intentar conectar punta a un terminal
            p.target = null;
            for (const c of components) {
                // For clamp, we can also snap to components directly or their terminals
                const t = c.getHoveredTerminal(mousePos.x, mousePos.y);
                if (t) {
                    p.x = c.x + t.x;
                    p.y = c.y + t.y;
                    p.target = { component: c, terminalId: t.id };
                    break;
                }
            }
        }
        m.draggingProbe = null;
        m.draggingBody = false;
    }

    // Finalizar Cableado (Solo si soltamos sobre un terminal válido)
    if (wireStartObj) {
        let finished = false;
        for (const c of components) {
            const t = c.getHoveredTerminal(mousePos.x, mousePos.y);
            if (t && c !== wireStartObj.component) {
                // Crear cable final
                wires.push({
                    from: wireStartObj.component, fromId: wireStartObj.terminalId,
                    to: c, toId: t.id,
                    color: isTripleMode ? '#000000' : currentWireColor,
                    isTriple: isTripleMode,
                    path: [...wireStartObj.path]
                });
                wireStartObj = null;
                finished = true;
                break;
            }
        }
        // Si no hemos finalizado sobre un terminal, dejamos el wireStartObj activo para seguir agregando waypoints
        if (finished) draw();
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
    let circuitChanged = true;
    let stabilityLoop = 0;
    const MAX_STABILITY_LOOPS = 5; // Evitar oscilaciones infinitas

    while(circuitChanged && stabilityLoop < MAX_STABILITY_LOOPS) {
        circuitChanged = false;
        
        // ==========================================
        // FASE 1: RESOLVER VOLTAJES (Red de Nodos)
        // ==========================================
        const nodes = {}; 
        window.lastSolvedNodes = nodes; // Export for UI feedback
        
        // Helpers
        const setNode = (comp, term, phase) => {
            const key = `${comp.id}_${term}`;
            if (!nodes[key]) nodes[key] = new Set();
            if (!nodes[key].has(phase)) nodes[key].add(phase);
        };
        const hasPhase = (comp, term, phase) => {
            const key = `${comp.id}_${term}`;
            return nodes[key] && nodes[key].has(phase);
        };

        // 1.1 Fuentes (Semillas)
        components.filter(c => c instanceof PowerSource).forEach(p => {
            setNode(p, 'L1', 'L1'); setNode(p, 'L2', 'L2'); setNode(p, 'L3', 'L3'); setNode(p, 'N', 'N');
        });
        components.filter(c => c instanceof SinglePhaseSource).forEach(p => {
            setNode(p, 'L', 'L1'); setNode(p, 'N', 'N');
        });

        // 1.2 Propagación Iterativa (Solo voltajes, sin cambiar estados de switches)
        for(let iter=0; iter<10; iter++) {
            let voltageChanged = false;
            const prevNodesCount = Object.values(nodes).reduce((acc, s) => acc + s.size, 0);

            // A. Componentes Interiores (Según estado ACTUAL de switches)
            components.forEach(c => {
                if (c instanceof Breaker) {
                    if (c.state.closed) {
                        ['L1','L2','L3'].forEach((inT, i) => {
                            const outT = ['T1','T2','T3'][i];
                            if (nodes[`${c.id}_${inT}`]) nodes[`${c.id}_${inT}`].forEach(p => setNode(c, outT, p));
                            if (nodes[`${c.id}_${outT}`]) nodes[`${c.id}_${outT}`].forEach(p => setNode(c, inT, p));
                        });
                    }
                }
                if (c instanceof Contactor) {
                    if (c.state.engaged) {
                        // Principales
                        ['L1','L2','L3'].forEach((inT, i) => {
                             const outT = ['T1','T2','T3'][i];
                             if (nodes[`${c.id}_${inT}`]) nodes[`${c.id}_${inT}`].forEach(p => setNode(c, outT, p));
                             if (nodes[`${c.id}_${outT}`]) nodes[`${c.id}_${outT}`].forEach(p => setNode(c, inT, p));
                        });
                        // Aux NO (13-14) Cerrado
                        const k13 = `${c.id}_NO13`, k14 = `${c.id}_NO14`;
                        if(nodes[k13]) nodes[k13].forEach(p => setNode(c, 'NO14', p));
                        if(nodes[k14]) nodes[k14].forEach(p => setNode(c, 'NO13', p));
                    } else {
                        // Aux NC (21-22) Cerrado
                        const k21 = `${c.id}_NC21`, k22 = `${c.id}_NC22`;
                        if(nodes[k21]) nodes[k21].forEach(p => setNode(c, 'NC22', p));
                        if(nodes[k22]) nodes[k22].forEach(p => setNode(c, 'NC21', p));
                    }
                }
                if (c instanceof ThermalRelay) {
                    // Potencia siempre pasa si no está disparado (en realidad pasa siempre físicamente, el control es el que corta)
                    // Generalizado para pasar cualquier fase de L a T
                    ['L1','L2','L3'].forEach((inT, i) => {
                         const outT = ['T1','T2','T3'][i];
                         const key = `${c.id}_${inT}`;
                         if (nodes[key]) nodes[key].forEach(p => setNode(c, outT, p));
                         const rKey = `${c.id}_${outT}`;
                         if (nodes[rKey]) nodes[rKey].forEach(p => setNode(c, inT, p));
                    });
                    // Auxiliares
                    if (!c.state.tripped) {
                        const k95 = `${c.id}_NC95`, k96 = `${c.id}_NC96`;
                        if(nodes[k95]) nodes[k95].forEach(p => setNode(c, 'NC96', p));
                        if(nodes[k96]) nodes[k96].forEach(p => setNode(c, 'NC95', p));
                    } else {
                        const k97 = `${c.id}_NO97`, k98 = `${c.id}_NO98`;
                        if(nodes[k97]) nodes[k97].forEach(p => setNode(c, 'NO98', p));
                        if(nodes[k98]) nodes[k98].forEach(p => setNode(c, 'NO97', p));
                    }
                }
                if (c instanceof PushButton) {
                    const isNC = c.type === 'stop-btn';
                    const isConducting = isNC ? !c.state.pressed : c.state.pressed;
                    if (isConducting) {
                        const k1 = `${c.id}_1`, k2 = `${c.id}_2`;
                        if(nodes[k1]) nodes[k1].forEach(p => setNode(c, '2', p));
                        if(nodes[k2]) nodes[k2].forEach(p => setNode(c, '1', p));
                    }
                }
                if (c instanceof Selector) {
                    // Pos -1: Manual (13-14)
                    if (c.state.position === -1) {
                        const k13 = `${c.id}_13`, k14 = `${c.id}_14`;
                        if(nodes[k13]) nodes[k13].forEach(p => setNode(c, '14', p));
                        if(nodes[k14]) nodes[k14].forEach(p => setNode(c, '13', p));
                    }
                    // Pos 1: Auto (23-24)
                    if (c.state.position === 1) {
                        const k23 = `${c.id}_23`, k24 = `${c.id}_24`;
                        if(nodes[k23]) nodes[k23].forEach(p => setNode(c, '24', p));
                        if(nodes[k24]) nodes[k24].forEach(p => setNode(c, '23', p));
                    }
                }
                if (c instanceof TimerRelay) {
                    // NC 55-56
                    if (!c.state.done) {
                        const k55 = `${c.id}_NC55`, k56 = `${c.id}_NC56`;
                        if(nodes[k55]) nodes[k55].forEach(p => setNode(c, 'NC56', p));
                        if(nodes[k56]) nodes[k56].forEach(p => setNode(c, 'NC55', p));
                    } else {
                        // NO 67-68
                        const k67 = `${c.id}_NO67`, k68 = `${c.id}_NO68`;
                        if(nodes[k67]) nodes[k67].forEach(p => setNode(c, 'NO68', p));
                        if(nodes[k68]) nodes[k68].forEach(p => setNode(c, 'NO67', p));
                    }
                }
                if (c instanceof PhaseBridge) {
                    // Cortocircuito entre los 3 terminales
                    const k1 = `${c.id}_1`, k2 = `${c.id}_2`, k3 = `${c.id}_3`;
                    const allPotentials = new Set();
                    if(nodes[k1]) nodes[k1].forEach(p => allPotentials.add(p));
                    if(nodes[k2]) nodes[k2].forEach(p => allPotentials.add(p));
                    if(nodes[k3]) nodes[k3].forEach(p => allPotentials.add(p));
                    
                    allPotentials.forEach(p => {
                        setNode(c, '1', p);
                        setNode(c, '2', p);
                        setNode(c, '3', p);
                    });
                }
                if (c instanceof Motor6T) {
                    // Bobinados internos: U1-U2, V1-V2, W1-W2
                    [['U1','U2'], ['V1','V2'], ['W1','W2']].forEach(([t1, t2]) => {
                        const k1 = `${c.id}_${t1}`, k2 = `${c.id}_${t2}`;
                        if(nodes[k1]) nodes[k1].forEach(p => setNode(c, t2, p));
                        if(nodes[k2]) nodes[k2].forEach(p => setNode(c, t1, p));
                    });
                }
            });

            // B. Cables
            wires.forEach(w => {
                if (w.isTriple) {
                    const phaseSets = [
                        ['L1', 'L2', 'L3'], 
                        ['T1', 'T2', 'T3'], 
                        ['U', 'V', 'W'],
                        ['U1', 'V1', 'W1'],
                        ['W2', 'U2', 'V2'],
                        ['1', '2', '3'] // Phase Bridge
                    ];
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

            // Check convergence
            const newNodesCount = Object.values(nodes).reduce((acc, s) => acc + s.size, 0);
            if (newNodesCount > prevNodesCount) voltageChanged = true;
            if (!voltageChanged) break; // Voltajes estables
        }

        // ==========================================
        // FASE 2: ACTUALIZAR ESTADOS (Switches)
        // ==========================================
        
        // C. Consumidores
        // Limpiar sensores de corriente
        components.filter(c => c instanceof ThermalRelay).forEach(r => r.state.currentSense = 0);

        // A. BOBINAS DE CONTACTORES
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
                circuitChanged = true; // Switch changed! Re-solve voltages in next loop
            }
        });

        // BOBINAS DE TEMPORIZADORES (TimerRelay)
        components.filter(c => c instanceof TimerRelay).forEach(t => {
            const hasA1 = nodes[`${t.id}_A1`];
            const hasA2 = nodes[`${t.id}_A2`];
            let energized = false;
            if (hasA1 && hasA1.size > 0 && hasA2 && hasA2.size > 0) {
                const p1 = [...hasA1][0], p2 = [...hasA2][0];
                if (p1 !== p2) energized = true;
            }
            
            if (energized) {
                if (!t.state.active) {
                     t.state.active = true;
                     t.state.timeElapsed = 0; // Reset on fresh energization? Or keep counting? Usually reset on drop.
                }
                if (!t.state.done) {
                    t.state.timeElapsed += 16; // approx 16ms per frame
                    if (t.state.timeElapsed >= t.state.setting) {
                        t.state.done = true;
                        circuitChanged = true;
                    }
                }
            } else {
                if (t.state.active || t.state.done || t.state.timeElapsed > 0) {
                    t.state.active = false;
                    t.state.done = false;
                    t.state.timeElapsed = 0;
                    circuitChanged = true;
                }
            }
        });

        // Motores 3T
        components.filter(c => c instanceof Motor).forEach(m => {
            const hasU = nodes[`${m.id}_U`];
            const hasV = nodes[`${m.id}_V`];
            const hasW = nodes[`${m.id}_W`];
            
            if (hasU && hasU.size > 0 && hasV && hasV.size > 0 && hasW && hasW.size > 0) {
                const uPhase = [...hasU][0];
                const vPhase = [...hasV][0];
                const wPhase = [...hasW][0];

                if (uPhase !== vPhase && vPhase !== wPhase && uPhase !== wPhase) {
                    if(!m.state.running) {
                        m.state.running = true;
                        circuitChanged = true; // Changed to 'circuitChanged' to match existing pattern
                    }
                    if (uPhase==='L1' && vPhase==='L2') m.state.direction = 1;
                    else if (uPhase==='L1' && vPhase==='L3') m.state.direction = -1;
                    else m.state.direction = 1;

                    // Corriente -> Térmicos
                    components.filter(c => c instanceof ThermalRelay && !c.state.tripped).forEach(r => {
                        const hasT1 = nodes[`${r.id}_T1`], hasT2 = nodes[`${r.id}_T2`], hasT3 = nodes[`${r.id}_T3`];
                        const connected = (t, mP) => t && mP && [...t].some(p => mP.has(p));
                        if (connected(hasT1, hasU) && connected(hasT2, hasV) && connected(hasT3, hasW)) {
                            r.state.currentSense += m.state.nominalCurrent || 6.5;
                        }
                    });
                } else { if(m.state.running) { m.state.running = false; circuitChanged = true; } } // Changed to 'circuitChanged'
            } else { if(m.state.running) { m.state.running = false; circuitChanged = true; } } // Changed to 'circuitChanged'
        });

        // Motores 6T (Star-Delta)
        components.filter(c => c instanceof Motor6T).forEach(m => {
             const get = (id) => nodes[`${m.id}_${id}`];
             const hasU1 = get('U1'), hasV1 = get('V1'), hasW1 = get('W1');
             const hasU2 = get('U2'), hasV2 = get('V2'), hasW2 = get('W2');
             
             let connection = 'None';
             let running = false;
             let direction = 1;

             // Check Input Power (U1, V1, W1)
             if (hasU1 && hasU1.size && hasV1 && hasV1.size && hasW1 && hasW1.size) {
                 const pU = [...hasU1][0], pV = [...hasV1][0], pW = [...hasW1][0];
                 const validPower = (pU!==pV && pV!==pW && pU!==pW);
                 
                 if (validPower) {
                     // Check Star: U2, V2, W2 shorted together
                     // We check if they share a common potential derived from each other?
                     // Easier: check if they are all connected to the SAME node set in our 'nodes' map?
                     // 'nodes' map stores voltage potentials. If shorted, they might have specific potential?
                     // Actually, if they are shorted, they share connectivity.
                     // But 'nodes' calculation propagates voltage. If U2 is connected to V2, then V2 gets U1's potential!
                     // So in Star (shorted), U2, V2, W2 will ALL have ALL 3 PHASES (short circuit mixing).
                     // If we detect MIXED phases on U2/V2/W2, that's a Star Point!
                     
                     if (hasU2 && hasU2.size > 1 && hasV2 && hasV2.size > 1 && hasW2 && hasW2.size > 1) {
                         // They are mixing phases -> Short circuit at Neutral Point -> STAR connection working!
                         connection = 'Star';
                         running = true;
                     } 
                     // Check Delta: U1-W2, V1-U2, W1-V2
                     // U1(L1) connected to W2. W2 has L1.
                     // V1(L2) connected to U2. U2 has L2.
                     // W1(L3) connected to V2. V2 has L3.
                     else if (hasW2 && [...hasW2].includes(pU) && 
                              hasU2 && [...hasU2].includes(pV) &&
                              hasV2 && [...hasV2].includes(pW)) {
                         connection = 'Delta';
                         running = true;
                     }
                 }
             }

             if (m.state.running !== running || m.state.connection !== connection) {
                 m.state.running = running;
                 m.state.connection = connection;
                 m.state.direction = 1; // Default
                 circuitChanged = true;
             }
        });

        // B. RELÉS TÉRMICOS (Trip Logic)
        // Calculado POSTERIOR a todo para no oscilar en el mismo frame, pero afecta siguiente frame
        // Aunque si dispara, cambia topología. Aquí asumimos que trip es "lento" y no necesita re-solver instantáneo
        // O si queremos re-solver inmediato:
        // Motores Logic (Calcula corriente)
        // This section was moved and integrated into the Motor logic above.
        // The original `components.filter(c => c instanceof Motor).forEach(m => { ... });` block is now split and re-ordered.

        components.filter(c => c instanceof ThermalRelay).forEach(r => {
             if (r.state.tripEnabled && !r.state.tripped && r.state.currentSense > r.state.currentLimit) {
                 r.state.tripped = true;
                 console.log(`Relé Térmico ${r.id} TRIPPED`);
                 circuitChanged = true; // Topología cambia (NC abre)
             }
        });

        // C. LUCES PILOTO (Visual only, no afecta topología)
        components.filter(c => c instanceof PilotLight).forEach(p => {
            const hasX1 = nodes[`${p.id}_X1`], hasX2 = nodes[`${p.id}_X2`];
            if (hasX1 && hasX1.size > 0 && hasX2 && hasX2.size > 0) {
                const p1 = [...hasX1][0], p2 = [...hasX2][0];
                p.state.on = (p1 !== p2);
            } else {
                p.state.on = false;
            }
        });
        
        stabilityLoop++;
    }
}


// ================= RENDER =================

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.scale(scale, scale);

    // 0. Grid
    drawGrid(ctx);

    // 1. Componentes
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

     // 2. Cables (Now in front and segmented!)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    wires.forEach(w => {
        const p1 = w.from.getTerminal(w.fromId);
        const p2 = w.to.getTerminal(w.toId);
        
        if (p1 && p2) {
             const isSelected = (w === selectedWire);
             const path = [p1, ...(w.path || []), p2];

             const nodes = window.lastSolvedNodes || {};
             const phaseSets = [
                 ['L1', 'L2', 'L3'], ['T1', 'T2', 'T3'], 
                 ['U', 'V', 'W'], ['U1', 'V1', 'W1'], ['W2', 'U2', 'V2']
             ];
             const activeSet = w.isTriple ? phaseSets.find(s => s.includes(w.fromId)) : null;

             const isEnergized = w.isTriple && activeSet ? 
                activeSet.some(f => (nodes[`${w.from.id}_${f}`] && nodes[`${w.from.id}_${f}`].size > 0)) :
                ((nodes[`${w.from.id}_${w.fromId}`] && nodes[`${w.from.id}_${w.fromId}`].size > 0) || 
                 (nodes[`${w.to.id}_${w.toId}`] && nodes[`${w.to.id}_${w.toId}`].size > 0));
             
             if (isEnergized && isSimulating) {
                 ctx.save();
                 ctx.shadowColor = (w.color && w.color !== '#000000') ? w.color : '#fbbf24';
                 ctx.shadowBlur = 10;
                 ctx.lineWidth = isSelected ? 8 : 6;
                 if (w.color === '#ef4444') ctx.strokeStyle = '#f87171';
                 else if (w.color === '#22c55e') ctx.strokeStyle = '#4ade80';
                 else if (w.color === '#3b82f6') ctx.strokeStyle = '#60a5fa';
                 else ctx.strokeStyle = '#fcd34d';
             } else {
                 ctx.strokeStyle = isSelected ? '#fbbf24' : (w.color || '#3b82f6'); 
                 ctx.lineWidth = isSelected ? 6 : 4;
             }

             if (w.isTriple) {
                 let index = 1;
                 if (activeSet) index = activeSet.indexOf(w.fromId);
                 const spacing = 32;
                 const offsets = [(0 - index) * spacing, (1 - index) * spacing, (2 - index) * spacing];
                 
                 offsets.forEach((offset, i) => {
                     let phaseEnergized = isEnergized;
                     if (activeSet && isSimulating) {
                         const phaseKey = `${w.from.id}_${activeSet[i]}`;
                         phaseEnergized = (nodes[phaseKey] && nodes[phaseKey].size > 0);
                     }

                     ctx.beginPath();
                     ctx.strokeStyle = phaseEnergized ? '#fcd34d' : '#000000';
                     if (phaseEnergized) {
                         ctx.shadowBlur = 8;
                         ctx.shadowColor = '#fbbf24';
                     } else { ctx.shadowBlur = 0; }

                     path.forEach((pt, idx) => {
                         if (idx === 0) ctx.moveTo(pt.x + offset, pt.y);
                         else ctx.lineTo(pt.x + offset, pt.y);
                     });
                     ctx.stroke();
                 });
                 if (isEnergized) ctx.restore();
             } else {
                 ctx.beginPath();
                 path.forEach((pt, idx) => {
                     if (idx === 0) ctx.moveTo(pt.x, pt.y);
                     else ctx.lineTo(pt.x, pt.y);
                 });
                 ctx.stroke();
                 if (isEnergized) ctx.restore();
             }

             ctx.shadowBlur = 0;

             // Tapar extremos y dibujar puntos del path
             ctx.fillStyle = ctx.strokeStyle;
             path.forEach((pt, idx) => {
                 const isEndpoint = (idx === 0 || idx === path.length - 1);
                 if (isEndpoint) {
                     ctx.beginPath();
                     ctx.arc(pt.x, pt.y, isSelected ? 3 : 2, 0, Math.PI*2);
                     ctx.fill();
                 } else if (isSelected) {
                     // Waypoints visibles solo si está seleccionado
                     ctx.beginPath();
                     ctx.arc(pt.x, pt.y, 6, 0, Math.PI*2);
                     ctx.fill();
                     ctx.strokeStyle = '#000';
                     ctx.lineWidth = 1;
                     ctx.stroke();
                 }
             });
        }
    });

    // 3. Línea de Creación (Segmentada para previsualizar)
    if (wireStartObj) {
        ctx.strokeStyle = currentWireColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        const p1 = wireStartObj.component.getTerminal(wireStartObj.terminalId);
        const fullPath = [p1, ...wireStartObj.path, mousePos];
        
        ctx.beginPath();
        fullPath.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 4. Multímetro
    if (activeMultimeter) {
        activeMultimeter.update();
        activeMultimeter.draw(ctx);
    }

    ctx.restore();
}


// ================= UTILIDADES =================

// Hit test mejorado para polilíneas de N segmentos
function isMouseOverWire(mx, my, wire) {
    const p1 = wire.from.getTerminal(wire.fromId);
    const p2 = wire.to.getTerminal(wire.toId);
    if (!p1 || !p2) return false;

    const fullPath = [p1, ...(wire.path || []), p2];
    const threshold = wire.isTriple ? 40 : 10;
    
    for (let i = 0; i < fullPath.length - 1; i++) {
        const segStart = fullPath[i];
        const segEnd = fullPath[i+1];
        if (pDist(mx, my, segStart.x, segStart.y, segEnd.x, segEnd.y) < threshold) {
            return true;
        }
    }
    return false;
}

function pDist(x, y, x1, y1, x2, y2) {
    const A = x - x1, B = y - y1, C = x2 - x1, D = y2 - y1;
    const dot = A * C + B * D, len_sq = C * C + D * D;
    let param = -1;
    if (len_sq != 0) param = dot / len_sq;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    const dx = x - xx, dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
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

// ================= HISTORIAL (UNDO/REDO) =================

function pushHistory() {
    const currentState = serializeCircuit();
    // Evitar duplicados consecutivos
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === currentState) return;
    
    undoStack.push(currentState);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = []; // Al hacer un cambio nuevo, se limpia el redo
    updateUndoButtons();
}

function undo() {
    if (undoStack.length === 0) return;
    
    const currentState = serializeCircuit();
    redoStack.push(currentState);
    
    const previousState = undoStack.pop();
    applyState(previousState);
    updateUndoButtons();
}

function redo() {
    if (redoStack.length === 0) return;
    
    const currentState = serializeCircuit();
    undoStack.push(currentState);
    
    const nextState = redoStack.pop();
    applyState(nextState);
    updateUndoButtons();
}

function applyState(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        components = [];
        wires = [];
        selectedComponent = null;
        selectedWire = null;
        
        // window.components y window.wires deben sincronizarse si se usan como referencias globales
        window.components = components;
        window.wires = wires;

        // 1. Recrear Componentes
        data.components.forEach(cData => {
            addComponent(cData.type, cData.x + 50, cData.y + 50, true); // true = skipHistory
            const c = components[components.length - 1];
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
                    path: wData.path || []
                });
            }
        });

        draw();
    } catch (err) {
        console.error("Error al aplicar estado del historial:", err);
    }
}

function updateUndoButtons() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.disabled = (undoStack.length === 0);
    if (btnRedo) btnRedo.disabled = (redoStack.length === 0);
    
    // También para la versión full
    const btnUndoFull = document.getElementById('btn-undo-full');
    const btnRedoFull = document.getElementById('btn-redo-full');
    if (btnUndoFull) btnUndoFull.disabled = (undoStack.length === 0);
    if (btnRedoFull) btnRedoFull.disabled = (redoStack.length === 0);
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
            path: w.path || []
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
                    path: wData.path || []
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
