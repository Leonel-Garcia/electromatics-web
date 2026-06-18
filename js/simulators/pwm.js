/**
 * PWM Simulator - Lógica, Física y Osciloscopio Profesional
 * Electromatics.com.ve
 */

document.addEventListener('DOMContentLoaded', () => {
    // Parámetros del Simulador Físico
    const dutySlider = document.getElementById('duty');
    const freqSlider = document.getElementById('freq');
    const voltageSlider = document.getElementById('voltage');
    const loadSelect = document.getElementById('load-type');
    
    const valDuty = document.getElementById('val-duty');
    const valFreq = document.getElementById('val-freq');
    const valVoltage = document.getElementById('val-voltage');
    
    // Parámetros de Control del Osciloscopio
    const timebaseSlider = document.getElementById('timebase');
    const ch1ScaleSlider = document.getElementById('ch1-scale');
    const ch2ScaleSlider = document.getElementById('ch2-scale');
    const ch1PosSlider = document.getElementById('ch1-pos');
    const ch2PosSlider = document.getElementById('ch2-pos');
    
    const valTimebase = document.getElementById('val-timebase');
    const valCh1Scale = document.getElementById('val-ch1-scale');
    const valCh2Scale = document.getElementById('val-ch2-scale');
    const valCh1Pos = document.getElementById('val-ch1-pos');
    const valCh2Pos = document.getElementById('val-ch2-pos');
    
    // Métricas
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
    
    // Variables Físicas
    let duty = parseFloat(dutySlider.value) / 100.0;
    let frequency = parseFloat(freqSlider.value);
    let voltage = parseFloat(voltageSlider.value);
    let loadType = loadSelect.value;
    
    // Variables de Osciloscopio
    let timebaseMs = parseFloat(timebaseSlider.value); // ms por división
    let ch1Scale = parseFloat(ch1ScaleSlider.value);   // V por división
    let ch2Scale = parseFloat(ch2ScaleSlider.value);   // A por división
    let ch1OffsetY = parseFloat(ch1PosSlider.value);    // Desplazamiento vertical Ch1 en píxeles
    let ch2OffsetY = parseFloat(ch2PosSlider.value);    // Desplazamiento vertical Ch2 en píxeles
    
    let lastTime = performance.now();
    let globalSimTime = 0.0; // tiempo absoluto acumulado de simulación (segundos)
    
    // Parámetros Físicos de Carga
    const R_led = 220; // Ohmios
    const R_motor = 5.0; // Ohmios
    const L_motor = 0.05; // Henries (50 mH)
    let current = 0.0; // Corriente instantánea
    let motorSpeed = 0.0;
    let motorAngle = 0.0;
    let motorEb = 0.0;
    const Ke = 0.15;
    const Kt = 0.15;
    const J_inertia = 0.005;
    const B_friction = 0.01;
    const LoadTorque = 0.05;
    
    // Buffer Circular de Alta Resolución para Osciloscopio
    // Guardamos tiempo de simulación, voltaje y corriente para sincronización por trigger
    const ringBufferSize = 8000;
    const timeHistory = new Float32Array(ringBufferSize);
    const vHistory = new Float32Array(ringBufferSize);
    const iHistory = new Float32Array(ringBufferSize);
    let ringBufferPtr = 0;
    
    // Inicializar buffer circular
    for (let i = 0; i < ringBufferSize; i++) {
        timeHistory[i] = 0.0;
        vHistory[i] = 0.0;
        iHistory[i] = 0.0;
    }
    
    // Manejo de Eventos Físicos
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
    
    // Manejo de Eventos del Osciloscopio
    timebaseSlider.addEventListener('input', (e) => {
        timebaseMs = parseFloat(e.target.value);
        valTimebase.textContent = timebaseMs.toFixed(1) + ' ms/div';
    });
    
    ch1ScaleSlider.addEventListener('input', (e) => {
        ch1Scale = parseFloat(e.target.value);
        valCh1Scale.textContent = ch1Scale.toFixed(0) + ' V';
    });
    
    ch2ScaleSlider.addEventListener('input', (e) => {
        ch2Scale = parseFloat(e.target.value);
        valCh2Scale.textContent = ch2Scale.toFixed(1) + ' A';
    });
    
    ch1PosSlider.addEventListener('input', (e) => {
        ch1OffsetY = parseFloat(e.target.value);
        valCh1Pos.textContent = (ch1OffsetY > 0 ? '+' : '') + ch1OffsetY + ' px';
    });
    
    ch2PosSlider.addEventListener('input', (e) => {
        ch2OffsetY = parseFloat(e.target.value);
        valCh2Pos.textContent = (ch2OffsetY > 0 ? '+' : '') + ch2OffsetY + ' px';
    });
    
    document.getElementById('reset-sim').addEventListener('click', () => {
        current = 0.0;
        motorSpeed = 0.0;
        motorAngle = 0.0;
        globalSimTime = 0.0;
        for (let i = 0; i < ringBufferSize; i++) {
            timeHistory[i] = 0.0;
            vHistory[i] = 0.0;
            iHistory[i] = 0.0;
        }
        updateFórmulas();
    });
    
    function updateFórmulas() {
        const vavg = duty * voltage;
        const vrms = Math.sqrt(duty) * voltage;
        
        metricVavg.textContent = vavg.toFixed(2) + ' V';
        metricVrms.textContent = vrms.toFixed(2) + ' V';
        
        document.getElementById('formula-d').innerHTML = `D = ${(duty * 100).toFixed(0)}%`;
        document.getElementById('formula-vavg').innerHTML = `V<sub>prom</sub> = D &times; V<sub>in</sub> = ${duty.toFixed(2)} &times; ${voltage.toFixed(1)}V = <strong>${vavg.toFixed(2)} V</strong>`;
        document.getElementById('formula-vrms').innerHTML = `V<sub>rms</sub> = &radic;D &times; V<sub>in</sub> = ${Math.sqrt(duty).toFixed(3)} &times; ${voltage.toFixed(1)}V = <strong>${vrms.toFixed(2)} V</strong>`;
        
        if (loadType === 'led') {
            const p_avg = (duty * voltage * voltage) / R_led;
            document.getElementById('formula-pavg').innerHTML = `P<sub>prom</sub> = D &times; V<sub>in</sub><sup>2</sup> / R = ${duty.toFixed(2)} &times; ${(voltage*voltage).toFixed(0)} / ${R_led}&Omega; = <strong>${p_avg.toFixed(3)} W</strong>`;
            metricRipple.textContent = '0.00 A';
            metricIavg.textContent = ((vavg / R_led) * 1000).toFixed(1) + ' mA';
        } else {
            const iavg = (vavg - motorEb) / R_motor;
            document.getElementById('formula-pavg').innerHTML = `P<sub>mecánica</sub> = E<sub>b</sub> &times; I<sub>prom</sub> = ${motorEb.toFixed(2)}V &times; ${Math.max(0, iavg).toFixed(2)}A = <strong>${Math.max(0, motorEb * iavg).toFixed(2)} W</strong>`;
        }
    }
    
    // Bucle Físico
    function loop(now) {
        let dt = (now - lastTime) / 1000.0; // en segundos
        lastTime = now;
        
        if (dt > 0.1) dt = 0.1;
        
        const period = 1.0 / frequency;
        
        // Simular con pasos fijos pequeños (Sub-stepping) para evitar acumulación de errores de integración
        const subSteps = 25;
        const subDt = dt / subSteps;
        
        for (let step = 0; step < subSteps; step++) {
            globalSimTime += subDt;
            const tInPeriod = globalSimTime % period;
            const stateOn = tInPeriod < (duty * period);
            const localV = stateOn ? voltage : 0.0;
            
            if (loadType === 'led') {
                current = localV / R_led;
                motorSpeed = 0.0;
                motorEb = 0.0;
            } else {
                motorEb = Ke * motorSpeed;
                
                let didt = (localV - R_motor * current - motorEb) / L_motor;
                current += didt * subDt;
                if (current < 0) current = 0;
                
                const torqueMotor = Kt * current;
                const netTorque = torqueMotor - B_friction * motorSpeed - (motorSpeed > 0.1 ? LoadTorque : 0);
                
                let dwdt = netTorque / J_inertia;
                motorSpeed += dwdt * subDt;
                if (motorSpeed < 0) motorSpeed = 0;
                
                motorAngle += motorSpeed * subDt;
            }
            
            // Registrar datos con resolución temporal alta
            timeHistory[ringBufferPtr] = globalSimTime;
            vHistory[ringBufferPtr] = localV;
            iHistory[ringBufferPtr] = current;
            ringBufferPtr = (ringBufferPtr + 1) % ringBufferSize;
        }
        
        // Métricas de corriente promedio y rizado
        if (loadType === 'motor') {
            // Calcular promedios a partir de los últimos datos registrados equivalentes a un período entero
            let pointsToLook = Math.min(ringBufferSize - 1, Math.round(period / subDt));
            if (pointsToLook < 10) pointsToLook = 10;
            
            let sumI = 0.0;
            let minI = Infinity;
            let maxI = -Infinity;
            
            for (let i = 0; i < pointsToLook; i++) {
                let idx = (ringBufferPtr - 1 - i + ringBufferSize) % ringBufferSize;
                let val = iHistory[idx];
                sumI += val;
                if (val < minI) minI = val;
                if (val > maxI) maxI = val;
            }
            
            let iAvg = sumI / pointsToLook;
            let iRipple = maxI - minI;
            
            metricIavg.textContent = iAvg.toFixed(2) + ' A';
            metricRipple.textContent = isFinite(iRipple) ? Math.max(0, iRipple).toFixed(2) + ' A' : '0.00 A';
        }
        
        drawOscilloscope();
        
        if (loadType === 'led') {
            drawLED(vHistory[(ringBufferPtr - 1 + ringBufferSize) % ringBufferSize]);
        } else {
            drawMotor();
        }
        
        requestAnimationFrame(loop);
    }
    
    // Reconstrucción del trazo mediante trigger sincronizado
    function drawOscilloscope() {
        const w = oscCanvas.width;
        const h = oscCanvas.height;
        
        // Fondo negro verdoso de osciloscopio CRT
        oscCtx.fillStyle = '#060a0d';
        oscCtx.fillRect(0, 0, w, h);
        
        // Dimensiones útiles del osciloscopio
        const gridCols = 10;
        const gridRows = 8;
        const startX = 50; // Margen para la escala vertical
        const startY = 10;
        const endX = w - 20;
        const endY = h - 30; // Margen inferior para la escala horizontal
        
        const plotWidth = endX - startX;
        const plotHeight = endY - startY;
        
        // Rejilla de retícula analógica (Grid)
        oscCtx.strokeStyle = '#0e2417';
        oscCtx.lineWidth = 1;
        
        // Líneas verticales
        for (let c = 0; c <= gridCols; c++) {
            let x = startX + (c / gridCols) * plotWidth;
            oscCtx.beginPath();
            oscCtx.moveTo(x, startY);
            oscCtx.lineTo(x, endY);
            oscCtx.stroke();
        }
        
        // Líneas horizontales
        for (let r = 0; r <= gridRows; r++) {
            let y = startY + (r / gridRows) * plotHeight;
            oscCtx.beginPath();
            oscCtx.moveTo(startX, y);
            oscCtx.lineTo(endX, y);
            oscCtx.stroke();
        }
        
        // Ejes centrales con marcas más gruesas (Ticks)
        oscCtx.strokeStyle = '#1e462f';
        oscCtx.lineWidth = 1.5;
        const midX = startX + 0.5 * plotWidth;
        const midY = startY + 0.5 * plotHeight;
        
        oscCtx.beginPath();
        oscCtx.moveTo(midX, startY);
        oscCtx.lineTo(midX, endY);
        oscCtx.moveTo(startX, midY);
        oscCtx.lineTo(endX, midY);
        oscCtx.stroke();
        
        // Dibujar ticks menores a lo largo de los ejes centrales
        oscCtx.strokeStyle = '#1e462f';
        oscCtx.lineWidth = 1;
        const tickSize = 4;
        
        // Ticks en eje central horizontal
        for (let c = 0; c <= gridCols * 5; c++) {
            let x = startX + (c / (gridCols * 5)) * plotWidth;
            oscCtx.beginPath();
            oscCtx.moveTo(x, midY - tickSize);
            oscCtx.lineTo(x, midY + tickSize);
            oscCtx.stroke();
        }
        
        // Ticks en eje central vertical
        for (let r = 0; r <= gridRows * 5; r++) {
            let y = startY + (r / (gridRows * 5)) * plotHeight;
            oscCtx.beginPath();
            oscCtx.moveTo(midX - tickSize, y);
            oscCtx.lineTo(midX + tickSize, y);
            oscCtx.stroke();
        }
        
        // ANÁLISIS DEL TRIGGER (Disparo)
        // Ventana total de tiempo visible = 10 divisiones * timebase
        const timeWindow = (gridCols * timebaseMs) / 1000.0; // en segundos
        
        // Buscar un evento de Trigger (flanco de subida en canal de voltaje)
        // El trigger se ubica en el centro de la pantalla (tiempo = 0 en el centro) o a la izquierda.
        // Vamos a ubicar el trigger en el primer tercio de la pantalla (x = startX + 10% del ancho) para ver mejor la fase de subida.
        let triggerIndex = -1;
        const halfWindow = timeWindow * 0.1; // ventana de pre-trigger
        
        // Buscamos un flanco ascendente de voltaje en el buffer
        // Empezamos buscando hacia atrás desde el dato más nuevo
        const searchRange = Math.min(ringBufferSize - 2, 6000);
        for (let i = 50; i < searchRange; i++) {
            let idx = (ringBufferPtr - 1 - i + ringBufferSize) % ringBufferSize;
            let idxPrev = (idx - 1 + ringBufferSize) % ringBufferSize;
            
            // Flanco ascendente: pasa de menos del 10% del voltaje al canal Vin
            if (vHistory[idx] > (voltage * 0.8) && vHistory[idxPrev] < (voltage * 0.2)) {
                triggerIndex = idx;
                break; // Encontrado el más reciente
            }
        }
        
        // Si no se encuentra flanco (por ejemplo, Duty = 0% o 100%), tomamos una referencia fija de tiempo
        let startSimTime = 0.0;
        if (triggerIndex !== -1) {
            startSimTime = timeHistory[triggerIndex] - halfWindow;
        } else {
            // Fallback: mostrar los datos más recientes
            let latestIdx = (ringBufferPtr - 1 + ringBufferSize) % ringBufferSize;
            startSimTime = timeHistory[latestIdx] - timeWindow;
        }
        
        // OBTENER PUNTOS A TRAZAR
        const ptsCount = plotWidth;
        const vPlot = new Float32Array(ptsCount);
        const iPlot = new Float32Array(ptsCount);
        
        // Escaneo lineal eficiente sin copiar arrays.
        // Recorremos el ring buffer en orden cronológico (desde ringBufferPtr hacia adelante).
        // Como los tiempos objetivo (tTarget) son monótonamente crecientes y el buffer
        // linealizado también lo es, avanzamos un solo puntero sin retroceder: O(ptsCount + bufferSize).
        let bufCursor = 0; // posición dentro del recorrido linealizado
        
        for (let col = 0; col < ptsCount; col++) {
            const tTarget = startSimTime + (col / ptsCount) * timeWindow;
            
            // Avanzar el cursor mientras el siguiente punto esté más cerca del objetivo
            while (bufCursor < ringBufferSize - 1) {
                const curIdx = (ringBufferPtr + bufCursor) % ringBufferSize;
                const nextIdx = (ringBufferPtr + bufCursor + 1) % ringBufferSize;
                
                if (Math.abs(timeHistory[nextIdx] - tTarget) < Math.abs(timeHistory[curIdx] - tTarget)) {
                    bufCursor++;
                } else {
                    break;
                }
            }
            
            const bestIdx = (ringBufferPtr + bufCursor) % ringBufferSize;
            vPlot[col] = vHistory[bestIdx];
            iPlot[col] = iHistory[bestIdx];
        }
        
        // CONFIGURACIÓN DE GLOW Y EFECTOS DE FÓSFORO CRT
        oscCtx.save();
        oscCtx.shadowBlur = 6;
        
        // Trazado Canal 1: Voltaje (Fósforo Naranja)
        oscCtx.shadowColor = '#ff6d00';
        oscCtx.strokeStyle = '#ff6d00';
        oscCtx.lineWidth = 2.5;
        oscCtx.beginPath();
        for (let col = 0; col < ptsCount; col++) {
            let valV = vPlot[col];
            // Conversión: midY es el cero del canal, desplazado por ch1OffsetY.
            // 1 división vertical = (plotHeight / gridRows) píxeles.
            let pixelsPerVolt = (plotHeight / gridRows) / ch1Scale;
            let x = startX + col;
            let y = midY - ch1OffsetY - (valV * pixelsPerVolt);
            
            // Limitar dentro del marco del osciloscopio
            y = Math.max(startY, Math.min(endY, y));
            
            if (col === 0) oscCtx.moveTo(x, y);
            else oscCtx.lineTo(x, y);
        }
        oscCtx.stroke();
        
        // Trazado Canal 2: Corriente (Fósforo Celeste/Cian)
        oscCtx.shadowColor = '#00e5ff';
        oscCtx.strokeStyle = '#00e5ff';
        oscCtx.lineWidth = 2.5;
        oscCtx.beginPath();
        for (let col = 0; col < ptsCount; col++) {
            let valI = iPlot[col];
            let pixelsPerAmp = (plotHeight / gridRows) / ch2Scale;
            let x = startX + col;
            let y = midY - ch2OffsetY - (valI * pixelsPerAmp);
            
            y = Math.max(startY, Math.min(endY, y));
            
            if (col === 0) oscCtx.moveTo(x, y);
            else oscCtx.lineTo(x, y);
        }
        oscCtx.stroke();
        
        oscCtx.restore(); // Desactivar shadowBlur para el texto y rejilla
        
        // Línea del promedio de voltaje canal 1
        const vavg = duty * voltage;
        let pPerVolt = (plotHeight / gridRows) / ch1Scale;
        let yAvg = midY - ch1OffsetY - (vavg * pPerVolt);
        yAvg = Math.max(startY, Math.min(endY, yAvg));
        
        oscCtx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
        oscCtx.lineWidth = 1;
        oscCtx.setLineDash([4, 4]);
        oscCtx.beginPath();
        oscCtx.moveTo(startX, yAvg);
        oscCtx.lineTo(endX, yAvg);
        oscCtx.stroke();
        oscCtx.setLineDash([]);
        
        // LEYENDAS Y ESTADÍSTICAS EN PANTALLA (Estilo interfaz Tektronix/DSO)
        oscCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        oscCtx.font = '11px monospace';
        
        // Panel superior
        oscCtx.fillText(`CH1: ${ch1Scale}V/div`, startX + 15, h - 12);
        oscCtx.fillStyle = '#00e5ff';
        oscCtx.fillText(`CH2: ${ch2Scale}A/div`, startX + 150, h - 12);
        oscCtx.fillStyle = '#ff6d00';
        oscCtx.fillText(`M: ${timebaseMs.toFixed(1)}ms`, startX + 280, h - 12);
        
        oscCtx.fillStyle = '#4caf50';
        oscCtx.fillText(`Vavg: ${vavg.toFixed(2)}V`, endX - 180, h - 12);
        
        // Estado de Disparo (Trigger)
        oscCtx.fillStyle = triggerIndex !== -1 ? '#00e676' : '#ff5252';
        oscCtx.fillText(triggerIndex !== -1 ? 'TRIG\'D' : 'AUTO', endX - 70, h - 12);
    }
    
    // Dibujo del LED
    function drawLED(instantVoltage) {
        const width = ledCanvas.width;
        const height = ledCanvas.height;
        
        ledCtx.clearRect(0, 0, width, height);
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        let brightness = 0.0;
        if (frequency >= 60) {
            brightness = duty;
        } else {
            brightness = instantVoltage > 0 ? 1.0 : 0.05;
        }
        
        if (brightness > 0.1) {
            let glowGrad = ledCtx.createRadialGradient(centerX, centerY - 10, 5, centerX, centerY - 10, 60);
            glowGrad.addColorStop(0, `rgba(255, 109, 0, ${brightness * 0.8})`);
            glowGrad.addColorStop(1, 'rgba(255, 109, 0, 0)');
            ledCtx.fillStyle = glowGrad;
            ledCtx.beginPath();
            ledCtx.arc(centerX, centerY - 10, 60, 0, Math.PI * 2);
            ledCtx.fill();
        }
        
        ledCtx.fillStyle = '#3c4858';
        ledCtx.beginPath();
        ledCtx.moveTo(centerX - 25, centerY + 30);
        ledCtx.lineTo(centerX + 25, centerY + 30);
        ledCtx.lineTo(centerX + 15, centerY + 45);
        ledCtx.lineTo(centerX - 15, centerY + 45);
        ledCtx.closePath();
        ledCtx.fill();
        
        ledCtx.strokeStyle = '#8b949e';
        ledCtx.lineWidth = 3;
        ledCtx.beginPath();
        ledCtx.moveTo(centerX - 10, centerY + 40);
        ledCtx.lineTo(centerX - 10, centerY + 80);
        ledCtx.stroke();
        
        ledCtx.beginPath();
        ledCtx.moveTo(centerX + 10, centerY + 40);
        ledCtx.lineTo(centerX + 10, centerY + 70);
        ledCtx.stroke();
        
        let ledColorGrad = ledCtx.createLinearGradient(centerX - 20, 0, centerX + 20, 0);
        if (brightness > 0.1) {
            ledColorGrad.addColorStop(0, '#ff9100');
            ledColorGrad.addColorStop(0.3, '#ffab40');
            ledColorGrad.addColorStop(1, '#ff6d00');
        } else {
            ledColorGrad.addColorStop(0, '#5d2600');
            ledColorGrad.addColorStop(1, '#3b1800');
        }
        
        ledCtx.fillStyle = ledColorGrad;
        ledCtx.beginPath();
        ledCtx.arc(centerX, centerY - 10, 22, Math.PI, 0, false);
        ledCtx.lineTo(centerX + 22, centerY + 28);
        ledCtx.lineTo(centerX - 22, centerY + 28);
        ledCtx.closePath();
        ledCtx.fill();
        
        ledCtx.beginPath();
        ledCtx.arc(centerX, centerY + 28, 22, 0, Math.PI, false);
        ledCtx.fill();
        
        ledCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ledCtx.beginPath();
        ledCtx.ellipse(centerX - 10, centerY - 15, 5, 10, Math.PI / 4, 0, Math.PI * 2);
        ledCtx.fill();
    }
    
    // Dibujo del Motor DC
    function drawMotor() {
        const width = motorCanvas.width;
        const height = motorCanvas.height;
        
        motorCtx.clearRect(0, 0, width, height);
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        motorCtx.strokeStyle = '#475569';
        motorCtx.lineWidth = 10;
        motorCtx.beginPath();
        motorCtx.arc(centerX, centerY, 55, 0, Math.PI * 2);
        motorCtx.stroke();
        
        motorCtx.fillStyle = '#ef4444';
        motorCtx.beginPath();
        motorCtx.arc(centerX, centerY, 50, -Math.PI/4 - Math.PI/2, Math.PI/4 - Math.PI/2);
        motorCtx.lineTo(centerX, centerY);
        motorCtx.closePath();
        motorCtx.fill();
        
        motorCtx.fillStyle = '#3b82f6';
        motorCtx.beginPath();
        motorCtx.arc(centerX, centerY, 50, -Math.PI/4 + Math.PI/2, Math.PI/4 + Math.PI/2);
        motorCtx.lineTo(centerX, centerY);
        motorCtx.closePath();
        motorCtx.fill();
        
        motorCtx.fillStyle = '#1e293b';
        motorCtx.beginPath();
        motorCtx.arc(centerX, centerY, 42, 0, Math.PI * 2);
        motorCtx.fill();
        
        motorCtx.save();
        motorCtx.translate(centerX, centerY);
        motorCtx.rotate(motorAngle);
        
        const numPoles = 3;
        for (let i = 0; i < numPoles; i++) {
            motorCtx.save();
            motorCtx.rotate((i * Math.PI * 2) / numPoles);
            
            motorCtx.fillStyle = '#b45309';
            motorCtx.strokeStyle = '#d97706';
            motorCtx.lineWidth = 2;
            motorCtx.fillRect(-10, -38, 20, 16);
            motorCtx.strokeRect(-10, -38, 20, 16);
            
            motorCtx.fillStyle = '#64748b';
            motorCtx.fillRect(-7, -42, 14, 4);
            
            motorCtx.fillStyle = '#e2e8f0';
            motorCtx.beginPath();
            motorCtx.arc(0, 0, 8, 0, Math.PI * 2);
            motorCtx.fill();
            
            motorCtx.strokeStyle = '#ffffff';
            motorCtx.lineWidth = 3;
            motorCtx.beginPath();
            motorCtx.moveTo(0, 0);
            motorCtx.lineTo(0, -32);
            motorCtx.stroke();
            
            motorCtx.restore();
        }
        
        motorCtx.restore();
        
        motorCtx.fillStyle = '#f59e0b';
        motorCtx.beginPath();
        motorCtx.arc(centerX, centerY, 12, 0, Math.PI * 2);
        motorCtx.fill();
        
        motorCtx.fillStyle = '#000000';
        motorCtx.fillRect(centerX - 22, centerY - 3, 10, 6);
        motorCtx.fillRect(centerX + 12, centerY - 3, 10, 6);
        
        const rpm = (motorSpeed * (60.0 / (Math.PI * 2))).toFixed(0);
        motorCtx.fillStyle = '#ffffff';
        motorCtx.font = 'bold 13px Inter';
        motorCtx.textAlign = 'center';
        motorCtx.fillText(`${rpm} RPM`, centerX, centerY + 80);
    }
    
    updateFórmulas();
    requestAnimationFrame(loop);
});
