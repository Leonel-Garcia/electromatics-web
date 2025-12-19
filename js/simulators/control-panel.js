/**
 * Simulador de Tableros de Control Industrial
 * Motor de simulación con arrancador directo, selector AOM y control Start/Stop
 * Versión corregida y optimizada
 * 
 * @author Electromatics.com.ve
 */


document.addEventListener('DOMContentLoaded', initSimulator);

// Fallback por si el evento ya se disparó
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initSimulator();
}

function initSimulator() {
    // Evitar doble inicialización
    if (window.simulatorInitialized) return;
    window.simulatorInitialized = true;

    console.log("Iniciando Simulador de Tablero de Control...");


    // Canvas setup
    const canvas = document.getElementById('simulatorCanvas');
    if (!canvas) {
        console.error("Error: Canvas no encontrado");
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Resize handler global
    let canvasWidth = 800;
    let canvasHeight = 600;

    function resizeCanvas() {
        const container = canvas.parentElement;
        if (container) {
            // Asegurar dimensiones min
            canvas.width = Math.max(container.clientWidth || 800, 300);
            canvas.height = Math.max(container.clientHeight || 600, 300);
            canvasWidth = canvas.width;
            canvasHeight = canvas.height;
            console.log(`Canvas dimensionado a: ${canvasWidth}x${canvasHeight}`);
            draw();
        }
    }
    
    window.addEventListener('resize', resizeCanvas);
    // Llamar dos veces para asegurar que el layout flex se haya estabilizado
    resizeCanvas();
    setTimeout(resizeCanvas, 200);

    // ============== STATE ==============
    const state = {
        isRunning: false,          
        selectorMode: 'O',         // A = Auto, O = Off, M = Manual
        contactorEngaged: false,   
        motorRunning: false,       
        motorAngle: 0,             
        breakerClosed: true,       
        thermalTripped: false,     
        startPressed: false,       
        stopPressed: false         
    };

    // ============== COMPONENT DEFINITIONS ==============
    // Centramos los componentes dinámicamente o usamos posiciones relativas fijas si es más seguro
    const components = {
        rail: { x: 50, y: 150, width: 600, height: 40 },
        breaker: { x: 80, y: 120, width: 60, height: 90, label: 'QF1' },
        contactor: { x: 180, y: 120, width: 70, height: 90, label: 'KM1' },
        thermalRelay: { x: 280, y: 120, width: 60, height: 90, label: 'F2' },
        motor: { x: 450, y: 300, radius: 60, label: 'M1' }
    };

    // ============== COLORS ==============
    const colors = {
        rail: '#94a3b8', 
        railSlots: '#64748b',
        componentBody: '#1e293b', 
        componentBorder: '#cbd5e1', 
        terminalOff: '#94a3b8',
        terminalOn: '#22c55e',
        wireL1: '#ef4444', 
        wireL2: '#f59e0b', 
        wireL3: '#3b82f6', 
        wireNeutral: '#94a3b8',
        motorBody: '#334155',
        motorShaft: '#cbd5e1',
        contactOpen: '#ef4444',
        contactClosed: '#22c55e',
        coilEnergized: '#f59e0b',
        text: '#f8fafc',
        textSecondary: '#cbd5e1'
    };

    // ============== ASSETS CONFIGURATION ==============
    const assetPaths = {
        breaker: 'img/simulators/control-panel/breaker.png',
        contactor: 'img/simulators/control-panel/contactor.png',
        thermalRelay: 'img/simulators/control-panel/thermal-relay.png',
        motor: 'img/simulators/control-panel/motor.png',
        pushStart: 'img/simulators/control-panel/pushbutton-green.png',
        pushStop: 'img/simulators/control-panel/pushbutton-red.png'
    };

    const loadedImages = {};
    let assetsLoaded = false;

    function loadImages() {
        const promises = Object.entries(assetPaths).map(([key, src]) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    loadedImages[key] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`No se pudo cargar la imagen para ${key} en ${src}. Usando fallback vectorial.`);
                    resolve(); // Resolvemos igual para no bloquear la app
                };
            });
        });

        Promise.all(promises).then(() => {
            console.log("Assets cargados (o fallidos controlados).");
            assetsLoaded = true;
            draw();
        });
    }

    // Iniciar carga de imágenes
    loadImages();


    // ============== DRAWING FUNCTIONS (IMAGE MODE) ==============
    
    function drawRailDIN(x, y, width) {
        ctx.fillStyle = '#475569'; 
        ctx.fillRect(x, y + 5, width, 35);
        ctx.fillStyle = colors.rail; 
        ctx.fillRect(x, y, width, 30);
    }

    // Helper para dibujar imagen o fallback
    function drawComponentImage(key, x, y, width, height, fallbackFn) {
        if (loadedImages[key]) {
            // Sombra suave
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 10;
            ctx.drawImage(loadedImages[key], x, y, width, height);
            ctx.shadowBlur = 0;
            return true;
        }
        if (fallbackFn) fallbackFn();
        return false;
    }

    function drawBreaker(comp, closed) {
        const { x, y, width, height, label } = comp;
        
        // Intentar dibujar imagen
        const drawn = drawComponentImage('breaker', x, y, width, height, () => {
            // FALLBACK VECTORIAL (Código original simplificado)
            ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);
            ctx.fillStyle = closed ? colors.contactClosed : colors.contactOpen;
            ctx.fillRect(x + width/2 - 10, y + 30, 20, 10);
            ctx.fillStyle = '#0f172a'; ctx.fillText(label, x + width/2, y + height + 15);
        });

        // Overlay de estado (Incluso con foto, queremos ver si está ON/OFF)
        if (drawn) {
             // Indicador visual discreto sobre la imagen
             ctx.fillStyle = closed ? '#22c55e' : '#ef4444';
             ctx.beginPath(); ctx.arc(x + width - 10, y + 15, 4, 0, Math.PI*2); ctx.fill();
        }
    }

    function drawContactor(comp, engaged) {
        const { x, y, width, height, label } = comp;

        const drawn = drawComponentImage('contactor', x, y, width, height, () => {
             ctx.fillStyle = '#f1f5f9'; ctx.fillRect(x, y, width, height);
             ctx.strokeRect(x, y, width, height);
             ctx.fillStyle = engaged ? '#fbbf24' : '#334155'; ctx.fillRect(x + 10, y + 30, width - 20, 30);
             ctx.fillStyle = '#0f172a'; ctx.fillText(label, x + width/2, y + height + 15);
        });

        if (drawn && engaged) {
            // "Luz" o indicador mecánico activado
            ctx.fillStyle = 'rgba(251, 191, 36, 0.4)'; // Brillo amarillo
            ctx.fillRect(x + width/2 - 15, y + height/2 - 10, 30, 20);
        }
    }

    function drawThermalRelay(comp, tripped) {
        const { x, y, width, height, label } = comp;
        
        const drawn = drawComponentImage('thermalRelay', x, y, width, height, () => {
            ctx.fillStyle = '#1e293b'; ctx.fillRect(x, y, width, height);
            ctx.fillStyle = tripped ? '#ef4444' : '#3b82f6'; ctx.beginPath(); ctx.arc(x + 35, y + 40, 6, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = '#fff'; ctx.fillText(label, x + width/2, y + height + 15);
        });

        if (drawn && tripped) {
            ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; 
            ctx.strokeRect(x, y, width, height); // Borde rojo si saltó
        }
    }

    function drawMotor(comp, running, angle) {
        const { x, y, radius, label } = comp;
        const width = radius * 2.5; // Ajuste para imagen cuadrada aprox
        const height = radius * 2.2;
        const imgX = x - width/2;
        const imgY = y - height/2;

        const drawn = drawComponentImage('motor', imgX, imgY, width, height, () => {
            ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
            if (running) { ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(x, y, radius-10, 0, Math.PI*2); ctx.fill(); }
            ctx.fillStyle = '#fff'; ctx.fillText(label, x, y + radius + 15);
        });

        if (drawn && running) {
             // Efecto de vibración/rotación sutil o eje girando superpuesto
             ctx.save();
             ctx.translate(x, y);
             ctx.rotate(angle);
             // Dibujar eje simple encima de la foto para ver rotación
             ctx.fillStyle = '#cbd5e1'; 
             ctx.beginPath(); ctx.rect(-5, -20, 10, 40); ctx.fill();
             ctx.restore();
        }
    }

    function drawWires() {
        // ... (mismo código de cables, asumiendo que las fotos tienen terminales aprox en los mismos sitios)
        // Ajuste fino: los cables deben ir "detrás" de los componentes visualmente para parecer conectados a los bornes traseros o inferiores
        // Pero en canvas 2D simple, dibujar antes o después define z-index.
        // Dibujaremos cables ANTES que componentes para que las fotos tapen las puntas.
        
        const b = components.breaker;
        const c = components.contactor;
        const t = components.thermalRelay;
        const m = components.motor;

        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // 1. Alimentación
        drawCableInfo(b.x + 15, b.y - 30, b.x + 15, b.y + 10, colors.wireL1);
        drawCableInfo(b.x + 30, b.y - 30, b.x + 30, b.y + 10, colors.wireL2);
        drawCableInfo(b.x + 45, b.y - 30, b.x + 45, b.y + 10, colors.wireL3);

        const powerOn = state.breakerClosed;
        // 2. Breaker -> Contactor (Ajustado para que parezca salir de abajo)
        drawCableInfo(b.x + 15, b.y + b.height - 10, c.x + 15, c.y + 10, powerOn ? colors.wireL1 : '#555');
        drawCableInfo(b.x + 30, b.y + b.height - 10, c.x + 35, c.y + 10, powerOn ? colors.wireL2 : '#555');
        drawCableInfo(b.x + 45, b.y + b.height - 10, c.x + 55, c.y + 10, powerOn ? colors.wireL3 : '#555');

        const contactorClosed = state.contactorEngaged && powerOn;
        // 3. Contactor -> Térmico
        drawCableInfo(c.x + 15, c.y + c.height - 10, t.x + 15, t.y + 5, contactorClosed ? colors.wireL1 : '#555');
        drawCableInfo(c.x + 35, c.y + c.height - 10, t.x + 30, t.y + 5, contactorClosed ? colors.wireL2 : '#555');
        drawCableInfo(c.x + 55, c.y + c.height - 10, t.x + 45, t.y + 5, contactorClosed ? colors.wireL3 : '#555');

        const motorPower = contactorClosed && !state.thermalTripped;
        // 4. Térmico -> Motor
        drawCurveWire(t.x + 15, t.y + t.height - 10, m.x - 10, m.y - m.radius, motorPower ? colors.wireL1 : '#555');
        drawCurveWire(t.x + 30, t.y + t.height - 10, m.x, m.y - m.radius, motorPower ? colors.wireL2 : '#555');
        drawCurveWire(t.x + 45, t.y + t.height - 10, m.x + 10, m.y - m.radius, motorPower ? colors.wireL3 : '#555');
    }

    function drawCableInfo(x1, y1, x2, y2, color) {
        ctx.strokeStyle = color;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    function drawCurveWire(x1, y1, x2, y2, color) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const cpY = y1 + (y2 - y1) / 2 + 30; 
        ctx.bezierCurveTo(x1, cpY, x2, cpY, x2, y2);
        ctx.stroke();
    }

    // (Control Box se mantiene igual por ahora, es abstracta)
    function drawControlBox() {
        const startX = 600;
        const startY = 100;
        // ... (código existente del panel de mando)
        // Se puede mejorar renderizando los botones Start/Stop con las fotos si se quiere
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; // Panel más oscuro
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.roundRect(startX, startY, 180, 250, 10); // Bordes redondeados
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center';
        ctx.fillText('ESQUEMA DE MANDO', startX + 90, startY + 20);

        // Renderizar botones REALES en el panel si están disponibles
        const btnSize = 40;
        
        ctx.fillStyle = '#fff';
        
        // STOP
        ctx.fillText('STOP', startX + 90, startY + 60);
        if(loadedImages.pushStop) {
            ctx.drawImage(loadedImages.pushStop, startX + 70, startY + 70, btnSize, btnSize);
            if(state.stopPressed) { // Efecto visual de pulsado
                ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(startX + 90, startY + 90, 18, 0, Math.PI*2); ctx.fill();
            }
        } else {
             // Fallback
             ctx.fillStyle = state.stopPressed ? '#ef4444' : '#991b1b';
             ctx.beginPath(); ctx.arc(startX + 90, startY + 90, 15, 0, Math.PI*2); ctx.fill();
        }

        // START
        ctx.fillStyle = '#fff';
        ctx.fillText('START', startX + 90, startY + 130);
        if(loadedImages.pushStart) {
            ctx.drawImage(loadedImages.pushStart, startX + 70, startY + 140, btnSize, btnSize);
            if(state.startPressed) { 
                ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(startX + 90, startY + 160, 18, 0, Math.PI*2); ctx.fill();
            }
        } else {
             ctx.fillStyle = state.startPressed ? '#22c55e' : '#15803d';
             ctx.beginPath(); ctx.arc(startX + 90, startY + 160, 15, 0, Math.PI*2); ctx.fill();
        }

        // Bobina KM1
        ctx.fillStyle = '#fff'; ctx.fillText('KM1 (Bobina)', startX + 90, startY + 200);
        ctx.strokeStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(startX + 90, startY + 220, 15, 0, Math.PI*2); ctx.stroke();
        if(state.contactorEngaged) { ctx.fillStyle = '#fbbf24'; ctx.fill(); }
    }


    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); 

        // Dibujar cables PRIMERO para que queden debajo de las fotos
        drawWires();
        
        drawRailDIN(components.rail.x, components.rail.y, components.rail.width); // Riel
        drawBreaker(components.breaker, state.breakerClosed);
        drawContactor(components.contactor, state.contactorEngaged);
        drawThermalRelay(components.thermalRelay, state.thermalTripped);
        drawMotor(components.motor, state.motorRunning, state.motorAngle);
        
        drawControlBox();
    }


    function animate() {
        if (state.motorRunning) {
            state.motorAngle += 0.2;
        }
        draw();
        requestAnimationFrame(animate);
    }

    // ============== SIMULATION LOGIC ==============
    function updateSimulation() {
        console.log("UpdateSim -> Mode:", state.selectorMode, " Start:", state.startPressed, " Stop:", state.stopPressed);

        if (!state.isRunning) {
            state.motorRunning = false;
            state.contactorEngaged = false;
            updatePilotLights();
            return;
        }

        let coilPower = false;
        
        if (!state.breakerClosed) {
            coilPower = false;
        } else {
            if (state.selectorMode === 'M') { 
                 coilPower = true;
            } else if (state.selectorMode === 'A') { 
                 if (state.stopPressed) {
                     state.contactorEngaged = false; 
                 }
                 if (state.startPressed) {
                     coilPower = true;
                 } else {
                     if (state.contactorEngaged) {
                         coilPower = true;
                     }
                 }
            } else { 
                 coilPower = false;
            }
        }
        
        if (state.thermalTripped) {
            coilPower = false;
        }

        state.contactorEngaged = coilPower;
        state.motorRunning = state.contactorEngaged && state.breakerClosed && !state.thermalTripped;
        
        updatePilotLights();
    }

    function updatePilotLights() {
        const runLight = document.getElementById('pilot-run');
        const stopLight = document.getElementById('pilot-stop');
        
        if (runLight && stopLight) {
            if (state.motorRunning) {
                runLight.classList.add('on');
                stopLight.classList.remove('on');
            } else {
                runLight.classList.remove('on');
                stopLight.classList.add('on');
            }
        }
    }

    // ============== EVENT LISTENERS ==============
    
    const btnSimulate = document.getElementById('btn-simulate');
    if (btnSimulate) {
        btnSimulate.addEventListener('click', () => {
            state.isRunning = true;
            document.getElementById('status-dot').classList.add('running');
            document.getElementById('status-text').textContent = 'Simulando';
            updateSimulation();
        });
    }

    const btnStopSim = document.getElementById('btn-stop-sim');
    if (btnStopSim) {
        btnStopSim.addEventListener('click', () => {
            state.isRunning = false;
            document.getElementById('status-dot').classList.remove('running');
            document.getElementById('status-text').textContent = 'Detenido';
            updateSimulation();
        });
    }

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
             state.isRunning = false;
             state.selectorMode = 'O';
             state.breakerClosed = true;
             state.thermalTripped = false;
             state.contactorEngaged = false;
             state.motorRunning = false;
             
             document.querySelectorAll('.selector-opt').forEach(b => b.classList.remove('active'));
             const optO = document.querySelector('.selector-opt[data-mode="O"]');
             if(optO) optO.classList.add('active');
             
             updatePilotLights();
        });
    }

    document.querySelectorAll('.selector-opt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.selector-opt').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.selectorMode = e.target.dataset.mode;
            updateSimulation();
        });
    });

    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
        btnStart.addEventListener('mousedown', () => { state.startPressed = true; updateSimulation(); });
        btnStart.addEventListener('mouseup', () => { state.startPressed = false; updateSimulation(); });
        btnStart.addEventListener('mouseleave', () => { if(state.startPressed) { state.startPressed = false; updateSimulation(); }});
        btnStart.addEventListener('touchstart', (e) => { e.preventDefault(); state.startPressed = true; updateSimulation(); });
        btnStart.addEventListener('touchend', (e) => { e.preventDefault(); state.startPressed = false; updateSimulation(); });
    }

    const btnStop = document.getElementById('btn-stop');
    if (btnStop) {
        btnStop.addEventListener('mousedown', () => { state.stopPressed = true; updateSimulation(); });
        btnStop.addEventListener('mouseup', () => { state.stopPressed = false; updateSimulation(); });
        btnStop.addEventListener('mouseleave', () => { if(state.stopPressed) { state.stopPressed = false; updateSimulation(); }});
    }

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const b = components.breaker;
        if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
            state.breakerClosed = !state.breakerClosed;
            updateSimulation();
        }

        const t = components.thermalRelay;
        if (x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + t.height) {
            if (state.thermalTripped) {
                state.thermalTripped = false;
                updateSimulation();
            }
        }
    });

    animate();
    updatePilotLights();
}
