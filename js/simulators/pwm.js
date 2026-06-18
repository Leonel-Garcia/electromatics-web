/**
 * PWM Simulator - Lógica y Física
 * Electromatics.com.ve
 */

document.addEventListener('DOMContentLoaded', () => {
    // Parámetros e Elementos del DOM
    const dutySlider = document.getElementById('duty');
    const freqSlider = document.getElementById('freq');
    const voltageSlider = document.getElementById('voltage');
    const loadSelect = document.getElementById('load-type');
    
    const valDuty = document.getElementById('val-duty');
    const valFreq = document.getElementById('val-freq');
    const valVoltage = document.getElementById('val-voltage');
    
    // Métricas en tiempo real
    const metricVavg = document.getElementById('metric-vavg');
    const metricVrms = document.getElementById('metric-vrms');
    const metricRipple = document.getElementById('metric-ripple');
    const metricIavg = document.getElementById('metric-iavg');
    
    // Canvas
    const oscCanvas = document.getElementById('oscCanvas');
    const oscCtx = oscCanvas.getContext('2d');
    
    const ledCanvas = document.getElementById('ledCanvas');
    const ledCtx = ledCanvas.getContext('2d');
    
    const motorCanvas = document.getElementById('motorCanvas');
    const motorCtx = motorCanvas.getContext('2d');
    
    // Variables de Simulación
    let duty = parseFloat(dutySlider.value) / 100.0;
    let frequency = parseFloat(freqSlider.value);
    let voltage = parseFloat(voltageSlider.value);
    let loadType = loadSelect.value; // 'led' o 'motor'
    
    let lastTime = performance.now();
    let simTime = 0.0; // tiempo de simulación acumulado
    
    // Parámetros físicos internos
    // Para el LED (carga resistiva pura)
    const R_led = 220; // Ohms
    // Para el Motor DC (carga inductiva y back-EMF)
    const R_motor = 5.0; // Ohms
    const L_motor = 0.05; // Henries (50 mH)
    let current = 0.0; // Corriente instantánea
    let motorSpeed = 0.0; // rad/s
    let motorAngle = 0.0; // radianes
    let motorEb = 0.0; // Fuerza contraelectromotriz (Back-EMF)
    const Ke = 0.15; // Constante de voltaje (V / (rad/s))
    const Kt = 0.15; // Constante de torque (N-m / A)
    const J_inertia = 0.005; // Inercia del rotor (kg*m^2)
    const B_friction = 0.01; // Coeficiente de fricción viscosa
    const LoadTorque = 0.05; // Torque de carga externo constante
    
    // Historial para el osciloscopio
    const historyLength = 400;
    const vHistory = new Float32Array(historyLength);
    const iHistory = new Float32Array(historyLength);
    let historyIndex = 0;
    
    // Inicializar historial
    for(let i = 0; i < historyLength; i++) {
        vHistory[i] = 0.0;
        iHistory[i] = 0.0;
    }
    
    // Manejo de eventos
    dutySlider.addEventListener('input', (e) => {
        duty = parseFloat(e.target.value) / 100.0;
        valDuty.textContent = e.target.value;
        updateFórmulas();
    });
    
    freqSlider.addEventListener('input', (e) => {
        frequency = parseFloat(e.target.value);
        let freqText = frequency >= 1000 ? (frequency / 1000).toFixed(1) + ' kHz' : frequency + ' Hz';
        valFreq.textContent = freqText;
        updateFórmulas();
    });
    
    voltageSlider.addEventListener('input', (e) => {
        voltage = parseFloat(e.target.value);
        valVoltage.textContent = voltage.toFixed(1);
        updateFórmulas();
    });
    
    loadSelect.addEventListener('change', (e) => {
        loadType = e.target.value;
        current = 0.0;
        motorSpeed = 0.0;
        motorEb = 0.0;
        updateFórmulas();
        
        // Mostrar/ocultar paneles específicos
        const ledCard = document.getElementById('led-card-container');
        const motorCard = document.getElementById('motor-card-container');
        if (loadType === 'led') {
            ledCard.style.display = 'block';
            motorCard.style.display = 'none';
        } else {
            ledCard.style.display = 'none';
            motorCard.style.display = 'block';
        }
    });
    
    document.getElementById('reset-sim').addEventListener('click', () => {
        current = 0.0;
        motorSpeed = 0.0;
        motorAngle = 0.0;
        simTime = 0.0;
        for(let i = 0; i < historyLength; i++) {
            vHistory[i] = 0.0;
            iHistory[i] = 0.0;
        }
        updateFórmulas();
    });
    
    // Actualizar fórmulas teóricas en pantalla en tiempo real
    function updateFórmulas() {
        const vavg = duty * voltage;
        const vrms = Math.sqrt(duty) * voltage;
        
        metricVavg.textContent = vavg.toFixed(2) + ' V';
        metricVrms.textContent = vrms.toFixed(2) + ' V';
        
        // Fórmulas teóricas en la sección didáctica
        document.getElementById('formula-d').innerHTML = `D = ${(duty * 100).toFixed(0)}%`;
        document.getElementById('formula-vavg').innerHTML = `V<sub>prom</sub> = D &times; V<sub>in</sub> = ${duty.toFixed(2)} &times; ${voltage.toFixed(1)}V = <strong>${vavg.toFixed(2)} V</strong>`;
        document.getElementById('formula-vrms').innerHTML = `V<sub>rms</sub> = &radic;D &times; V<sub>in</sub> = ${Math.sqrt(duty).toFixed(3)} &times; ${voltage.toFixed(1)}V = <strong>${vrms.toFixed(2)} V</strong>`;
        
        if (loadType === 'led') {
            const p_avg = (duty * voltage * voltage) / R_led;
            document.getElementById('formula-pavg').innerHTML = `P<sub>prom</sub> = D &times; V<sub>in</sub><sup>2</sup> / R = ${duty.toFixed(2)} &times; ${(voltage*voltage).toFixed(0)} / ${R_led}&Omega; = <strong>${p_avg.toFixed(3)} W</strong>`;
            metricRipple.textContent = '0.00 V';
            metricIavg.textContent = ((vavg / R_led) * 1000).toFixed(1) + ' mA';
        } else {
            // Estimación teórica de corriente de motor
            const iavg = (vavg - motorEb) / R_motor;
            document.getElementById('formula-pavg').innerHTML = `P<sub>mecánica</sub> = E<sub>b</sub> &times; I<sub>prom</sub> = ${motorEb.toFixed(2)}V &times; ${Math.max(0, iavg).toFixed(2)}A = <strong>${Math.max(0, motorEb * iavg).toFixed(2)} W</strong>`;
        }
    }
    
    // Bucle físico y renderizado principal
    function loop(now) {
        let dt = (now - lastTime) / 1000.0; // en segundos
        lastTime = now;
        
        // Limitar dt para evitar inestabilidad al cambiar de pestaña
        if (dt > 0.1) dt = 0.1;
        
        // Física interna
        const period = 1.0 / frequency;
        
        // Resolver ecuaciones diferenciales con pasos de tiempo más pequeños para estabilidad (Sub-stepping)
        const subSteps = 10;
        const subDt = dt / subSteps;
        
        let localV = 0.0;
        for(let step = 0; step < subSteps; step++) {
            simTime += subDt;
            const tInPeriod = simTime % period;
            const stateOn = tInPeriod < (duty * period);
            localV = stateOn ? voltage : 0.0;
            
            if (loadType === 'led') {
                current = localV / R_led;
                motorSpeed = 0.0;
                motorEb = 0.0;
            } else {
                // Modelo de Motor DC
                motorEb = Ke * motorSpeed;
                
                // di/dt = (V_pwm - R*i - Eb) / L
                // Si el pulso está en OFF (0V), el diodo de libre circulación se activa para mantener la corriente fluyendo
                // En este caso, la ecuación sigue siendo similar con V = 0, y la inductancia disipa su energía
                let vTerm = localV;
                
                let didt = (vTerm - R_motor * current - motorEb) / L_motor;
                current += didt * subDt;
                
                // Si la corriente se hace negativa, el diodo previene corriente inversa (flujo unidireccional)
                if (current < 0) current = 0;
                
                // Torque motor = Kt * i
                const torqueMotor = Kt * current;
                const netTorque = torqueMotor - B_friction * motorSpeed - (motorSpeed > 0.1 ? LoadTorque : 0);
                
                // dw/dt = Torque / J
                let dwdt = netTorque / J_inertia;
                motorSpeed += dwdt * subDt;
                if (motorSpeed < 0) motorSpeed = 0;
                
                motorAngle += motorSpeed * subDt;
            }
        }
        
        // Registrar en historial
        vHistory[historyIndex] = localV;
        iHistory[historyIndex] = current;
        historyIndex = (historyIndex + 1) % historyLength;
        
        // Actualizar métricas del motor en tiempo real
        if (loadType === 'motor') {
            metricIavg.textContent = current.toFixed(2) + ' A';
            
            // Medir el rizado (diferencia entre max y min en el periodo visible)
            // Se calcula a partir de los datos históricos recientes correspondientes a un par de períodos
            let pointsInPeriod = Math.min(historyLength, Math.round(period / (dt / historyLength)));
            if (pointsInPeriod < 5) pointsInPeriod = 5;
            if (pointsInPeriod > historyLength) pointsInPeriod = historyLength;
            
            let minI = Infinity;
            let maxI = -Infinity;
            for (let i = 0; i < pointsInPeriod; i++) {
                let idx = (historyIndex - 1 - i + historyLength) % historyLength;
                let val = iHistory[idx];
                if (val < minI) minI = val;
                if (val > maxI) maxI = val;
            }
            let ripple = maxI - minI;
            metricRipple.textContent = isFinite(ripple) ? Math.max(0, ripple).toFixed(2) + ' A' : '0.00 A';
        }
        
        // Dibujar elementos
        drawOscilloscope();
        
        if (loadType === 'led') {
            drawLED(localV);
        } else {
            drawMotor();
        }
        
        requestAnimationFrame(loop);
    }
    
    // Dibujar el osciloscopio interactivo
    function drawOscilloscope() {
        const width = oscCanvas.width;
        const height = oscCanvas.height;
        
        // Limpiar
        oscCtx.fillStyle = '#0b1116';
        oscCtx.fillRect(0, 0, width, height);
        
        // Dibujar rejilla
        oscCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        oscCtx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < width; x += gridSize) {
            oscCtx.beginPath();
            oscCtx.moveTo(x, 0);
            oscCtx.lineTo(x, height);
            oscCtx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
            oscCtx.beginPath();
            oscCtx.moveTo(0, y);
            oscCtx.lineTo(width, y);
            oscCtx.stroke();
        }
        
        // Ejes
        oscCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        oscCtx.lineWidth = 1.5;
        oscCtx.beginPath();
        oscCtx.moveTo(40, 0);
        oscCtx.lineTo(40, height);
        oscCtx.moveTo(0, height - 30);
        oscCtx.lineTo(width, height - 30);
        oscCtx.stroke();
        
        // Escalas
        const vMaxScale = 30.0; // Max 30V
        const iMaxScale = loadType === 'led' ? 0.15 : 5.0; // Max 150mA para LED, 5A para motor
        
        // Trazado de señales
        const startX = 40;
        const graphWidth = width - startX;
        
        oscCtx.lineWidth = 2.5;
        
        // Señal de Voltaje (Amarillo/Naranja)
        oscCtx.strokeStyle = '#ff6d00';
        oscCtx.beginPath();
        for (let i = 0; i < graphWidth; i++) {
            let histIdx = (historyIndex + i - graphWidth + historyLength) % historyLength;
            let vVal = vHistory[histIdx];
            // Mapeo
            let x = startX + i;
            let y = (height - 30) - (vVal / vMaxScale) * (height - 60);
            if (i === 0) oscCtx.moveTo(x, y);
            else oscCtx.lineTo(x, y);
        }
        oscCtx.stroke();
        
        // Señal de Corriente (Celeste)
        oscCtx.strokeStyle = '#00e5ff';
        oscCtx.beginPath();
        for (let i = 0; i < graphWidth; i++) {
            let histIdx = (historyIndex + i - graphWidth + historyLength) % historyLength;
            let iVal = iHistory[histIdx];
            // Mapeo
            let x = startX + i;
            let y = (height - 30) - (iVal / iMaxScale) * (height - 60);
            if (i === 0) oscCtx.moveTo(x, y);
            else oscCtx.lineTo(x, y);
        }
        oscCtx.stroke();
        
        // Línea de Voltaje Promedio (Segmentada verde)
        const vavg = duty * voltage;
        const yAvg = (height - 30) - (vavg / vMaxScale) * (height - 60);
        oscCtx.strokeStyle = '#4caf50';
        oscCtx.lineWidth = 1.5;
        oscCtx.setLineDash([5, 5]);
        oscCtx.beginPath();
        oscCtx.moveTo(startX, yAvg);
        oscCtx.lineTo(width, yAvg);
        oscCtx.stroke();
        oscCtx.setLineDash([]); // Reset
        
        // Etiquetas
        oscCtx.fillStyle = '#ff6d00';
        oscCtx.font = '10px Inter';
        oscCtx.fillText('V(t) [Voltios]', 10, 15);
        oscCtx.fillStyle = '#00e5ff';
        oscCtx.fillText('I(t) [Corriente]', 10, 28);
        oscCtx.fillStyle = '#4caf50';
        oscCtx.fillText(`Vavg = ${vavg.toFixed(1)}V`, width - 80, yAvg - 5);
    }
    
    // Dibujar el LED didáctico
    function drawLED(instantVoltage) {
        const width = ledCanvas.width;
        const height = ledCanvas.height;
        
        ledCtx.clearRect(0, 0, width, height);
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Determinar brillo instantáneo o promedio según la frecuencia (Persistencia de visión)
        let brightness = 0.0;
        if (frequency >= 60) {
            // El ojo humano no percibe la alternancia por encima de ~60Hz. Ve la media de potencia.
            brightness = duty;
        } else {
            // Parpadeo visible en tiempo real
            brightness = instantVoltage > 0 ? 1.0 : 0.05;
        }
        
        // Sombra de resplandor (Glow)
        if (brightness > 0.1) {
            let glowGrad = ledCtx.createRadialGradient(centerX, centerY - 10, 5, centerX, centerY - 10, 60);
            glowGrad.addColorStop(0, `rgba(255, 109, 0, ${brightness * 0.8})`);
            glowGrad.addColorStop(1, 'rgba(255, 109, 0, 0)');
            ledCtx.fillStyle = glowGrad;
            ledCtx.beginPath();
            ledCtx.arc(centerX, centerY - 10, 60, 0, Math.PI * 2);
            ledCtx.fill();
        }
        
        // Dibuja el cuerpo físico del LED
        // Base / Copa reflectora de metal
        ledCtx.fillStyle = '#3c4858';
        ledCtx.beginPath();
        ledCtx.moveTo(centerX - 25, centerY + 30);
        ledCtx.lineTo(centerX + 25, centerY + 30);
        ledCtx.lineTo(centerX + 15, centerY + 45);
        ledCtx.lineTo(centerX - 15, centerY + 45);
        ledCtx.closePath();
        ledCtx.fill();
        
        // Terminales (Pines)
        ledCtx.strokeStyle = '#8b949e';
        ledCtx.lineWidth = 3;
        // Anodo
        ledCtx.beginPath();
        ledCtx.moveTo(centerX - 10, centerY + 40);
        ledCtx.lineTo(centerX - 10, centerY + 80);
        ledCtx.stroke();
        // Catodo (más corto o doblado)
        ledCtx.beginPath();
        ledCtx.moveTo(centerX + 10, centerY + 40);
        ledCtx.lineTo(centerX + 10, centerY + 70);
        ledCtx.stroke();
        
        // Cuerpo de plástico del LED (Cápsula)
        let ledColorGrad = ledCtx.createLinearGradient(centerX - 20, 0, centerX + 20, 0);
        if (brightness > 0.1) {
            // LED encendido (naranja brillante)
            ledColorGrad.addColorStop(0, '#ff9100');
            ledColorGrad.addColorStop(0.3, '#ffab40');
            ledColorGrad.addColorStop(1, '#ff6d00');
        } else {
            // LED apagado (rojo/naranja oscuro translúcido)
            ledColorGrad.addColorStop(0, '#5d2600');
            ledColorGrad.addColorStop(1, '#3b1800');
        }
        
        ledCtx.fillStyle = ledColorGrad;
        ledCtx.beginPath();
        // Parte superior redondeada
        ledCtx.arc(centerX, centerY - 10, 22, Math.PI, 0, false);
        // Costados rectos
        ledCtx.lineTo(centerX + 22, centerY + 28);
        ledCtx.lineTo(centerX - 22, centerY + 28);
        ledCtx.closePath();
        ledCtx.fill();
        
        // Borde plano inferior del LED (Base plana indicando el cátodo en el lado derecho)
        ledCtx.beginPath();
        ledCtx.arc(centerX, centerY + 28, 22, 0, Math.PI, false);
        ledCtx.fill();
        
        // Brillo reflector (Highlight)
        ledCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ledCtx.beginPath();
        ledCtx.ellipse(centerX - 10, centerY - 15, 5, 10, Math.PI / 4, 0, Math.PI * 2);
        ledCtx.fill();
    }
    
    // Dibujar el Motor DC dinámico
    function drawMotor() {
        const width = motorCanvas.width;
        const height = motorCanvas.height;
        
        motorCtx.clearRect(0, 0, width, height);
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Estator (Carcasa exterior metálica)
        motorCtx.strokeStyle = '#475569';
        motorCtx.lineWidth = 10;
        motorCtx.beginPath();
        motorCtx.arc(centerX, centerY, 55, 0, Math.PI * 2);
        motorCtx.stroke();
        
        // Imanes permanentes (Estator)
        // Imán Norte (Rojo)
        motorCtx.fillStyle = '#ef4444';
        motorCtx.beginPath();
        motorCtx.arc(centerX, centerY, 50, -Math.PI/4 - Math.PI/2, Math.PI/4 - Math.PI/2);
        motorCtx.lineTo(centerX, centerY);
        motorCtx.closePath();
        motorCtx.fill();
        
        // Imán Sur (Azul)
        motorCtx.fillStyle = '#3b82f6';
        motorCtx.beginPath();
        motorCtx.arc(centerX, centerY, 50, -Math.PI/4 + Math.PI/2, Math.PI/4 + Math.PI/2);
        motorCtx.lineTo(centerX, centerY);
        motorCtx.closePath();
        motorCtx.fill();
        
        // Núcleo del Rotor (Gris interior)
        motorCtx.fillStyle = '#1e293b';
        motorCtx.beginPath();
        motorCtx.arc(centerX, centerY, 42, 0, Math.PI * 2);
        motorCtx.fill();
        
        // Dibujar bobinas rotativas (Tres polos/devanados)
        motorCtx.save();
        motorCtx.translate(centerX, centerY);
        motorCtx.rotate(motorAngle);
        
        const numPoles = 3;
        for (let i = 0; i < numPoles; i++) {
            motorCtx.save();
            motorCtx.rotate((i * Math.PI * 2) / numPoles);
            
            // Bobina (Cobre)
            motorCtx.fillStyle = '#b45309'; // Color cobre
            motorCtx.strokeStyle = '#d97706';
            motorCtx.lineWidth = 2;
            motorCtx.fillRect(-10, -38, 20, 16);
            motorCtx.strokeRect(-10, -38, 20, 16);
            
            // Núcleo de hierro del polo
            motorCtx.fillStyle = '#64748b';
            motorCtx.fillRect(-7, -42, 14, 4);
            
            // Eje central del rotor
            motorCtx.fillStyle = '#e2e8f0';
            motorCtx.beginPath();
            motorCtx.arc(0, 0, 8, 0, Math.PI * 2);
            motorCtx.fill();
            
            // Aspa/Indicador de rotación acoplada al eje
            motorCtx.strokeStyle = '#ffffff';
            motorCtx.lineWidth = 3;
            motorCtx.beginPath();
            motorCtx.moveTo(0, 0);
            motorCtx.lineTo(0, -32);
            motorCtx.stroke();
            
            motorCtx.restore();
        }
        
        // Flecha indicadora de dirección en el ventilador exterior
        motorCtx.restore();
        
        // Escobillas y conmutador (Eje fijo delantero)
        motorCtx.fillStyle = '#f59e0b';
        motorCtx.beginPath();
        motorCtx.arc(centerX, centerY, 12, 0, Math.PI * 2);
        motorCtx.fill();
        
        // Escobilla Izquierda
        motorCtx.fillStyle = '#000000';
        motorCtx.fillRect(centerX - 22, centerY - 3, 10, 6);
        // Escobilla Derecha
        motorCtx.fillRect(centerX + 12, centerY - 3, 10, 6);
        
        // Texto con RPM
        const rpm = (motorSpeed * (60.0 / (Math.PI * 2))).toFixed(0);
        motorCtx.fillStyle = '#ffffff';
        motorCtx.font = 'bold 13px Inter';
        motorCtx.textAlign = 'center';
        motorCtx.fillText(`${rpm} RPM`, centerX, centerY + 80);
    }
    
    // Iniciar loop e inicialización teórica
    updateFórmulas();
    requestAnimationFrame(loop);
});
