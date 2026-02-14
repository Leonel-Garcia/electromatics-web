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
let currentScale = window.scale; // Zoom level tracking
let selectedWire = window.selectedWire;
let selectedComponent = null; // New state
let currentWireColor = window.currentWireColor;
let draggingHandle = null; // {wire, cp: 1|2}
let isTripleMode = false; // New state for Triple Cable tool
let multimeters = []; // Arreglo de instancias de tester

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
        this.unlocked = false; // Propiedad interna para estado de desbloqueo
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
        if (!this.unlocked && !audioUnlocked) {
            console.log('Audio locked. Waiting for user interaction...');
            this.pendingStart = true;
            return;
        }
        
        if (!this.audioCtx) {
            if (!this.init()) return;
        }

        // Resume context if suspended (common in browsers)
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().then(() => {
                console.log('AudioContext resumed successfully');
            });
        }
        
        if (this.isPlaying) return;

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
            
            this.oscillators.push({ osc, gain, lfo, lfoGain, originalFreq: config.freq });
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

    setPitch(multiplier) {
        if (!this.audioCtx || this.oscillators.length === 0) return;
        const now = this.audioCtx.currentTime;
        this.oscillators.forEach(item => {
            // Smooth transition to new pitch
            const targetFreq = item.originalFreq * multiplier;
            // Solo actualizamos si la diferencia es significativa para evitar llamadas excesivas
            if (Math.abs(item.osc.frequency.value - targetFreq) > 1) {
                item.osc.frequency.setTargetAtTime(targetFreq, now, 0.2);
            }
        });
    }
}

// Global audio manager instance
const motorAudio = new MotorAudioManager();
window.motorAudio = motorAudio; // Exponer globalmente para componentes como Dahlander

// Unlock audio on first user interaction
const unlockAudio = () => {
    motorAudio.unlocked = true;
    motorAudio.unlock();
    audioUnlocked = true;
    window.audioUnlocked = true;
};

document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });




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
    'motor6t': 'img/simulators/control-panel/motor6t.png',
    'alternating-relay': 'img/simulators/control-panel/alternating-relay.png',
    'float-switch': 'img/simulators/control-panel/float-switch.png',
    'terminal-block': 'img/simulators/control-panel/terminal-block.png',
    'pressure-switch': 'img/simulators/control-panel/pressure-switch.png',
    'guardamotor': 'img/simulators/control-panel/guardamotor.png',
    'supervisor': 'img/simulators/control-panel/supervisor.png',
    'dahlander-motor': 'img/simulators/control-panel/dahlander-motor.png?v=7'
};

/**
 * Calcula la dirección de rotación de un sistema trifásico.
 * Secuencia Positiva (1): L1-L2-L3, L2-L3-L1, L3-L1-L2
 * Secuencia Negativa (-1): L1-L3-L2, L3-L2-L1, L2-L1-L3
 */
function getThreePhaseDirection(p1, p2, p3) {
    if (!p1 || !p2 || !p3) return 1;
    const seq = ['L1', 'L2', 'L3'];
    // Normalizar nombres si es necesario (ej: quitar prefijos si los hubiera)
    const findPhase = (p) => seq.find(s => p.includes(s));
    const n1 = findPhase(p1), n2 = findPhase(p2), n3 = findPhase(p3);
    
    const i1 = seq.indexOf(n1), i2 = seq.indexOf(n2), i3 = seq.indexOf(n3);
    if (i1 === -1 || i2 === -1 || i3 === -1) return 1;

    // La dirección se invierte si cambiamos dos fases cualquiera
    const d = (i2 - i1 + 3) % 3;
    return (d === 1) ? 1 : -1;
}

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
        this.rotation = 0; // 0, 90, 180, 270
    }

    getTerminalPos(id) {
        const t = this.terminals[id];
        if (!t) return { x: this.x, y: this.y };

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const rad = (this.rotation * Math.PI) / 180;

        // Position relative to center
        const rx = (this.x + t.x) - cx;
        const ry = (this.y + t.y) - cy;

        // Rotate
        const rotatedX = rx * Math.cos(rad) - ry * Math.sin(rad);
        const rotatedY = rx * Math.sin(rad) + ry * Math.cos(rad);

        return { x: cx + rotatedX, y: cy + rotatedY };
    }

    getTerminal(id) {
        if (!this.terminals[id]) return null;
        const pos = this.getTerminalPos(id);
        return { 
            x: pos.x, 
            y: pos.y,
            id: id,
            component: this
        };
    }

    // Hit test para terminales con area expandida para facilitar click
    getHoveredTerminal(mx, my) {
        for (const id of Object.keys(this.terminals)) {
            const pos = this.getTerminalPos(id);
            if (Math.hypot(mx - pos.x, my - pos.y) < 12) return this.getTerminal(id);
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
            rotation: this.rotation,
            state: JSON.parse(JSON.stringify(this.state)) // Deep copy
        };
    }
    draw(ctx) {
        ctx.save();
        // Aplicar rotación sobre el centro del componente
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate((this.rotation * Math.PI) / 180);
        
        const drawX = -this.width / 2;
        const drawY = -this.height / 2;

        if (assets[this.type]) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15 * currentScale;
            ctx.drawImage(assets[this.type], drawX, drawY, this.width, this.height);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#475569';
            ctx.fillRect(drawX, drawY, this.width, this.height);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.strokeRect(drawX, drawY, this.width, this.height);
            
            // Fallback text if no asset
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(this.type, 0, 5);
        }
        ctx.restore();
        
        // Terminales se dibujan fuera del save/restore para usar sus posiciones absolutas
        this.drawTerminals(ctx);
    }

    drawTerminals(ctx) {
        for (const [id, t] of Object.entries(this.terminals)) {
            const pos = this.getTerminalPos(id);
            const tx = pos.x;
            const ty = pos.y;
            
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
            const labelText = t.label || id;
            if (labelText) {
                ctx.fillStyle = '#fff';
                ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
                ctx.font = 'bold 10px Inter, sans-serif';
                ctx.textAlign = 'center';
                // Posicionar etiqueta según ubicación relativa al centro para que rote bien
                const rad = (this.rotation * Math.PI) / 180;
                // Si ty es menor que el centro, poner arriba, sino abajo
                const cy = this.y + this.height/2;
                const ly = ty < cy ? ty - 10 : ty + 18; 
                ctx.fillText(labelText, tx, ly);
                ctx.shadowBlur = 0;
            }
        }
    }
}

class PowerSource extends Component {
    constructor(x, y) {
        super('power-source', x, y, 120, 60);
        this.state = { 
            voltage: 480, 
            randomEnabled: false,
            phaseShifts: { L1: 1, L2: 1, L3: 1, N: 0 },
            lastUpdate: 0
        };
        this.terminals = {
            'L1': {x: 20, y: 50, label: 'L1'}, 
            'L2': {x: 52, y: 50, label: 'L2'}, 
            'L3': {x: 84, y: 50, label: 'L3'},
            'N':  {x: 116, y: 50, label: 'N'}
        };
    }

    update() {
        if (!isSimulating) return;
        if (this.state.randomEnabled) {
            const now = Date.now();
            if (now - this.state.lastUpdate > 30000) { // 30 segundos
                this.state.lastTargets = {
                    L1: 0.85 + Math.random() * 0.30,
                    L2: 0.85 + Math.random() * 0.30,
                    L3: 0.85 + Math.random() * 0.30
                };
                this.state.lastUpdate = now;
            }
            
            if (this.state.lastTargets) {
                ['L1', 'L2', 'L3'].forEach(f => {
                    this.state.phaseShifts[f] = this.state.phaseShifts[f] * 0.98 + this.state.lastTargets[f] * 0.02;
                });
            }
        } else {
            this.state.phaseShifts = { L1: 1, L2: 1, L3: 1, N: 0 };
        }
    }

    isMouseOver(mx, my) {
        // Expandir hacia arriba para el slider si está seleccionado
        if (selectedComponent === this && !isSimulating) {
            if (mx >= this.x && mx <= this.x + this.width && my >= this.y - 45 && my <= this.y + this.height) {
                return true;
            }
        }
        return super.isMouseOver(mx, my);
    }
    
    draw(ctx) {
        // Dibujo vectorizado para Fuente
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('3Φ Power Source', this.x + this.width/2, this.y + 20);
        
        ctx.font = 'bold 11px Inter';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${this.state.voltage}V NOMINAL`, this.x + this.width/2, this.y + 35);

        // Controles si está seleccionado
        if (selectedComponent === this && !isSimulating) {
            // Slider área: Parte superior del componente
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(this.x, this.y - 40, this.width, 35);
            ctx.strokeStyle = '#3b82f6';
            ctx.strokeRect(this.x, this.y - 40, this.width, 35);

            // Slider track
            ctx.fillStyle = '#334155';
            ctx.fillRect(this.x + 10, this.y - 25, this.width - 20, 4);
            
            // Slider handle
            const minV = 208, maxV = 600;
            const perc = (this.state.voltage - minV) / (maxV - minV);
            const hx = this.x + 10 + perc * (this.width - 20);
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(hx, this.y - 23, 6, 0, Math.PI*2);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = '9px Inter';
            ctx.fillText(`Ajustar: ${this.state.voltage}V`, this.x + this.width/2, this.y - 30);

            // Botón Random
            const rColor = this.state.randomEnabled ? '#22c55e' : '#64748b';
            ctx.fillStyle = rColor;
            ctx.beginPath();
            ctx.roundRect(this.x + this.width - 25, this.y + 5, 20, 10, 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '7px Inter';
            ctx.fillText('RND', this.x + this.width - 15, this.y + 13);
        }

        this.drawTerminals(ctx);
    }
}

class SinglePhaseSource extends Component {
    constructor(x, y) {
        super('single-phase-source', x, y, 70, 60);
        this.state = { 
            voltage: 120,
            randomEnabled: false,
            phaseShifts: { L: 1, N: 0 },
            lastUpdate: 0
        };
        this.terminals = {
            'L': {x: 52, y: 50, label: 'L'},
            'N': {x: 20, y: 50, label: 'N'}
        };
    }

    update() {
        if (!isSimulating) return;
        if (this.state.randomEnabled) {
            const now = Date.now();
            if (now - this.state.lastUpdate > 30000) {
                this.state.lastTarget = 0.85 + Math.random() * 0.30;
                this.state.lastUpdate = now;
            }
            if (this.state.lastTarget !== undefined) {
                this.state.phaseShifts.L = this.state.phaseShifts.L * 0.98 + this.state.lastTarget * 0.02;
            }
        } else {
            this.state.phaseShifts = { L: 1, N: 0 };
        }
    }

    isMouseOver(mx, my) {
        if (selectedComponent === this && !isSimulating) {
            if (mx >= this.x && mx <= this.x + this.width && my >= this.y - 45 && my <= this.y + this.height) {
                return true;
            }
        }
        return super.isMouseOver(mx, my);
    }
    
    draw(ctx) {
        // Dibujo vectorizado para Fuente Monofásica
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('1Φ Power Source', this.x + this.width/2, this.y + 20);
        
        ctx.font = 'bold 11px Inter';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${this.state.voltage}V NOMINAL`, this.x + this.width/2, this.y + 35);

        // Controles si está seleccionado
        if (selectedComponent === this && !isSimulating) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(this.x, this.y - 40, this.width, 35);
            ctx.strokeStyle = '#3b82f6';
            ctx.strokeRect(this.x, this.y - 40, this.width, 35);

            ctx.fillStyle = '#334155';
            ctx.fillRect(this.x + 10, this.y - 25, this.width - 20, 4);
            
            const minV = 100, maxV = 250;
            const perc = (this.state.voltage - minV) / (maxV - minV);
            const hx = this.x + 10 + perc * (this.width - 20);
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(hx, this.y - 23, 5, 0, Math.PI*2);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = '8px Inter';
            ctx.fillText(`Ajustar: ${this.state.voltage}V`, this.x + this.width/2, this.y - 30);

             // Botón Random
            const rColor = this.state.randomEnabled ? '#22c55e' : '#64748b';
            ctx.fillStyle = rColor;
            ctx.beginPath();
            ctx.roundRect(this.x + this.width - 22, this.y + 5, 18, 9, 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '7px Inter';
            ctx.fillText('RND', this.x + this.width - 13, this.y + 12);
        }

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
            if (this.draggingProbe === key) return; // Don't override position while dragging

            const p = key === 'clamp' ? this.clamp : this.probes[key];
            if (p.target) {
                if (p.target.component) {
                    const c = p.target.component;
                    const t = c.terminals[p.target.terminalId];
                    if (t) {
                        p.x = c.x + t.x;
                        p.y = c.y + t.y;
                    }
                } else if (p.target.wire && p.target.snapPos) {
                    p.x = p.target.snapPos.x;
                    p.y = p.target.snapPos.y;
                }
            }
        });

        if (!isSimulating) {
            this.value = 0;
            return;
        }

        const nodes = window.lastSolvedNodes || {};
        
        if (this.mode === 'VAC') {
            const redPhases = this.getPhases(this.probes.red, nodes);
            const blackPhases = this.getPhases(this.probes.black, nodes);

            if (redPhases.size === 0 || blackPhases.size === 0) {
                this.value = 0;
                return;
            }
            this.value = this.getVoltage(redPhases, blackPhases, nodes);
            this.unit = 'V';
        } else if (this.mode === 'AAC') {
            this.value = this.calculateCurrent(this.clamp.target, nodes);
            this.unit = 'A';
        }
    }

    // Función para obtener fases de un objetivo (clic point)
    getPhases(probe, nodes) {
        if (probe.target && probe.target.component) {
            const key = `${probe.target.component.id}_${probe.target.terminalId}`;
            return nodes[key] || new Set();
        }
        return new Set();
    }

    // Lógica de Voltaje
    getVoltage(p1, p2, nodes) {
        if (!p1 || !p2 || p1.size === 0 || p2.size === 0) return 0;
        
        const source = components.find(c => c.type === 'power-source' || c.type === 'single-phase-source');
        if (!source) return 0;

        const shifts = source.state.phaseShifts || { L1: 1, L2: 1, L3: 1, L: 1, N: 0 };
        const vBase = source.state.voltage;

        // Determinar fase predominante en cada punta
        const ph1 = [...p1][0], ph2 = [...p2][0];
        
        const getInstVal = (ph) => {
            if (ph === 'N') return 0;
            let sKey = ph;
            if (ph === 'L1' && !shifts.L1 && shifts.L) sKey = 'L'; // Map Mono to L
            return vBase * (shifts[sKey] || 1);
        };

        const v1 = getInstVal(ph1);
        const v2 = getInstVal(ph2);

        // Diferencia Neutral - Fase
        if ((ph1 === 'N' && ph2 !== 'N') || (ph2 === 'N' && ph1 !== 'N')) {
            const activePh = ph1 === 'N' ? ph2 : ph1;
            const val = getInstVal(activePh);
            if (source.type === 'power-source') return Math.round(val / Math.sqrt(3));
            return Math.round(val);
        }

        // Linea - Linea
        if (ph1 !== ph2 && ph1 !== 'N' && ph2 !== 'N') {
            // Simplificación: Asumimos 120 grados. En DC o monofasica real 180 si es L1-L2 de transformador.
            const avgShift = (getInstVal(ph1) + getInstVal(ph2)) / 2;
            return Math.round(avgShift); 
        }

        return 0;
    }

    calculateCurrent(target, nodes) {
        if (!target || !isSimulating || !nodes) return 0;

        const visited = new Set();
        const activeMotors = new Set();
        
        const trace = (compId, termId) => {
            if (!termId) return;
            const key = `${compId}_${termId}`;
            if (visited.has(key)) return;
            visited.add(key);

            const comp = components.find(c => c.id === compId);
            if (!comp) return;

            if ((comp instanceof Motor || comp instanceof Motor6T) && comp.state.running) {
                activeMotors.add(comp);
                return;
            }

            const getLinkedTerms = (c, tid) => {
                if (c instanceof Breaker && c.state.closed) {
                    if (['L1', 'L2', 'L3'].includes(tid)) return [['T1', 'T2', 'T3'][['L1', 'L2', 'L3'].indexOf(tid)]];
                    if (['T1', 'T2', 'T3'].includes(tid)) return [['L1', 'L2', 'L3'][['T1', 'T2', 'T3'].indexOf(tid)]];
                }
                if (c instanceof Contactor && c.state.engaged) {
                    if (['L1', 'L2', 'L3'].includes(tid)) return [['T1', 'T2', 'T3'][['L1', 'L2', 'L3'].indexOf(tid)]];
                    if (['T1', 'T2', 'T3'].includes(tid)) return [['L1', 'L2', 'L3'][['T1', 'T2', 'T3'].indexOf(tid)]];
                }
                if (c instanceof ThermalRelay && !c.state.tripped) {
                    if (['L1', 'L2', 'L3'].includes(tid)) return [['T1', 'T2', 'T3'][['L1', 'L2', 'L3'].indexOf(tid)]];
                    if (['T1', 'T2', 'T3'].includes(tid)) return [['L1', 'L2', 'L3'][['T1', 'T2', 'T3'].indexOf(tid)]];
                }
                if (c instanceof PhaseBridge) {
                    return ['1', '2', '3'].filter(t => t !== tid);
                }
                return [];
            };

            const linked = getLinkedTerms(comp, termId);
            linked.forEach(nextTerm => trace(compId, nextTerm));

            wires.forEach(w => {
                if (w.isTriple) {
                    const fromSet = ['L1', 'L2', 'L3'], toSet = ['T1', 'T2', 'T3'];
                    const motorSet = ['U1', 'V1', 'W1'], motorSet2 = ['W2', 'U2', 'V2'];
                    const sets = [fromSet, toSet, motorSet, motorSet2, ['U', 'V', 'W']];
                    
                    const activeSet = sets.find(s => s.includes(w.fromId));
                    if (activeSet) {
                         const mySet = sets.find(s => s.includes(termId));
                         if (mySet) {
                             const myIdx = mySet.indexOf(termId);
                             if (w.from.id === compId && myIdx !== -1) {
                                 const targetSet = sets.find(s => s.includes(w.toId)) || activeSet;
                                 trace(w.to.id, targetSet[myIdx]);
                             } else if (w.to.id === compId && myIdx !== -1) {
                                 const targetSet = sets.find(s => s.includes(w.fromId)) || activeSet;
                                 trace(w.from.id, targetSet[myIdx]);
                             }
                         }
                    }
                } else {
                    if (w.from.id === compId && w.fromId === termId) trace(w.to.id, w.toId);
                    else if (w.to.id === compId && w.toId === termId) trace(w.from.id, w.fromId);
                }
            });
        };

        // Identificar la fase exacta en el punto de medición
        let measuredPhase = null;
        if (target.wire) {
            const w = target.wire;
            if (w.isTriple && target.terminalId) {
                const phaseSets = [
                    ['L1', 'L2', 'L3'], ['T1', 'T2', 'T3'], 
                    ['U', 'V', 'W'], ['U1', 'V1', 'W1'], ['W2', 'U2', 'V2']
                ];
                const activeSet = phaseSets.find(s => s.includes(w.fromId));
                if (activeSet) {
                    const idx = activeSet.indexOf(target.terminalId);
                    const phasesAtWire = nodes[`${w.from.id}_${target.terminalId}`];
                    if (phasesAtWire && phasesAtWire.size > 0) measuredPhase = [...phasesAtWire][0];
                }
                trace(w.from.id, target.terminalId);
                trace(w.to.id, target.toTerminalId);
            } else {
                const phasesAtWire = nodes[`${w.from.id}_${w.fromId}`];
                if (phasesAtWire && phasesAtWire.size > 0) measuredPhase = [...phasesAtWire][0];
                trace(w.from.id, w.fromId);
                trace(w.to.id, w.toId);
            }
        } else if (target.component) {
            const phasesAtTerm = nodes[`${target.component.id}_${target.terminalId}`];
            if (phasesAtTerm && phasesAtTerm.size > 0) measuredPhase = [...phasesAtTerm][0];
            trace(target.component.id, target.terminalId);
        }

        let totalCurrent = 0;
        const source = components.find(c => c.type === 'power-source' || c.type === 'single-phase-source');
        
        activeMotors.forEach(m => {
            let actualV = m.state.voltage; 
            if (m instanceof Motor) {
                const uP = nodes[`${m.id}_U`], vP = nodes[`${m.id}_V`];
                actualV = this.getVoltage(uP, vP, nodes);
            } else if (m instanceof Motor6T) {
                const u1P = nodes[`${m.id}_U1`], v1P = nodes[`${m.id}_V1`];
                actualV = this.getVoltage(u1P, v1P, nodes);
            }
            
            // Factor de desequilibrio de fase si conocemos la fase medida
            let phaseFactor = 1.0;
            if (measuredPhase && source && source.state.phaseShifts) {
                let sKey = measuredPhase;
                if (measuredPhase === 'L1' && !source.state.phaseShifts.L1 && source.state.phaseShifts.L) sKey = 'L';
                phaseFactor = source.state.phaseShifts[sKey] || 1.0;
            }

            const current = (m.state.nominalCurrent || 6.5) * (actualV / (m.state.voltage || 480)) * phaseFactor;
            totalCurrent += current;
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

        // Valor digital (Adjusted for high current values)
        ctx.fillStyle = '#00ff41'; // Matrix neon green
        ctx.shadowColor = '#00ff41';
        ctx.shadowBlur = 5;
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.textAlign = 'right';
        const displayValue = isSimulating ? this.value.toFixed(2).padStart(6, ' ') : '  0.00';
        ctx.fillText(displayValue, this.x + this.width - 22, this.y + 40);
        
        ctx.shadowBlur = 0;
        ctx.font = 'bold 9px Inter';
        ctx.fillText(this.unit, this.x + this.width - 12, this.y + 40);

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
            // Dibujar Pinza Amperimétrica (Clamp) - MINIATURA
            const cx = this.clamp.x;
            const cy = this.clamp.y;
            
            ctx.save();
            ctx.translate(cx, cy);
            
            // Mango de la pinza
            ctx.fillStyle = '#f59e0b'; // Ambar
            ctx.roundRect(-4, 0, 8, 20, 2);
            ctx.fill();
            
            // Mandíbulas
            const isClosed = !!this.clamp.target;
            const gap = isClosed ? 0.5 : 5;
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            
            const jawRadius = 6;
            // Mandíbula izquierda
            ctx.beginPath();
            ctx.arc(-3 - gap/2, -4, jawRadius, Math.PI * 0.5, Math.PI * 1.5);
            ctx.stroke();
            
            // Mandíbula derecha
            ctx.beginPath();
            ctx.arc(3 + gap/2, -4, jawRadius, Math.PI * 1.5, Math.PI * 2.5);
            ctx.stroke();
            
            // Gatillo
            ctx.fillStyle = '#b45309';
            ctx.beginPath();
            ctx.moveTo(-4, 5);
            ctx.lineTo(-8, 9);
            ctx.lineTo(-4, 13);
            ctx.fill();
            
            ctx.restore();
        }
    }
}

class Breaker extends Component {
    constructor(x, y) {
        super('breaker', x, y, 100, 120);
        this.state = { closed: false, tripped: false };
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

            if (this.state.tripped) {
                // Efecto de advertencia roja sobre la imagen
                ctx.save();
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 4;
                ctx.strokeRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
                ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
                
                // Texto de TRIP
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 12px Inter';
                ctx.textAlign = 'center';
                ctx.fillText('TRIPPED', this.x + this.width/2, this.y + this.height - 10);
                ctx.restore();
            }
        } else {
            // Fallback vectorial
            ctx.fillStyle = '#475569';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // Indicador LED de estado (pequeño, no cubre la imagen)
        const ledX = this.x + this.width - 15;
        const ledY = this.y + 15;
        ctx.fillStyle = (this.state.tripped || !this.state.closed) ? '#ef4444' : '#22c55e';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ledX, ledY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Terminales
        this.drawTerminals(ctx);
    }
    
    
    toggle() { 
        if (this.state.tripped) {
            this.state.tripped = false;
        } else {
            this.state.closed = !this.state.closed; 
        }
    }
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
    
}

class ThermalRelay extends Component {
    constructor(x, y) {
        super('thermal-relay', x, y, 100, 100);
        this.state = { 
            tripped: false,
            currentLimit: 5.0, // Amperes
            currentSense: 0.0,
            tripEnabled: true,
            resetMode: 'Manual'
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
    
}



class Guardamotor extends Component {
    constructor(x, y) {
        super('guardamotor', x, y, 100, 120);
        this.state = { 
            closed: false,
            tripped: false,
            currentSetting: 6.0,
            range: '4-6.3', // Default range
            currentSense: 0.0,
            tripEnabled: true
        };
        // Parse range for logic usage
        this.rangeMin = 4;
        this.rangeMax = 6.3;
        this.terminals = {
            'L1': {x: 20, y: 10, label: 'L1'}, 'L2': {x: 52, y: 10, label: 'L2'}, 'L3': {x: 84, y: 10, label: 'L3'},
            'T1': {x: 20, y: 110, label: 'T1'}, 'T2': {x: 52, y: 110, label: 'T2'}, 'T3': {x: 84, y: 110, label: 'T3'},
            // Auxiliares (Side/Front simulated positions)
            'NO13': {x: 10, y: 45, label: '13'}, 'NO14': {x: 90, y: 45, label: '14'},
            'NC21': {x: 10, y: 75, label: '21'}, 'NC22': {x: 90, y: 75, label: '22'}
        };
    }
    
    draw(ctx) {
        if (assets[this.type]) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets[this.type], this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#475569';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        const ledX = this.x + this.width - 20;
        const ledY = this.y + 45;
        
        let color = '#ef4444'; 
        if (this.state.closed && !this.state.tripped) color = '#22c55e';
        
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ledX, ledY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (this.state.tripped) {
            ctx.fillStyle = '#fce7f3';
            ctx.font = 'bold 10px Inter';
            ctx.fillText('TRIP', this.x + this.width - 20, this.y + 30);
        }

        // Draw text setting
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`Set: ${this.state.currentSetting}A`, this.x + this.width/2, this.y + 75);

        this.drawTerminals(ctx);
    }
    
    toggle() {
        if (this.state.tripped) {
            this.state.tripped = false;
            this.state.closed = false; 
        } else {
            this.state.closed = !this.state.closed;
        }
    }
}

class ThreePhaseMonitor extends Component {
    // Version: Fix-Sequence-Indication-v2
    constructor(x, y) {
        super('supervisor', x, y, 140, 100); 
        this.label = 'SUP';
        this.terminals = {
            // Inputs (L1, L2, L3)
            // Left to right based on Image: 98, 95, 96 | L1, L2, L3
            // Relays on left:
            '98': {x: 20, y: 85, label: '98'},
            '95': {x: 40, y: 85, label: '95'},
            '96': {x: 60, y: 85, label: '96'},
            
            // Phases on right:
            'L1': {x: 90, y: 85, label: 'L1'},
            'L2': {x: 110, y: 85, label: 'L2'},
            'L3': {x: 130, y: 85, label: 'L3'}
        };
        
        this.state = {
            voltageSetting: 208, // Min Voltage
            maxVoltageSetting: 250, // Max Voltage
            timerSetting: 5000,  // On Delay in ms
            timerCurrent: 0,
            active: false,      // Relay Output (95-98 Closed?)
            fault: 'None',      // None, PhaseLoss, Sequence, UnderVoltage, OverVoltage
            supplyOk: false
        };
    }

    draw(ctx) {
        // Draw Body (Image)
        if (assets['supervisor']) {
             ctx.shadowColor = 'rgba(0,0,0,0.3)';
             ctx.shadowBlur = 15;
            ctx.drawImage(assets['supervisor'], this.x, this.y, this.width, this.height);
             ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#94a3b8';
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
        
        // Draw LEDs
        // Vertical stack on left side typically
        const ledX = this.x + 18;
        const startY = this.y + 26;
        const gap = 10;

        const drawLed = (y, color, on) => {
            ctx.beginPath();
            ctx.arc(ledX, y, 3.5, 0, Math.PI*2);
            ctx.fillStyle = on ? color : '#334155';
            ctx.fill();
            if(on) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 8;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        };

        // 1. Control (Relay Active) - Green
        drawLed(startY, '#22c55e', this.state.active);
        
        // 2. Espera (Waiting) - Yellow
        const waiting = this.state.supplyOk && !this.state.active && this.state.fault === 'None';
        drawLed(startY + gap, '#fbbf24', waiting);
        
        // 3. Sobre Voltaje - Red
        drawLed(startY + gap*2, '#ef4444', this.state.fault === 'OverVoltage');
        
        // 4. Bajo Voltaje - Red
        drawLed(startY + gap*3, '#ef4444', this.state.fault === 'UnderVoltage');
        
        // 5. Falta de Fase - Red
    drawLed(startY + gap*4, '#ef4444', this.state.fault === 'PhaseLoss');

    // 6. Secuencia Invertida - Red
    drawLed(startY + gap*5, '#ef4444', this.state.fault === 'Sequence');
    if (!assets['supervisor']) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px Arial';
        ctx.fillText('SEC', ledX + 10, startY + gap*5 + 3);
    }

        // Draw Terminals
        this.drawTerminals(ctx);
        
        // Hover Overlay for Settings
        if (this.isMouseOver(mousePos.x, mousePos.y)) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(this.x, this.y - 22, this.width, 20);
            ctx.fillStyle = '#fff';
            ctx.font = '11px Inter';
            ctx.fillText(`Vmin:${this.state.voltageSetting}V Vmax:${this.state.maxVoltageSetting}V`, this.x + 5, this.y - 8);
            ctx.fillText(`T:${this.state.timerSetting/1000}s`, this.x + 5, this.y + 4);
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

    update() {
        if (window.motorAudio) {
            if (this.state.running) {
                if (!window.motorAudio.isPlaying) {
                    if (window.motorAudio.audioCtx && window.motorAudio.audioCtx.state === 'suspended') {
                        window.motorAudio.audioCtx.resume();
                    }
                    window.motorAudio.start();
                }
                window.motorAudio.setPitch(1.0); // Tono normal para motor estándar
            } else {
                if (window.motorAudio.isPlaying) {
                    // Solo detener si no hay otros motores funcionando
                    const others = window.components.filter(c => c.id !== this.id && c.state && c.state.running);
                    if (others.length === 0) window.motorAudio.stop();
                }
            }
        }
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

    
}



class PushButton extends Component {
    constructor(type, x, y) {
        super(type, x, y, 60, 60);
        this.terminals = { 
            '1': {x: 0, y: 50, label: '1'}, 
            '2': {x: 60, y: 50, label: '2'} 
        };
        this.state = { pressed: false };
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.translate(-this.width/2, -this.height/2);

        // Si hay imagen cargada, usar la imagen base y solo agregar efectos de presión
        if (assets[this.type]) {
            // Sombra para dar profundidad
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets[this.type], 0, 0, this.width, this.height);
            ctx.shadowBlur = 0;
            
            // Efecto de presión: oscurecer levemente el botón
            if (this.state.pressed) {
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.arc(30, 25, 18, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Fallback: dibujar botón vectorial si no hay imagen
            const btnColor = this.type.includes('green') ? '#22c55e' : '#ef4444';
            const pressOffset = this.state.pressed ? 2 : 0;
            
            // Casing ring
            ctx.beginPath(); ctx.arc(30, 25, 22, 0, Math.PI*2); 
            ctx.fillStyle = '#cbd5e1'; ctx.fill(); ctx.stroke();

            // Button itself
            ctx.beginPath(); ctx.arc(30, 25 + pressOffset, 18, 0, Math.PI*2);
            const grad = ctx.createRadialGradient(30-5, 25+pressOffset-5, 2, 30, 25+pressOffset, 18);
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
        ctx.restore();
        
        // Dibujar terminales
        this.drawTerminals(ctx);
    }
    
}

class PilotLight extends Component {
    constructor(type, x, y) {
        super(type, x, y, 50, 50);
        this.terminals = { 
            'X1': {x: 0, y: 45, label: 'X1'}, 
            'X2': {x: 50, y: 45, label: 'X2'} 
        };
        this.state = { on: false };
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.translate(-this.width/2, -this.height/2);

        // 1. Dibujar imagen base si existe
        if (assets[this.type]) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets[this.type], 0, 0, this.width, this.height);
            ctx.shadowBlur = 0;
        } else {
            // Fallback: círculo gris
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.arc(25, 25, 20, 0, Math.PI * 2);
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
            ctx.arc(25, 25, 14, 0, Math.PI * 2); 
            ctx.fill();
            ctx.globalAlpha = 1.0; 
            ctx.shadowBlur = 0;
        }
        ctx.restore();
        
        // 3. Terminales
        this.drawTerminals(ctx);
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
            setting: 5000, // 5 seconds
            mode: 'TON' // 'TON' (On-Delay) or 'TOF' (Off-Delay)
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
        if (this.state.active || this.state.timeElapsed > 0) {
            const angle = -Math.PI/2 + (this.state.timeElapsed / this.state.setting) * (2*Math.PI);
            ctx.strokeStyle = this.state.mode === 'TOF' ? '#3b82f6' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + 30, this.y + 30);
            ctx.lineTo(this.x + 30 + 15 * Math.cos(angle), this.y + 30 + 15 * Math.sin(angle));
            ctx.stroke();
        }
        
        // Mode indicator (TON/TOF)
        ctx.fillStyle = this.state.mode === 'TOF' ? '#3b82f6' : '#fbbf24';
        ctx.font = 'bold 9px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(this.state.mode, this.x + 30, this.y + 70);
        
        // Done indicator LED
        ctx.fillStyle = this.state.done ? '#22c55e' : '#475569';
        ctx.beginPath();
        ctx.arc(this.x + 30, this.y + 85, 5, 0, Math.PI * 2);
        ctx.fill();
        if (this.state.done) {
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        this.drawTerminals(ctx);
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

    update() {
        if (window.motorAudio) {
            if (this.state.running) {
                if (!window.motorAudio.isPlaying) {
                    if (window.motorAudio.audioCtx && window.motorAudio.audioCtx.state === 'suspended') {
                        window.motorAudio.audioCtx.resume();
                    }
                    window.motorAudio.start();
                }
                // Variar tono según conexión: Estrella = tono bajo (arranque), Delta = tono nominal
                const pitch = this.state.connection === 'Star' ? 0.7 : 1.0;
                window.motorAudio.setPitch(pitch);
            } else {
                if (window.motorAudio.isPlaying) {
                    const others = window.components.filter(c => c.id !== this.id && c.state && c.state.running);
                    if (others.length === 0) window.motorAudio.stop();
                }
            }
        }
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
            
            // Velocidad diferenciada: Estrella = arranque lento (~58%), Delta = velocidad nominal
            const speedMultiplier = this.state.connection === 'Star' ? 0.04 : 0.08;
            
            // Actualizar ángulo
            this.state.angle += speedMultiplier * this.state.direction;
            
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
            
            // RPM según conexión (Star = reducida, Delta = nominal)
            const displayRPM = this.state.connection === 'Star' 
                ? Math.round(this.state.rpm * 0.58) 
                : this.state.rpm;
            
            // Indicador de conexión (Star/Delta) y dirección
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 11px Inter';
            ctx.textAlign = 'center';
            const connSymbol = this.state.connection === 'Star' ? '★ Y' : '△ Δ';
            ctx.fillText(connSymbol, this.x + 80, this.y + 145);
            
            // Flecha de dirección
            ctx.font = 'bold 14px Arial';
            ctx.fillText(this.state.direction > 0 ? '⟳' : '⟲', this.x + 20, this.y + 80);

            ctx.textAlign = 'left';
            ctx.fillText(`${this.state.hp}HP ${this.state.voltage}V`, this.x + 100, this.y + 110);
            ctx.fillText(`${this.state.nominalCurrent}A ${displayRPM}RPM`, this.x + 100, this.y + 125);
        }
        
        this.drawTerminals(ctx);
    }
}

class DahlanderMotor extends Component {
    constructor(x, y) {
        super('dahlander-motor', x, y, 230, 160);
        this.state = { 
            running: false, 
            speedMode: 'None', 
            angle: 0, 
            direction: 1,
            hp: 5,
            voltage: 480,
            pf: 0.86,
            eff: 90,
            rpm: 0
        };
        
        const fpX = 90; 
        const row1Y = 55;
        const row2Y = 90;
        const bottomY = 135;
        
        this.terminals = {
            '1U': {x: fpX + 30, y: row1Y, label: '1U'}, 
            '1V': {x: fpX + 55, y: row1Y, label: '1V'}, 
            '1W': {x: fpX + 80, y: row1Y, label: '1W'},
            '2U': {x: fpX + 30, y: row2Y, label: '2U'}, 
            '2V': {x: fpX + 55, y: row2Y, label: '2V'}, 
            '2W': {x: fpX + 80, y: row2Y, label: '2W'},
            'T1': {x: fpX + 30, y: bottomY, label: 'T1'}, 
            'T2': {x: fpX + 55, y: bottomY, label: 'T2'},
            'PE': {x: fpX + 110, y: bottomY, label: 'PE'}
        };
        
        this.frameCounter = 0;
        this.errorMsg = '';
    }

    update() {
        this.frameCounter++;
        const nodes = window.lastSolvedNodes || {};
        this.errorMsg = '';
        
        const getPhase = (termId) => {
            const nSet = nodes[`${this.id}_${termId}`];
            if (!nSet) return null;
            for (let id of nSet) {
                if (['L1', 'L2', 'L3'].includes(id)) return id;
                if (id === 'L') return 'L1'; 
            }
            return null;
        };

        const p1u = getPhase('1U'), p1v = getPhase('1V'), p1w = getPhase('1W');
        const p2u = getPhase('2U'), p2v = getPhase('2V'), p2w = getPhase('2W');

        const hasPower1 = !!(p1u && p1v && p1w);
        const hasPower2 = !!(p2u && p2v && p2w);

        let isShorted1 = false;
        let commonNode = null;
        const n1u = nodes[`${this.id}_1U`], n1v = nodes[`${this.id}_1V`], n1w = nodes[`${this.id}_1W`];
        
        if (n1u && n1v && n1w && n1u.size > 0) {
            const allNodes = [...n1u];
            const common = allNodes.filter(id => n1v.has(id) && n1w.has(id));
            // Correctly exclude Grid Phases
            const validCommon = common.filter(id => !['L1', 'L2', 'L3', 'N', 'PE'].includes(id));
            
            if (validCommon.length > 0) {
                isShorted1 = true;
                commonNode = validCommon[0];
            }
        }

        this.state.running = false;
        this.state.speedMode = 'None';
        this.state.rpm = 0;
        let targetPitch = 1.0;

        // Helper: Check phases are distinct
        const checkPhases = (a, b, c) => {
            if (!a || !b || !c) return false;
            if (a === b || b === c || a === c) {
                this.errorMsg = `DUPLICATE: ${a}-${b}-${c}`;
                return false;
            }
            return true;
        };

        // --- LOGIC ---
        // 1. HIGH SPEED (Priority)
        if (hasPower2 && isShorted1) {
             if (checkPhases(p2u, p2v, p2w)) {
                this.state.running = true;
                this.state.speedMode = 'High';
                this.state.rpm = 3500;
                this.state.direction = this.getDirection(p2u, p2v, p2w);
                targetPitch = 1.5;
             }
        }
        // 2. LOW SPEED
        // Removed !hasPower2 to allow operation even if ghost voltage exists on 2
        else if (hasPower1 && !isShorted1) {
             if (checkPhases(p1u, p1v, p1w)) {
                this.state.running = true;
                this.state.speedMode = 'Low';
                this.state.rpm = 1750;
                this.state.direction = this.getDirection(p1u, p1v, p1w);
                targetPitch = 1.0;
             }
        }

        if (this.frameCounter % 100 === 0) {
            console.groupCollapsed(`Dahlander [${this.id}] Debug v11.0`);
            console.log('Short?', isShorted1);
            console.log('Phase Error?', this.errorMsg);
            console.groupEnd();
        }
        
        const fmt = (p) => p ? p.substring(0,2) : '-';
        const sID = commonNode ? String(commonNode).substring(0,4) : 'NO';
        this.debugInfo = `1:${fmt(p1u)}${fmt(p1v)}${fmt(p1w)} 2:${fmt(p2u)}${fmt(p2v)}${fmt(p2w)} S:${sID}`;

        if (window.motorAudio) {
            if (this.state.running) {
                if (!window.motorAudio.isPlaying) {
                    if (window.motorAudio.audioCtx && window.motorAudio.audioCtx.state === 'suspended') {
                         window.motorAudio.audioCtx.resume();
                    }
                    console.log("Dahlander starting audio...");
                    window.motorAudio.start();
                }
                window.motorAudio.setPitch(targetPitch);
            } else {
                if (window.motorAudio.isPlaying && this.state.rpm === 0) {
                     const others = window.components.filter(c => c.id !== this.id && c.state && c.state.running);
                     if (others.length === 0) window.motorAudio.stop();
                }
            }
        }
    }

    getDirection(p1, p2, p3) {
        return getThreePhaseDirection(p1, p2, p3);
    }

    draw(ctx) {
        if (assets[this.type]) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.drawImage(assets[this.type], this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#f97316'; ctx.fillRect(this.x, this.y, 80, this.height);
            ctx.fillStyle = '#e2e8f0'; ctx.fillRect(this.x+80, this.y, 150, this.height);
        }

        // Rotor (Centered with shaft)
        const rotorX = this.x + 15; 
        const rotorY = this.y + 78; 
        
        if (this.state.running) {
            const speed = (this.state.speedMode === 'High') ? 0.4 : 0.2;
            this.state.angle += speed * this.state.direction;
            
            ctx.save();
            ctx.translate(rotorX, rotorY);
            ctx.rotate(this.state.angle);
            ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(0,0, 20, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = '#94a3b8'; 
            for(let i=0; i<8; i++) {
                ctx.beginPath(); ctx.moveTo(18, -2); ctx.lineTo(28, -4); ctx.lineTo(28, 4); ctx.lineTo(18, 2);
                ctx.fill(); ctx.rotate(Math.PI/4);
            }
            ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(0,0, 8, 0, Math.PI*2); ctx.fill();
            ctx.restore();
            
            ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
            ctx.fillText(`${this.state.rpm}`, rotorX, rotorY + 45);
        } else {
             ctx.save(); ctx.translate(rotorX, rotorY);
             ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(0,0, 20, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(0,0, 8, 0, Math.PI*2); ctx.fill();
             ctx.restore();
        }

        // LEDs
        const fpX = this.x + 90; 
        const isHigh = this.state.speedMode === 'High';
        const isLow = this.state.speedMode === 'Low';
        
        ctx.beginPath(); ctx.arc(fpX + 115, this.y + 60, 4, 0, Math.PI*2);
        ctx.fillStyle = isLow ? '#22c55e' : '#cbd5e1'; ctx.fill();
        if(isLow) {
            ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
            ctx.fillStyle = '#22c55e'; ctx.font = 'bold 9px Inter'; ctx.textAlign = 'left';
            ctx.fillText("BAJA", fpX + 122, this.y + 63);
        }

        ctx.beginPath(); ctx.arc(fpX + 115, this.y + 95, 4, 0, Math.PI*2);
        ctx.fillStyle = isHigh ? '#3b82f6' : '#cbd5e1'; ctx.fill();
        if(isHigh) {
            ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
            ctx.fillStyle = '#3b82f6'; ctx.font = 'bold 9px Inter'; ctx.textAlign = 'left';
            ctx.fillText("ALTA", fpX + 122, this.y + 98);
        }

        this.drawTerminals(ctx);
        
        // Error Warning
        if (this.errorMsg) {
             ctx.fillStyle = 'rgba(239, 68, 68, 0.9)'; 
             ctx.fillRect(this.x + 85, this.y + 30, 140, 20);
             ctx.fillStyle = '#fff';
             ctx.font = 'bold 10px monospace';
             ctx.textAlign = 'center';
             ctx.fillText(this.errorMsg, this.x + 155, this.y + 43);
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
            // Draw lines between them to visualize the short
            if(id !== '3') {
               ctx.beginPath(); ctx.moveTo(tx, ty); 
               // Next terminal
               const nextId = String(parseInt(id)+1);
               const nextT = this.terminals[nextId];
               if(nextT) ctx.lineTo(this.x + nextT.x, this.y + nextT.y);
               ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth=4; ctx.stroke();
            }
        }
    }
}

class AlternatingRelay extends Component {
    constructor(x, y) {
        super('alternating-relay', x, y, 70, 110);
        this.terminals = {
            '5': { x: 10, y: 10, label: '5', unused: true },
            '6': { x: 26, y: 10, label: '6' },
            '7': { x: 42, y: 10, label: '7' },
            '8': { x: 58, y: 10, label: '8' },
            '1': { x: 10, y: 100, label: '1', unused: true },
            '2': { x: 26, y: 100, label: '2' },
            '3': { x: 42, y: 100, label: '3' },
            '4': { x: 58, y: 100, label: '4' }
        };
        this.state = {
            currentPump: 1, // 1 or 2
            lastSensorClosed: false,
            coilActive: false
        };
    }

    draw(ctx) {
        const img = assets['alternating-relay'];
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 12;
            ctx.drawImage(img, this.x, this.y, this.width, this.height);
            ctx.restore();
        } else {
            // Fallback: Black Body (Dinamico)
            ctx.save();
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 8px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('ELECTROMATICS', this.x + this.width/2, this.y + 70);
            ctx.fillText('RELÉ ALTERNADOR', this.x + this.width/2, this.y + 80);
            ctx.restore();
        }

        // LEDs indicadores
        const ledY = this.y + 42;
        ctx.save();
        // LED M1 (Cerca de t6)
        ctx.fillStyle = (this.state.coilActive && this.state.currentPump === 1) ? '#22c55e' : '#475569';
        ctx.beginPath(); ctx.arc(this.x + 26, ledY, 3, 0, Math.PI*2); ctx.fill();
        // LED M2 (Cerca de t8)
        ctx.fillStyle = (this.state.coilActive && this.state.currentPump === 2) ? '#22c55e' : '#475569';
        ctx.beginPath(); ctx.arc(this.x + 58, ledY, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        this.drawTerminals(ctx);
    }
}

class FloatSwitch extends Component {
    constructor(x, y) {
        super('float-switch', x, y, 70, 50);
        this.terminals = {
            'COM': { x: -30, y: 0, label: 'COM (Negro)' }, 
            'NO': { x: -30, y: 15, label: 'NO (Azul)' },
            'NC': { x: -30, y: -15, label: 'NC (Marrón)' }
        };
        this.state = {
            highLevel: false, // false = Down (NC closed), true = Up (NO closed)
            angle: Math.PI / 4
        };
    }

    draw(ctx) {
        const targetAngle = this.state.highLevel ? -Math.PI / 4 : Math.PI / 4;
        this.state.angle += (targetAngle - this.state.angle) * 0.1;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        ctx.moveTo(-100, 0); 
        ctx.quadraticCurveTo(-50, 0, 0, 0);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.rotate(this.state.angle);
        const img = assets['float-switch'];
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 10;
            ctx.drawImage(img, -this.width/2, -this.height/2, this.width, this.height);
        } else {
            ctx.fillStyle = this.state.highLevel ? '#3b82f6' : '#fbbf24';
            ctx.beginPath();
            ctx.roundRect(-this.width/2, -this.height/2, this.width, this.height, 10);
            ctx.fill();
        }
        ctx.restore();
        this.drawTerminals(ctx);
    }

    drawTerminals(ctx) {
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            ctx.beginPath();
            ctx.arc(tx, ty, 6, 0, Math.PI*2);
            ctx.fillStyle = (id === 'COM') ? '#1e293b' : (id === 'NO' ? '#3b82f6' : '#92400e');
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(id, tx - 12, ty + 4);
        }
    }

    toggle() {
        this.state.highLevel = !this.state.highLevel;
    }
}

class TerminalBlock extends Component {
    constructor(x, y, poles = 6) {
        super('terminal-block', x, y, poles * 20, 80);
        this.state = { poles: poles };
        this.updateTerminals();
    }

    updateTerminals() {
        this.terminals = {};
        this.width = this.state.poles * 20;
        for (let i = 1; i <= this.state.poles; i++) {
            const offsetX = -this.width / 2 + (i - 1) * 20 + 10;
            // Superior (n)
            this.terminals[`${i}`] = { x: offsetX, y: -30, label: `${i}` };
            // Inferior (n')
            this.terminals[`${i}'`] = { x: offsetX, y: 30, label: `${i}'` };
        }
    }

    updatePoles(count) {
        this.state.poles = Math.max(2, Math.min(20, count));
        this.updateTerminals();
        if (typeof draw === 'function') draw();
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // DIN Rail Background (Simulated)
        ctx.fillStyle = '#64748b'; // Steel rail color
        ctx.fillRect(-this.width/2 - 5, -10, this.width + 10, 20);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(-this.width/2 - 5, -10, this.width + 10, 20);

        // Draw each pole body
        for (let i = 0; i < this.state.poles; i++) {
            const px = -this.width/2 + i * 20;
            
            // Plastic body
            ctx.fillStyle = '#cbd5e1'; // Gray/Beige plastic
            ctx.fillRect(px + 1, -this.height/2, 18, this.height);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 1, -this.height/2, 18, this.height);

            // Middle separator
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(px + 1, -2, 18, 4);

            // Screw holes/Terminals Visual
            ctx.fillStyle = '#334155'; // Metal/Shadow
            // Top screw
            ctx.beginPath(); ctx.arc(px + 10, -30, 4, 0, Math.PI*2); ctx.fill();
            // Bottom screw
            ctx.beginPath(); ctx.arc(px + 10, 30, 4, 0, Math.PI*2); ctx.fill();
            
            // Screw head detail (Cross)
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1;
            [-30, 30].forEach(y => {
                ctx.beginPath();
                ctx.moveTo(px + 7, y); ctx.lineTo(px + 13, y);
                ctx.moveTo(px + 10, y - 3); ctx.lineTo(px + 10, y + 3);
                ctx.stroke();
            });

            // Label
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 9px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(i + 1, px + 10, 4);
        }

        ctx.restore();
        this.drawTerminals(ctx);
    }

    drawTerminals(ctx) {
        // We override this to draw smaller, more integrated terminal markers
        for (const [id, t] of Object.entries(this.terminals)) {
            const tx = this.x + t.x;
            const ty = this.y + t.y;
            
            ctx.beginPath();
            ctx.arc(tx, ty, 4, 0, Math.PI*2);
            ctx.fillStyle = '#f59e0b'; // Amber for terminal hits
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Label is already drawn in the main draw loop for better placement
        }
    }
}

class PressureSwitch extends Component {
    constructor(x, y) {
        super('pressure-switch', x, y, 60, 70);
        this.terminals = {
            '1': { x: -20, y: -25, label: '1' },
            '2': { x: 20, y: -25, label: '2' },
            '3': { x: -20, y: 25, label: '3' },
            '4': { x: 20, y: 25, label: '4' }
        };
        this.state = {
            highPressure: false, // false = < 20 PSI (Closed), true = > 40 PSI (Open)
            contactsClosed: true
        };
    }

    toggle() {
        this.state.highPressure = !this.state.highPressure;
        this.state.contactsClosed = !this.state.highPressure;
        if (typeof draw === 'function') draw();
    }

    draw(ctx) {
        const img = assets['pressure-switch'];
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 8;
            ctx.drawImage(img, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
            ctx.restore();
        } else {
            // Fallback robusto
            ctx.save();
            ctx.fillStyle = '#475569';
            ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
            ctx.strokeStyle = '#334155';
            ctx.strokeRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
            ctx.restore();
        }

        // Indicador de Presión
        ctx.save();
        const indicatorColor = this.state.highPressure ? '#ef4444' : '#22c55e';
        ctx.fillStyle = indicatorColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y + 10, 4, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(this.state.highPressure ? '40 PSI' : '20 PSI', this.x, this.y + 22);
        ctx.restore();

        this.drawTerminals(ctx);
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
    
    // domScale: Relación entre Pixeles Internos (buffer) y Pixeles Pantalla (CSS)
    const domScaleX = canvas.width / rect.width;
    const domScaleY = canvas.height / rect.height;

    const rawX = (clientX - rect.left) * domScaleX;
    const rawY = (clientY - rect.top) * domScaleY;
    
    // Logical Scale (Zoom del dibujo ctx.scale)
    return {
        x: rawX / currentScale,
        y: rawY / currentScale
    };
}

function loop() {
    if (isSimulating) {
        solveCircuit();
        
        // Sincronizar audio del motor con el estado de los motores
        const anyMotorRunning = components.some(c => 
            (c instanceof Motor || c instanceof Motor6T || (typeof DahlanderMotor !== 'undefined' && c instanceof DahlanderMotor)) && c.state.running
        );
        motorAudio.update(anyMotorRunning);

        // Actualizar estados dinámicos de componentes (fuentes, etc.)
        components.forEach(c => {
            if (c.update) c.update();
        });
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
        currentScale = Math.min(currentScale + 0.1, 2.0); 
        window.scale = currentScale;
        resizeCanvas(); 
    });
    if(btnZoomOut) btnZoomOut.addEventListener('click', () => { 
        currentScale = Math.max(currentScale - 0.1, 0.5); 
        window.scale = currentScale;
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
        if (e.key === 'Escape') {
            if (wireStartObj) {
                wireStartObj = null;
                draw();
            }
            if (selectedWire) {
                selectedWire = null;
                draw();
            }
        }
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
            } else {
                // Borrar multímetro si el mouse está encima
                for (let i = multimeters.length - 1; i >= 0; i--) {
                    const m = multimeters[i];
                    if (mousePos.x > m.x && mousePos.x < m.x + m.width && mousePos.y > m.y && mousePos.y < m.y + m.height) {
                        multimeters.splice(i, 1);
                        draw();
                        return;
                    }
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
            if (isSimulating) return;
            // Permitir múltiples multímetros
            multimeters.push(new Multimeter(400 + multimeters.length * 20, 300 + multimeters.length * 20));
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
        
        // Si estamos cableando, el click derecho CANCELA el cableado
        if (wireStartObj) {
            wireStartObj = null;
            draw();
            return;
        }

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
        for (const m of multimeters) {
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
        if (component instanceof Multimeter) {
            title.innerText = 'MULTÍMETRO';
        } else if (component instanceof Guardamotor) {
             title.innerText = 'GUARDAMOTOR';
        } else if (component.type) {
            title.innerText = component.type.replace('-', ' ').toUpperCase();
        } else {
            title.innerText = 'COMPONENTE';
        }
        
        ctxMenu.style.left = `${x}px`;
        ctxMenu.style.top = `${y}px`;
        ctxMenu.style.display = 'block';

        // Mostrar controles específicos
        
        // 1. Controls for Thermal Relay
        if (component instanceof ThermalRelay || component.type === 'thermal-relay') {
             thermal.style.display = 'block';
             const inputLimit = document.getElementById('input-limit');
             inputLimit.value = component.state.currentLimit;
             inputLimit.onchange = (e) => component.state.currentLimit = parseFloat(e.target.value);
             
             const selectReset = document.getElementById('select-thermal-reset');
             if (selectReset) {
                 selectReset.value = component.state.resetMode || 'Manual';
                 selectReset.onchange = (e) => {
                     component.state.resetMode = e.target.value;
                     draw();
                 };
             }

             document.getElementById('btn-reset-relay').onclick = () => { component.state.tripped = false; draw(); };
        } else {
             thermal.style.display = 'none';
        }

        // 2. Controls for Guardamotor
        const gmControls = document.getElementById('guardamotor-controls');
        if (component instanceof Guardamotor) {
             gmControls.style.display = 'block';
             
             const rangeSelect = document.getElementById('select-guardamotor-range');
             const settingInput = document.getElementById('input-guardamotor-setting');
             
             // Sync UI with State
             rangeSelect.value = component.state.range;
             settingInput.value = component.state.currentSetting;
             settingInput.min = component.rangeMin;
             settingInput.max = component.rangeMax;

             // Listeners
             rangeSelect.onchange = (e) => {
                 const val = e.target.value;
                 component.state.range = val;
                 const [min, max] = val.split('-').map(parseFloat);
                 component.rangeMin = min;
                 component.rangeMax = max;
                 
                 // Auto-adjust setting if out of new range
                 if (component.state.currentSetting < min) component.state.currentSetting = min;
                 if (component.state.currentSetting > max) component.state.currentSetting = max;
                 
                 settingInput.min = min;
                 settingInput.max = max;
                 settingInput.value = component.state.currentSetting;
                 draw();
             };

             settingInput.onchange = (e) => {
                 let val = parseFloat(e.target.value);
                 if (val < component.rangeMin) val = component.rangeMin;
                 if (val > component.rangeMax) val = component.rangeMax;
                 component.state.currentSetting = val;
                 e.target.value = val;
                 draw(); // Update visuals
             };

             document.getElementById('btn-reset-guardamotor').onclick = () => {
                 component.state.tripped = false;
                 component.state.closed = false; // Reset to OFF
                 draw();
             };

        } else {
             if(gmControls) gmControls.style.display = 'none';
        }

        // 3. Controls for Supervisor
        const supControls = document.getElementById('supervisor-controls');
        if (supControls) {
            if (component instanceof ThreePhaseMonitor) {
                supControls.style.display = 'block';
                const inputMin = document.getElementById('input-supervisor-min');
                const inputTime = document.getElementById('input-supervisor-time');
                
                inputMin.value = component.state.voltageSetting;
                inputTime.value = component.state.timerSetting / 1000;
                
                inputMin.onchange = (e) => {
                    component.state.voltageSetting = parseFloat(e.target.value);
                };
                inputTime.onchange = (e) => {
                    component.state.timerSetting = parseFloat(e.target.value) * 1000;
                };
            } else {
                supControls.style.display = 'none';
            }
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
                
                // Time setting
                const inputTimer = document.getElementById('input-timer-sec');
                inputTimer.value = component.state.setting / 1000;
                inputTimer.onchange = (e) => {
                    component.state.setting = parseFloat(e.target.value) * 1000;
                };
                
                // Mode selector (TON/TOF)
                const selectMode = document.getElementById('select-timer-mode');
                if (selectMode) {
                    selectMode.value = component.state.mode || 'TON';
                    selectMode.onchange = (e) => {
                        component.state.mode = e.target.value;
                        // Reset timer state when changing mode
                        component.state.timeElapsed = 0;
                        component.state.done = false;
                        component.state.active = false;
                        draw();
                    };
                }
            } else {
                timerControls.style.display = 'none';
            }
        }

        // Relé Alternador Controls
        const relayControls = document.getElementById('relay-controls');
        if (relayControls) {
            if (component instanceof AlternatingRelay || component.type === 'alternating-relay') {
                relayControls.style.display = 'block';
                document.getElementById('btn-toggle-pump').onclick = () => {
                    component.state.currentPump = component.state.currentPump === 1 ? 2 : 1;
                    draw();
                };
            } else {
                relayControls.style.display = 'none';
            }
        }

        // Regleta de Bornes Controls
        const terminalControls = document.getElementById('terminal-controls');
        if (terminalControls) {
            if (component instanceof TerminalBlock || component.type === 'terminal-block') {
                terminalControls.style.display = 'block';
                const inputPoles = document.getElementById('input-terminal-poles');
                const valDisplay = document.getElementById('poles-count-val');
                inputPoles.value = component.state.poles;
                valDisplay.innerText = component.state.poles;
                
                inputPoles.oninput = (e) => {
                    const count = parseInt(e.target.value);
                    valDisplay.innerText = count;
                    component.updatePoles(count);
                };
            } else {
                terminalControls.style.display = 'none';
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

                // Sliders
                const sL1 = document.getElementById('slider-vL1');
                const sL2 = document.getElementById('slider-vL2');
                const sL3 = document.getElementById('slider-vL3');
                const vL1 = document.getElementById('val-vL1');
                const vL2 = document.getElementById('val-vL2');
                const vL3 = document.getElementById('val-vL3');

                // Init Values
                selectVoltage.value = component.state.voltage;
                
                // Initialize state if undefined (backward compatibility)
                if (component.state.vL1 === undefined) component.state.vL1 = component.state.voltage;
                if (component.state.vL2 === undefined) component.state.vL2 = component.state.voltage;
                if (component.state.vL3 === undefined) component.state.vL3 = component.state.voltage;

                if(sL1) { sL1.value = component.state.vL1; if(vL1) vL1.innerText = component.state.vL1; }
                if(sL2) { sL2.value = component.state.vL2; if(vL2) vL2.innerText = component.state.vL2; }
                if(sL3) { sL3.value = component.state.vL3; if(vL3) vL3.innerText = component.state.vL3; }

                // Handlers
                selectVoltage.onchange = (e) => {
                    const val = parseInt(e.target.value);
                    component.state.voltage = val;
                    // Reset all phases to base
                    component.state.vL1 = val;
                    component.state.vL2 = val;
                    component.state.vL3 = val;
                    // Update UI
                    if(sL1) { sL1.value = val; if(vL1) vL1.innerText = val; }
                    if(sL2) { sL2.value = val; if(vL2) vL2.innerText = val; }
                    if(sL3) { sL3.value = val; if(vL3) vL3.innerText = val; }
                    draw();
                };

                const updatePhase = (phase, val) => {
                    component.state[phase] = parseInt(val);
                    if(phase === 'vL1' && vL1) vL1.innerText = val;
                    if(phase === 'vL2' && vL2) vL2.innerText = val;
                    if(phase === 'vL3' && vL3) vL3.innerText = val;
                    draw();
                };

                if(sL1) sL1.oninput = (e) => updatePhase('vL1', e.target.value);
                if(sL2) sL2.oninput = (e) => updatePhase('vL2', e.target.value);
                if(sL3) sL3.oninput = (e) => updatePhase('vL3', e.target.value);
            } else {
                sourceControls.style.display = 'none';
            }
        }

        // Multímetro Controls
        const multimeterControls = document.getElementById('multimeter-controls');
        if (multimeterControls) {
            if (component instanceof Multimeter) {
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

        // Supervisor Trifásico Controls
        const supervisorControls = document.getElementById('supervisor-controls');
        if (supervisorControls) {
            if (component instanceof ThreePhaseMonitor) {
                supervisorControls.style.display = 'block';
                const inputMin = document.getElementById('input-supervisor-min');
                const inputMax = document.getElementById('input-supervisor-max');
                const inputTime = document.getElementById('input-supervisor-time');
                
                if (inputMin) {
                    inputMin.value = component.state.voltageSetting;
                    inputMin.onchange = (e) => {
                        component.state.voltageSetting = parseInt(e.target.value);
                        draw();
                    };
                }

                if (inputMax) {
                    inputMax.value = component.state.maxVoltageSetting || 250;
                    inputMax.onchange = (e) => {
                        component.state.maxVoltageSetting = parseInt(e.target.value);
                        draw();
                    };
                }
                
                if (inputTime) {
                    inputTime.value = component.state.timerSetting / 1000;
                    inputTime.onchange = (e) => {
                        component.state.timerSetting = parseFloat(e.target.value) * 1000;
                        draw();
                    };
                }
            } else {
                supervisorControls.style.display = 'none';
            }
        }

        // Rotación de Componentes
        const btnRotate = document.getElementById('btn-rotate-comp');
        if (btnRotate) {
             const type = component.type || "";
             const canRotate = (component instanceof PushButton || component instanceof PilotLight || 
                                type.includes('btn') || type.includes('pilot'));
             
             btnRotate.style.display = canRotate ? 'flex' : 'none';
             btnRotate.onclick = (e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 component.rotation = (component.rotation || 0) + 90;
                 if (component.rotation >= 360) component.rotation = 0;
                 console.log(`Rotating ${component.type} to ${component.rotation}`);
                 ctxMenu.style.display = 'none';
                 draw();
             };
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
        case 'alternating-relay': c = new AlternatingRelay(x, y); break;
        case 'float-switch': c = new FloatSwitch(x, y); break;
        case 'terminal-block': c = new TerminalBlock(x, y); break;
        case 'pressure-switch': c = new PressureSwitch(x, y); break;
        case 'guardamotor': c = new Guardamotor(x, y); break;
        case 'supervisor': c = new ThreePhaseMonitor(x, y); break;
        case 'dahlander-motor':
        case 'dahlander': c = new DahlanderMotor(x, y); break;
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
            if (Math.hypot(mx - pt.x, my - pt.y) < 10) {
                pushHistory();
                draggingHandle = { wire: selectedWire, index: i };
                return;
            }
        }
    }

    // 0.2 Multímetro (Instrumento)
    for (const m of multimeters) {
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
            if (Math.hypot(mx - m.clamp.x, my - m.clamp.y) < 20) {
                m.draggingProbe = 'clamp';
                return;
            }
        }
        
        // Body Dragging
        const isOnKnob = Math.hypot(mx - (m.x + m.width/2), my - (m.y + 80)) < 15;
        
        if (isOnKnob) {
            m.mode = (m.mode === 'VAC' ? 'AAC' : 'VAC');
            m.value = 0;
            draw();
            return;
        }

        if (mx > m.x && mx <= m.x + m.width && my > m.y && my <= m.y + m.height) {
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
            if (c instanceof FloatSwitch) c.toggle();
            if (c instanceof PressureSwitch) c.toggle();
            if (c instanceof Guardamotor) c.toggle();
            if (c instanceof PushButton) c.state.pressed = true;

            // Selección y arrastre (Solo si NO estamos simulando)
            if (!isSimulating) {
                // Check if clicked ON SLIDER area for PowerSource
                if (c instanceof PowerSource || c instanceof SinglePhaseSource) {
                    const sliderY = c.y - 25;
                    if (my > sliderY - 15 && my < sliderY + 15) {
                         const minV = (c instanceof PowerSource) ? 208 : 100;
                         const maxV = (c instanceof PowerSource) ? 600 : 250;
                         const perc = Math.max(0, Math.min(1, (mx - (c.x + 10)) / (c.width - 20)));
                         c.state.voltage = Math.round(minV + perc * (maxV - minV));
                         
                         pushHistory();
                         dragItem = { comp: c, isSlider: true };
                         selectedComponent = c;
                         draw();
                         return;
                    }
                    // Check Random button
                    if (mx > c.x + c.width - 25 && mx < c.x + c.width - 5 && my > c.y + 5 && my < c.y + 15) {
                        c.state.randomEnabled = !c.state.randomEnabled;
                        draw();
                        return;
                    }
                }

                pushHistory();
                dragItem = { comp: c, offX: mx - c.x, offY: my - c.y };
                selectedComponent = c;
                selectedWire = null;
            }
            
            draw();
            return;
        }
    }

    // 3. Tocar Cable? (Selección o Inserción de punto - Solo si NO estamos simulando)
    if (!isSimulating) {
        for (const w of wires) {
            const hitInfo = getWireHitInfo(mx, my, w);
            if (hitInfo.hit) {
                selectedWire = w;
                selectedComponent = null;

                // Si clics sobre un segmento, insertar nuevo waypoint y arrastrarlo
                if (hitInfo.segmentIndex !== -1) {
                    pushHistory();
                    const newPoint = { x: snapToGrid(mx), y: snapToGrid(my) };
                    // El segmento i conecta fullPath[i] y fullPath[i+1]
                    // fullPath es [p1, path[0], path[1], ..., p2]
                    // Segmento 0 es p1 a path[0] -> Insertar en index 0 de path
                    // Segmento i (>0) es path[i-1] a path[i] -> Insertar en index i de path
                    // Segmento final es path[N-1] a p2 -> Insertar al final (push)
                    
                    if (w.path) {
                        w.path.splice(hitInfo.segmentIndex, 0, newPoint);
                        draggingHandle = { wire: w, index: hitInfo.segmentIndex };
                    } else {
                        w.path = [newPoint];
                        draggingHandle = { wire: w, index: 0 };
                    }
                }

                if(w.color) {
                    currentWireColor = w.color;
                    const sel = document.getElementById('wire-color');
                    if(sel) sel.value = w.color;
                }
                hitObject = true;
                draw();
                return;
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
        // Si es una fuente y estamos sobre el slider, no mover el cuerpo
        const c = dragItem.comp;
        if (dragItem.isSlider) {
             const minV = (c instanceof PowerSource) ? 208 : 100;
             const maxV = (c instanceof PowerSource) ? 600 : 250;
             const perc = Math.max(0, Math.min(1, (mousePos.x - (c.x + 10)) / (c.width - 20)));
             c.state.voltage = Math.round(minV + perc * (maxV - minV));
             draw();
             return;
        }

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

    for (const m of multimeters) {
        if (m.draggingProbe) {
            const p = m.draggingProbe === 'clamp' ? m.clamp : m.probes[m.draggingProbe];
            p.x = mousePos.x;
            p.y = mousePos.y;
            draw();
            return; // Only drag one thing at a time
        } else if (m.draggingBody) {
            m.x = mousePos.x - m.offX;
            m.y = mousePos.y - m.offY;
            draw();
            return;
        }
    }
}

function onMouseUp(e) {
    // Soltar Boton - Liberar TODOS los pulsadores que estén presionados
    components.filter(c => c instanceof PushButton && c.state.pressed).forEach(btn => {
        btn.state.pressed = false;
    });
    
    // También liberar si estaba en dragItem (para compatibilidad)
    if (dragItem && dragItem.comp instanceof PushButton) {
        dragItem.comp.state.pressed = false;
    }
    dragItem = null;
    draggingHandle = null;

    for (const m of multimeters) {
        if (m.draggingProbe) {
            const probeKey = m.draggingProbe;
            const p = probeKey === 'clamp' ? m.clamp : m.probes[probeKey];
            
            // Intentar conectar punta a un terminal
            p.target = null;
            for (const c of components) {
                const t = c.getHoveredTerminal(mousePos.x, mousePos.y);
                if (t) {
                    p.x = t.x;
                    p.y = t.y;
                    p.target = { component: c, terminalId: t.id };
                    break;
                }
            }

            // Si no conectó a terminal y es la pinza, probar con cables
            if (!p.target && probeKey === 'clamp') {
                for (const w of wires) {
                    if (isMouseOverWire(mousePos.x, mousePos.y, w)) {
                        const p1 = w.from.getTerminal(w.fromId);
                        const p2 = w.to.getTerminal(w.toId);
                        const fullPath = [p1, ...(w.path || []), p2];
                        let bestDist = Infinity;
                        let snapPos = { x: mousePos.x, y: mousePos.y };
                        let phaseIdx = 0;

                        const phaseSets = [
                            ['L1', 'L2', 'L3'], ['T1', 'T2', 'T3'], 
                            ['U', 'V', 'W'], ['U1', 'V1', 'W1'], ['W2', 'U2', 'V2']
                        ];
                        const activeSet = w.isTriple ? phaseSets.find(s => s.includes(w.fromId)) : null;

                        for (let i = 0; i < fullPath.length - 1; i++) {
                            const segStart = fullPath[i], segEnd = fullPath[i+1];
                            
                            if (w.isTriple && activeSet) {
                                const index = activeSet.indexOf(w.fromId);
                                const spacing = 32;
                                const offsets = [(0 - index) * spacing, (1 - index) * spacing, (2 - index) * spacing];
                                
                                offsets.forEach((offset, idx) => {
                                    const dist = pDist(mousePos.x, mousePos.y, segStart.x + offset, segStart.y, segEnd.x + offset, segEnd.y);
                                    if (dist < bestDist) {
                                        bestDist = dist;
                                        phaseIdx = idx;
                                        const A = mousePos.x - (segStart.x + offset), B = mousePos.y - segStart.y;
                                        const C = segEnd.x - segStart.x, D = segEnd.y - segStart.y;
                                        const dot = A * C + B * D, len_sq = C * C + D * D;
                                        let param = (len_sq !== 0) ? dot / len_sq : -1;
                                        if (param < 0) { snapPos.x = segStart.x + offset; snapPos.y = segStart.y; }
                                        else if (param > 1) { snapPos.x = segEnd.x + offset; snapPos.y = segEnd.y; }
                                        else { snapPos.x = (segStart.x + offset) + param * C; snapPos.y = segStart.y + param * D; }
                                    }
                                });
                            } else {
                                const dist = pDist(mousePos.x, mousePos.y, segStart.x, segStart.y, segEnd.x, segEnd.y);
                                if (dist < bestDist) {
                                    bestDist = dist;
                                    const A = mousePos.x - segStart.x, B = mousePos.y - segStart.y;
                                    const C = segEnd.x - segStart.x, D = segEnd.y - segStart.y;
                                    const dot = A * C + B * D, len_sq = C * C + D * D;
                                    let param = (len_sq !== 0) ? dot / len_sq : -1;
                                    if (param < 0) { snapPos.x = segStart.x; snapPos.y = segStart.y; }
                                    else if (param > 1) { snapPos.x = segEnd.x; snapPos.y = segEnd.y; }
                                    else { snapPos.x = segStart.x + param * C; snapPos.y = segStart.y + param * D; }
                                }
                            }
                        }
                        
                        p.x = snapPos.x;
                        p.y = snapPos.y;
                        
                        let tid = w.fromId;
                        let toTid = w.toId;
                        if (w.isTriple && activeSet) {
                            tid = activeSet[phaseIdx];
                            const toSet = phaseSets.find(s => s.includes(w.toId)) || activeSet;
                            toTid = toSet[phaseIdx];
                        }

                        p.target = { wire: w, snapPos: snapPos, phaseIndex: phaseIdx, terminalId: tid, toTerminalId: toTid };
                        break;
                    }
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
    const MAX_STABILITY_LOOPS = 5; 

    while(circuitChanged && stabilityLoop < MAX_STABILITY_LOOPS) {
        circuitChanged = false;
        
        // ==========================================
        // FASE 0: PRE-PROCESAMIENTO LÓGICO (Relés de Control)
        // ==========================================
        // Resolvemos primero los voltajes para detectar estados de control
        // Nota: esto es recursivo dentro del loop principal de solveCircuit
        
        // Resolvemos los relés de alternancia
        components.forEach(r => {
             if (!(r instanceof AlternatingRelay)) return;
             
             // 1-8 Terminal Logic (GRA-MV Style)
             // T2: Sensor, T3: Neutral/Supply, T4: Phase/Supply
             // Alterna cuando el sensor (T2) se abre respecto a T3 (Neutral)
             const s2Key = `${r.id}_2`, s3Key = `${r.id}_3`;
             const s2Nodes = window.lastSolvedNodes ? window.lastSolvedNodes[s2Key] : null;
             const s3Nodes = window.lastSolvedNodes ? window.lastSolvedNodes[s3Key] : null;
             
             // Detectamos si 2 y 3 están en el mismo nodo (contacto cerrado)
             const sensorClosed = !!(s2Nodes && s3Nodes && [...s2Nodes].some(p => s3Nodes.has(p)));
             
             if (r.state.lastSensorClosed && !sensorClosed) {
                 r.state.currentPump = r.state.currentPump === 1 ? 2 : 1;
                 circuitChanged = true;
             }
             r.state.lastSensorClosed = sensorClosed;
             r.state.coilActive = sensorClosed;
        });

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
        // 1.1 Fuentes (Semillas)
        let sourceVoltages = { 'L1': 208, 'L2': 208, 'L3': 208 }; // Default

        components.filter(c => c instanceof PowerSource).forEach(p => {
            const vL1 = p.state.vL1 !== undefined ? p.state.vL1 : p.state.voltage;
            const vL2 = p.state.vL2 !== undefined ? p.state.vL2 : p.state.voltage;
            const vL3 = p.state.vL3 !== undefined ? p.state.vL3 : p.state.voltage;
            
            sourceVoltages['L1'] = vL1;
            sourceVoltages['L2'] = vL2;
            sourceVoltages['L3'] = vL3;

            setNode(p, 'L1', 'L1'); 
            setNode(p, 'L2', 'L2'); 
            setNode(p, 'L3', 'L3'); 
            setNode(p, 'N', 'N');
        });
        components.filter(c => c instanceof SinglePhaseSource).forEach(p => {
            setNode(p, 'L', 'L1'); setNode(p, 'N', 'N');
        });

        // ==========================================
        // DETECCIÓN DE CORTOCIRCUITO (Pre-check)
        // ==========================================
        let shortCircuitDetected = false;

        // 1.2 Propagación Iterativa (Solo voltajes, sin cambiar estados de switches)
        for(let iter=0; iter<10; iter++) {
            let voltageChanged = false;
            const prevNodesCount = Object.values(nodes).reduce((acc, s) => acc + s.size, 0);

            // A. Componentes Interiores (Según estado ACTUAL de switches)
            components.forEach(c => {
                if (c instanceof Breaker) {
                    if (c.state.closed && !c.state.tripped) {
                        ['L1','L2','L3'].forEach((inT, i) => {
                            const outT = ['T1','T2','T3'][i];
                            if (nodes[`${c.id}_${inT}`]) nodes[`${c.id}_${inT}`].forEach(p => setNode(c, outT, p));
                            if (nodes[`${c.id}_${outT}`]) nodes[`${c.id}_${outT}`].forEach(p => setNode(c, inT, p));
                        });
                    }
                }
                if (c instanceof Guardamotor) {
                    if (c.state.closed && !c.state.tripped) {
                        // Main Power
                        ['L1','L2','L3'].forEach((inT, i) => {
                            const outT = ['T1','T2','T3'][i];
                            if (nodes[`${c.id}_${inT}`]) nodes[`${c.id}_${inT}`].forEach(p => setNode(c, outT, p));
                            if (nodes[`${c.id}_${outT}`]) nodes[`${c.id}_${outT}`].forEach(p => setNode(c, inT, p));
                        });
                        // Aux NO (13-14) Closed
                        const k13 = `${c.id}_NO13`, k14 = `${c.id}_NO14`;
                        if(nodes[k13]) nodes[k13].forEach(p => setNode(c, 'NO14', p));
                        if(nodes[k14]) nodes[k14].forEach(p => setNode(c, 'NO13', p));
                    } else {
                        // Aux NC (21-22) Closed (When OFF or TRIPPED)
                        const k21 = `${c.id}_NC21`, k22 = `${c.id}_NC22`;
                        if(nodes[k21]) nodes[k21].forEach(p => setNode(c, 'NC22', p));
                        if(nodes[k22]) nodes[k22].forEach(p => setNode(c, 'NC21', p));
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
                    const k1 = `${c.id}_1`, k2 = `${c.id}_2`, k3 = `${c.id}_3`;
                    // Manual bridging of sets
                    const s1 = nodes[k1], s2 = nodes[k2], s3 = nodes[k3];
                    const union = new Set();
                    if(s1) s1.forEach(p => union.add(p));
                    if(s2) s2.forEach(p => union.add(p));
                    if(s3) s3.forEach(p => union.add(p));
                    
                    // Add a virtual bridge node so Dahlander detects a physical short
                    // even if no grid phases are present yet.
                    union.add(`BRIDGE_${c.id}`);

                    if(union.size > 0) {
                        if (!nodes[k1]) nodes[k1] = new Set();
                        if (!nodes[k2]) nodes[k2] = new Set();
                        if (!nodes[k3]) nodes[k3] = new Set();
                        union.forEach(p => {
                            nodes[k1].add(p);
                            nodes[k2].add(p);
                            nodes[k3].add(p);
                        });
                    }
                }
                if (c instanceof AlternatingRelay) {
                    // Terminal 4 is the power input, Terminal 7 is the common output
                    // Terminal 6 is output for pump 1, Terminal 8 is output for pump 2
                    // The relay connects 7 to either 6 or 8 based on currentPump state
                    const hasPower = hasPhase(c, '4', 'L1') || hasPhase(c, '4', 'L2') || 
                                     hasPhase(c, '4', 'L3') || hasPhase(c, '4', 'L') || hasPhase(c, '4', 'N');
                    if (hasPower) {
                        const targetTerm = c.state.currentPump === 1 ? '6' : '8';
                        const commonKey = `${c.id}_7`, targetKey = `${c.id}_${targetTerm}`;
                        if (nodes[commonKey]) nodes[commonKey].forEach(p => setNode(c, targetTerm, p));
                        if (nodes[targetKey]) nodes[targetKey].forEach(p => setNode(c, '7', p));
                    }
                }
                if (c instanceof ThreePhaseMonitor) {
                    // Logic handled in separate phase, here just pass contacts if active
                    if (c.state.active) {
                         // Relay NO (95-98) Closed (Active = OK)
                         // Wait, usually 95-96 is NC (Fault/Off?) and 95-98 is NO (OK?)
                         // Standard: 95 Com. 96 NC. 98 NO.
                         // If Active (Green LED), supply is good -> 95 connects to 98.
                         const k95 = `${c.id}_95`, k98 = `${c.id}_98`;
                         if(nodes[k95]) nodes[k95].forEach(p => setNode(c, '98', p));
                         if(nodes[k98]) nodes[k98].forEach(p => setNode(c, '95', p));
                    } else {
                         // Relay NC (95-96) Closed (Inactive/Fault)
                         const k95 = `${c.id}_95`, k96 = `${c.id}_96`;
                         if(nodes[k95]) nodes[k95].forEach(p => setNode(c, '96', p));
                         if(nodes[k96]) nodes[k96].forEach(p => setNode(c, '95', p));
                    }
                }
                if (c instanceof TerminalBlock) {
                    for (let i = 1; i <= c.state.poles; i++) {
                        const topKey = `${c.id}_${i}`, botKey = `${c.id}_${i}'`;
                        if (nodes[topKey]) nodes[topKey].forEach(p => setNode(c, `${i}'`, p));
                        if (nodes[botKey]) nodes[botKey].forEach(p => setNode(c, `${i}`, p));
                    }
                }
                if (c instanceof PressureSwitch && c.state.contactsClosed) {
                    // 1 connects to 3, 2 connects to 4
                    [['1', '3'], ['2', '4']].forEach(([t1, t2]) => {
                        const k1 = `${c.id}_${t1}`, k2 = `${c.id}_${t2}`;
                        if (nodes[k1]) nodes[k1].forEach(p => setNode(c, t2, p));
                        if (nodes[k2]) nodes[k2].forEach(p => setNode(c, t1, p));
                    });
                }
                if (c instanceof FloatSwitch) {
                    const com = `${c.id}_COM`;
                    if (c.state.highLevel) {
                        // Up: Close COM-NO
                        const no = `${c.id}_NO`;
                        if (nodes[com]) nodes[com].forEach(p => setNode(c, 'NO', p));
                        if (nodes[no]) nodes[no].forEach(p => setNode(c, 'COM', p));
                    } else {
                        // Down: Close COM-NC
                        const nc = `${c.id}_NC`;
                        if (nodes[com]) nodes[com].forEach(p => setNode(c, 'NC', p));
                        if (nodes[nc]) nodes[nc].forEach(p => setNode(c, 'COM', p));
                    }
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
                        ['1U', '1V', '1W'],
                        ['2U', '2V', '2W'],
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
            
            // Verificación de Cortocircuito durante la propagación
            for (const key in nodes) {
                const phases = [...nodes[key]];
                const activePhases = phases.filter(p => ['L1', 'L2', 'L3', 'N', 'L'].includes(p));
                if (activePhases.length > 1) {
                    // Si hay mezcla de potenciales distintos (L1-L2, L1-N, etc)
                    if (new Set(activePhases.map(p => p === 'L' ? 'L1' : p)).size > 1) {
                        shortCircuitDetected = true;
                        break;
                    }
                }
            }

            if (shortCircuitDetected) break;
            if (newNodesCount > prevNodesCount) voltageChanged = true;
            if (!voltageChanged) break; // Voltajes estables
        }

        if (shortCircuitDetected) {
            handleShortCircuit();
            break; // Salir del solver para procesar el cambio
        }

        // ==========================================
        // FASE 2: ACTUALIZAR ESTADOS (Switches)
        // ==========================================
        
        // C. Consumidores
        // Limpiar sensores de corriente
        components.filter(c => c instanceof ThermalRelay || c instanceof Guardamotor).forEach(r => r.state.currentSense = 0);

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

        // BOBINAS DE TEMPORIZADORES (TimerRelay) - TON y TOF
        components.filter(c => c instanceof TimerRelay).forEach(t => {
            const hasA1 = nodes[`${t.id}_A1`];
            const hasA2 = nodes[`${t.id}_A2`];
            let energized = false;
            if (hasA1 && hasA1.size > 0 && hasA2 && hasA2.size > 0) {
                const p1 = [...hasA1][0], p2 = [...hasA2][0];
                if (p1 !== p2) energized = true;
            }
            
            if (t.state.mode === 'TON') {
                // TON (On-Delay): Cuenta mientras está energizado, activa salida al completar
                if (energized) {
                    if (!t.state.active) {
                         t.state.active = true;
                         t.state.timeElapsed = 0;
                    }
                    if (!t.state.done) {
                        t.state.timeElapsed += 16; // approx 16ms per frame
                        if (t.state.timeElapsed >= t.state.setting) {
                            t.state.done = true;
                            circuitChanged = true;
                        }
                    }
                } else {
                    // Desenergizado -> Reset todo
                    if (t.state.active || t.state.done || t.state.timeElapsed > 0) {
                        t.state.active = false;
                        t.state.done = false;
                        t.state.timeElapsed = 0;
                        circuitChanged = true;
                    }
                }
            } else {
                // TOF (Off-Delay): Salida activa inmediatamente al energizar, 
                // cuenta al desenergizar, desactiva al completar
                if (energized) {
                    // Energizado -> Salida ON inmediatamente, reset timer
                    if (!t.state.done) {
                        t.state.done = true;
                        circuitChanged = true;
                    }
                    t.state.active = true;
                    t.state.timeElapsed = 0;
                } else {
                    // Desenergizado
                    if (t.state.active) {
                        // Acabamos de desenergizar, empezar a contar
                        t.state.active = false;
                    }
                    if (t.state.done) {
                        // Contando hacia el apagado
                        t.state.timeElapsed += 16;
                        if (t.state.timeElapsed >= t.state.setting) {
                            t.state.done = false;
                            t.state.timeElapsed = 0;
                            circuitChanged = true;
                        }
                    }
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
                    m.state.direction = getThreePhaseDirection(uPhase, vPhase, wPhase);

                    // Corriente -> Térmicos y Guardamotores
                    components.filter(c => (c instanceof ThermalRelay || c instanceof Guardamotor) && !c.state.tripped).forEach(r => {
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

             // Check Input Power (U1, V1, W1) - need 3 distinct grid phases
             const getGridPhases = (nodeSet) => {
                 if (!nodeSet || nodeSet.size === 0) return [];
                 return [...nodeSet].filter(p => ['L1', 'L2', 'L3'].includes(p));
             };

             const phasesU1 = getGridPhases(hasU1);
             const phasesV1 = getGridPhases(hasV1);
             const phasesW1 = getGridPhases(hasW1);

             if (phasesU1.length > 0 && phasesV1.length > 0 && phasesW1.length > 0) {
                 const pU = phasesU1[0], pV = phasesV1[0], pW = phasesW1[0];
                 const validPower = (pU !== pV && pV !== pW && pU !== pW);
                 
                 if (validPower) {
                     // Check Star: U2, V2, W2 must share at least one common node
                     // (they are shorted together to form the star neutral point)
                     if (hasU2 && hasU2.size > 0 && hasV2 && hasV2.size > 0 && hasW2 && hasW2.size > 0) {
                         // Find common nodes among all three terminals
                         const commonNodes = [...hasU2].filter(n => hasV2.has(n) && hasW2.has(n));
                         // Exclude grid phases from common nodes (they shouldn't be phase-shorted)
                         const validCommon = commonNodes.filter(n => !['L1', 'L2', 'L3', 'N', 'PE'].includes(n));
                         
                         if (validCommon.length > 0) {
                             connection = 'Star';
                             running = true;
                         }
                     }
                     
                     // Check Delta: U1-W2, V1-U2, W1-V2
                     // (each bottom terminal receives the same phase as its opposite top terminal)
                     if (!running && hasW2 && hasW2.has(pU) && 
                                     hasU2 && hasU2.has(pV) &&
                                     hasV2 && hasV2.has(pW)) {
                         connection = 'Delta';
                         running = true;
                     }

                     if (running) {
                         direction = getThreePhaseDirection(pU, pV, pW);
                     }
                 }
             }

             if (m.state.running !== running || m.state.connection !== connection) {
                 m.state.running = running;
                 m.state.connection = connection;
                 m.state.direction = direction;
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
             // Trip Logic
             if (r.state.tripEnabled && !r.state.tripped && r.state.currentSense > r.state.currentLimit) {
                 r.state.tripped = true;
                 console.log(`Relé Térmico ${r.id} TRIPPED`);
                 circuitChanged = true; // Topología cambia (NC abre)
             }
             
             // Auto Reset Logic
             if (r.state.tripped && r.state.resetMode === 'Auto' && r.state.currentSense < r.state.currentLimit) {
                 r.state.tripped = false;
                 // console.log(`Relé Térmico ${r.id} AUTO RESET`);
                 circuitChanged = true; // Topología cambia (NC cierra)
             }
        });

        // Guardamotor Trip Logic
        components.filter(c => c instanceof Guardamotor).forEach(r => {
             // Trip condition: Current > Setting (allowing small margin or delay logic if deeper sim, but direct > here)
             if (r.state.tripEnabled && !r.state.tripped && r.state.currentSense > r.state.currentSetting * 1.05) { // 5% tolerance
                 r.state.tripped = true;
                 r.state.closed = false; 
                 console.log(`Guardamotor ${r.id} TRIPPED at ${r.state.currentSense}A (Limit: ${r.state.currentSetting}A)`);
                 circuitChanged = true;
             }
        });

        // Supervisor Trifásico Logic
        components.filter(c => c instanceof ThreePhaseMonitor).forEach(s => {
             const hasL1 = nodes[`${s.id}_L1`];
             const hasL2 = nodes[`${s.id}_L2`];
             const hasL3 = nodes[`${s.id}_L3`];
             
             let fault = 'None';
             let supplyOk = false;
             
             // 1. Check Phase Presence
             if (!hasL1 || !hasL1.size || !hasL2 || !hasL2.size || !hasL3 || !hasL3.size) {
                 fault = 'PhaseLoss';
             } else {
                 const p1 = [...hasL1][0], p2 = [...hasL2][0], p3 = [...hasL3][0];
                 
                 // Check Voltage Levels
                  const v1 = sourceVoltages[p1] || s.state.voltageSetting || 208;
                  const v2 = sourceVoltages[p2] || s.state.voltageSetting || 208;
                  const v3 = sourceVoltages[p3] || s.state.voltageSetting || 208;

                  // Check Individual Phases (Any phase out of range triggers fault)
                  if (v1 < s.state.voltageSetting || v2 < s.state.voltageSetting || v3 < s.state.voltageSetting) {
                      fault = 'UnderVoltage';
                  } else if (s.state.maxVoltageSetting && (v1 > s.state.maxVoltageSetting || v2 > s.state.maxVoltageSetting || v3 > s.state.maxVoltageSetting)) {
                      fault = 'OverVoltage';
                  } else {
                      fault = 'None'; 
                  }

                 // 2. Check Sequence (L1->L2->L3 or equivalent rotation)
                 // Valid: (L1,L2,L3), (L2,L3,L1), (L3,L1,L2) assuming standard naming
                 // Simplification: Check against known source phases if possible, or just unique
                 if (p1 === p2 || p2 === p3 || p1 === p3) {
                     fault = 'PhaseLoss'; // Duplicated phase treated as loss
                 } else if (fault === 'None') {
                     // Debug Sequence
                     // console.log(`Monitor ${s.id}: p1=${p1}, p2=${p2}, p3=${p3}`);
                     
                     // Check if Sequence is Negative?
                     // Expected: L1-L2, L2-L3, L3-L1 order
                     // p1='L1', p2='L3' -> Reverse
                     if ((p1.endsWith('L1') && p2.endsWith('L3')) ||
                         (p1.endsWith('L2') && p2.endsWith('L1')) ||
                         (p1.endsWith('L3') && p2.endsWith('L2'))) {
                         fault = 'Sequence';
                     }
                 }
                 
                 // 3. Check Voltage (Simulated)
                 // We need to find the source voltage. Iterate sources? 
                 // Heuristic: Find source connected to these nodes.
                 // Simplification: Use global voltage from first PowerSource for now?
                 // Better: Each node tracks its source in a real EM sim, but here we just have strings.
                 // Let's grab the first PowerSource's voltage state.
             }
             
             if (fault === 'None') supplyOk = true;
             s.state.fault = fault;
             s.state.supplyOk = supplyOk;
             
             // Timer Logic
             if (supplyOk) {
                 if (!s.state.active) {
                     s.state.timerCurrent += 16; // 16ms per frame
                     if (s.state.timerCurrent >= s.state.timerSetting) {
                         s.state.active = true;
                         s.state.timerCurrent = 0;
                         circuitChanged = true;
                     }
                 }
             } else {
                 s.state.timerCurrent = 0;
                 if (s.state.active) {
                     s.state.active = false;
                     circuitChanged = true;
                 }
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

function handleShortCircuit() {
    console.warn("!!! CORTOCIRCUITO DETECTADO !!!");
    
    // 1. Disparar todos los elementos de protección cerrados
    components.forEach(c => {
        if (c instanceof Breaker && c.state.closed) {
            c.state.closed = false;
            c.state.tripped = true;
        }
        if (c instanceof Guardamotor && c.state.closed) {
            c.state.closed = false;
            c.state.tripped = true;
        }
    });

    // 2. Mostrar advertencia visual
    showShortCircuitWarning();
}

function showShortCircuitWarning() {
    let warning = document.getElementById('short-circuit-warning');
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'short-circuit-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ef4444;
            color: white;
            padding: 15px 30px;
            border-radius: 12px;
            font-family: 'Inter', sans-serif;
            font-weight: 800;
            font-size: 18px;
            z-index: 9999;
            box-shadow: 0 10px 25px rgba(239, 68, 68, 0.5);
            display: flex;
            align-items: center;
            gap: 15px;
            animation: slideInDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        
        // Agregar animación si no existe
        if (!document.getElementById('sim-animations')) {
            const style = document.createElement('style');
            style.id = 'sim-animations';
            style.innerHTML = `
                @keyframes slideInDown {
                    from { transform: translate(-50%, -100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        warning.innerHTML = `
            <i class="fas fa-triangle-exclamation fa-2x"></i>
            <div style="display:flex; flex-direction:column;">
                <span>¡CORTOCIRCUITO DETECTADO!</span>
                <span style="font-size:12px; opacity:0.9; font-weight:400;">Protecciones disparadas. Revise el cableado.</span>
            </div>
            <button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,0.2); border:none; color:white; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:12px; margin-left:10px;">OK</button>
        `;
        document.body.appendChild(warning);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (warning.parentElement) warning.remove();
        }, 5000);
    }
}


// ================= RENDER =================

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.scale(currentScale, currentScale);

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
                 ctx.lineWidth = isSelected ? 4 : 3;
                 if (w.color === '#ef4444') ctx.strokeStyle = '#f87171';
                 else if (w.color === '#22c55e') ctx.strokeStyle = '#4ade80';
                 else if (w.color === '#3b82f6') ctx.strokeStyle = '#60a5fa';
                 else ctx.strokeStyle = '#fcd34d';
             } else {
                 ctx.strokeStyle = isSelected ? '#fbbf24' : (w.color || '#3b82f6'); 
                 ctx.lineWidth = isSelected ? 3 : 2;
             }

             if (w.isTriple) {
                  const spacing = 32;
                  let index = 1;
                  if (activeSet) index = activeSet.indexOf(w.fromId);
                  const baseOffsets = [(0 - index) * spacing, (1 - index) * spacing, (2 - index) * spacing];

                  baseOffsets.forEach((offset, i) => {
                      let phaseEnergized = isEnergized;
                      if (activeSet && isSimulating) {
                          const phaseKey = `${w.from.id}_${activeSet[i]}`;
                          phaseEnergized = (nodes[phaseKey] && nodes[phaseKey].size > 0);
                      }

                      ctx.strokeStyle = phaseEnergized ? '#fcd34d' : '#000000';
                      if (phaseEnergized) {
                          ctx.shadowBlur = 8 * currentScale;
                          ctx.shadowColor = '#fbbf24';
                      } else { ctx.shadowBlur = 0; }

                      // Crear el path de la fase compensando ángulos
                      const phasePath = [];
                      for (let j = 0; j < path.length; j++) {
                          const pPrev = path[j-1], pCurr = path[j], pNext = path[j+1];
                          let ox = 0, oy = 0;
                          if (!pPrev) {
                              const dx = pNext.x - pCurr.x, dy = pNext.y - pCurr.y;
                              const len = Math.sqrt(dx*dx + dy*dy);
                              if (len > 0) { ox = -dy/len * offset; oy = dx/len * offset; }
                          } else if (!pNext) {
                              const dx = pCurr.x - pPrev.x, dy = pCurr.y - pPrev.y;
                              const len = Math.sqrt(dx*dx + dy*dy);
                              if (len > 0) { ox = -dy/len * offset; oy = dx/len * offset; }
                          } else {
                              const dx1 = pCurr.x - pPrev.x, dy1 = pCurr.y - pPrev.y;
                              const len1 = Math.sqrt(dx1*dx1 + dy1*dy1);
                              const n1x = -dy1/len1, n1y = dx1/len1;
                              const dx2 = pNext.x - pCurr.x, dy2 = pNext.y - pCurr.y;
                              const len2 = Math.sqrt(dx2*dx2 + dy2*dy2);
                              const n2x = -dy2/len2, n2y = dx2/len2;
                              const cosTheta = n1x*n2x + n1y*n2y;
                              const factor = offset / (1 + cosTheta);
                              ox = (n1x + n2x) * factor;
                              oy = (n1y + n2y) * factor;
                          }
                          phasePath.push({ x: pCurr.x + ox, y: pCurr.y + oy });
                      }
                      drawRoundedPolyline(ctx, phasePath, 15);
                  });
                  if (isEnergized) ctx.restore();
             } else {
                  drawRoundedPolyline(ctx, path, 15);
                  if (isEnergized) ctx.restore();
             }

             ctx.shadowBlur = 0;

             // Tapar extremos y dibujar puntos del path
             ctx.fillStyle = ctx.strokeStyle;
             const joints = [path[0], ...(w.path || []), path[path.length-1]];
             joints.forEach((pt, idx) => {
                 const isEndpoint = (idx === 0 || idx === joints.length - 1);
                 if (isEndpoint) {
                     ctx.beginPath();
                     ctx.arc(pt.x, pt.y, isSelected ? 3 : 2, 0, Math.PI*2);
                     ctx.fill();
                 } else if (isSelected) {
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
        const previewPath = [p1, ...wireStartObj.path, mousePos];
        drawRoundedPolyline(ctx, previewPath, 15);
        ctx.setLineDash([]);
    }

    // 4. Multímetro
    multimeters.forEach(m => {
        m.update();
        m.draw(ctx);
    });

    ctx.restore();
}


function drawRoundedPolyline(ctx, path, radius) {
    if (!path || path.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    
    for (let i = 1; i < path.length - 1; i++) {
        const pCurr = path[i];
        const pNext = path[i+1];
        ctx.arcTo(pCurr.x, pCurr.y, pNext.x, pNext.y, radius);
    }
    
    ctx.lineTo(path[path.length - 1].x, path[path.length - 1].y);
    ctx.stroke();
}

function isMouseOverWire(mx, my, wire) {
    return getWireHitInfo(mx, my, wire).hit;
}

function getWireHitInfo(mx, my, wire) {
    const p1 = wire.from.getTerminal(wire.fromId);
    const p2 = wire.to.getTerminal(wire.toId);
    if (!p1 || !p2) return { hit: false };

    const fullPath = [p1, ...(wire.path || []), p2];
    const threshold = wire.isTriple ? 40 : 15;
    
    for (let i = 0; i < fullPath.length - 1; i++) {
        const segStart = fullPath[i];
        const segEnd = fullPath[i+1];
        
        if (wire.isTriple) {
            const spacing = 32;
            const dx = segEnd.x - segStart.x;
            const dy = segEnd.y - segStart.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            if (len > 0) {
                const nx = -dy / len, ny = dx / len;
                for (let offIdx = -1; offIdx <= 1; offIdx++) {
                    if (pDist(mx, my, segStart.x + nx * offIdx * spacing, segStart.y + ny * offIdx * spacing, 
                                     segEnd.x + nx * offIdx * spacing, segEnd.y + ny * offIdx * spacing) < 15) {
                        return { hit: true, segmentIndex: i };
                    }
                }
            }
        } else {
            if (pDist(mx, my, segStart.x, segStart.y, segEnd.x, segEnd.y) < threshold) {
                return { hit: true, segmentIndex: i };
            }
        }
    }
    return { hit: false, segmentIndex: -1 };
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
    ctx.lineWidth = 1 / currentScale; // Mantener rejilla fina incluso al hacer zoom
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
        canvas.width = Math.max(parent.clientWidth, 2400 * currentScale);
        canvas.height = Math.max(parent.clientHeight || 600, 1600 * currentScale); 
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
        if (!data || !data.components) throw new Error("Formato de archivo inválido");

        // Detener simulación antes de limpiar
        isSimulating = false;
        if (typeof updateStatus === 'function') updateStatus();
        window.lastSolvedNodes = {}; // Limpiar estado visual de energía

        // IMPORTANTE: Vaciar los arreglos sin romper referencias globales
        components.length = 0;
        wires.length = 0;
        
        selectedComponent = null;
        selectedWire = null;

        // 1. Recrear Componentes
        data.components.forEach(cData => {
            const oldLen = components.length;
            // Usamos skipHistory = true para no llenar el undoStack durante la carga
            addComponent(cData.type, cData.x + 50, cData.y + 50, true); 
            
            if (components.length > oldLen) {
                const c = components[components.length - 1];
                c.id = cData.id;
                c.x = cData.x;
                c.y = cData.y;
                c.rotation = cData.rotation || 0;
                if (cData.state) Object.assign(c.state, cData.state);
            } else {
                console.warn(`No se pudo recrear componente: ${cData.type}`);
            }
        });

        // 2. Recrear Cables (si existen)
        if (data.wires && Array.isArray(data.wires)) {
            data.wires.forEach(wData => {
                const fromComp = components.find(c => c.id === wData.from);
                const toComp = components.find(c => c.id === wData.to);

                if (fromComp && toComp) {
                    wires.push({
                        from: fromComp,
                        fromId: wData.fromId,
                        to: toComp,
                        toId: wData.toId,
                        color: wData.color || '#fbbf24',
                        isTriple: wData.isTriple || false,
                        path: wData.path || []
                    });
                }
            });
        }

        draw();
        console.log("Circuito cargado con éxito.");
        return true;
    } catch (err) {
        console.error("Error al cargar circuito:", err);
        alert("Error al procesar el archivo del circuito: " + err.message);
        return false;
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
