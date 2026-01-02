/**
 * PID Simulator Logic
 * Simulates a second-order system (Spring-Mass-Damper) controlled by a PID controller.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Canvas Context
    const ctx = document.getElementById('pidChart').getContext('2d');

    // Initial Parameters
    let state = {
        kp: 1.0,
        ki: 0.1,
        kd: 0.5,
        setpoint: 50,
        processVar: 0,
        velocity: 0,
        integral: 0,
        lastError: 0,
        lastTime: Date.now()
    };

    // System Physics Parameters (Second Order System)
    const physics = {
        mass: 1.0,         // Inertia
        damping: 0.5,      // Natural damping of the system
        spring: 0.0        // Natural spring force (0 = free floating)
    };

    // Timing and Performance Metrics
    let lastUpdateTime = 0;
    const updateInterval = 100; // Update chart every 100ms (10 Hz)
    let currentSimTime = 0;
    let simSpeed = 1.0;
    
    // Performance metrics
    let maxValue = 0;
    let settlingTime = null;
    let settledCounter = 0;
    const settlingThreshold = 0.02; // ±2% band

    // Chart Setup
    const dataPoints = 500; // Extended to show ~50 seconds of history
    const labels = [];
    
    // Generate time labels (show every 2 seconds)
    for (let i = 0; i < dataPoints; i++) {
        const segundos = i * (updateInterval / 1000);
        labels.push(i % 20 === 0 ? `${segundos.toFixed(0)}s` : '');
    }
    
    const spData = Array(dataPoints).fill(state.setpoint);
    const pvData = Array(dataPoints).fill(0);

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Setpoint (Referencia)',
                    data: spData,
                    borderColor: '#00e676', // Green
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0
                },
                {
                    label: 'Proceso (PV)',
                    data: pvData,
                    borderColor: '#ff9800', // Orange
                    borderWidth: 3,
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    fill: true,
                    pointRadius: 0,
                    tension: 0.4 // Smooth curve
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#b0bec5',
                        font: { size: 11 }
                    },
                    title: {
                        display: true,
                        text: 'Amplitud / Valor',
                        color: '#90a4ae',
                        font: { size: 12, weight: 'bold' }
                    }
                },
                x: {
                    display: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        display: false // Still hide specific time ticks to avoid clutter
                    },
                    title: {
                        display: true,
                        text: 'Tiempo (t) →',
                        color: '#90a4ae',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#ffffff',
                        font: { size: 12, weight: '500' },
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            }
        }
    });

    // Inputs
    const kpInput = document.getElementById('kp');
    const kiInput = document.getElementById('ki');
    const kdInput = document.getElementById('kd');
    const spInput = document.getElementById('sp');
    const resetBtn = document.getElementById('reset-sim');

    // Value Displays
    const valKp = document.getElementById('val-kp');
    const valKi = document.getElementById('val-ki');
    const valKd = document.getElementById('val-kd');
    const valSp = document.getElementById('val-sp');
    
    // Metric Displays
    const metricError = document.getElementById('metric-error');
    const metricOutput = document.getElementById('metric-output');

    // Update State from Inputs (Venezuelan format)
    const fmtVE = (n, d=2) => n.toLocaleString('es-VE', { minimumFractionDigits: d, maximumFractionDigits: d });
    
    function updateParams() {
        state.kp = parseFloat(kpInput.value);
        state.ki = parseFloat(kiInput.value);
        state.kd = parseFloat(kdInput.value);
        state.setpoint = parseFloat(spInput.value);

        valKp.textContent = fmtVE(state.kp);
        valKi.textContent = fmtVE(state.ki);
        valKd.textContent = fmtVE(state.kd);
        valSp.textContent = fmtVE(state.setpoint, 0);
    }

    // Event Listeners
    kpInput.addEventListener('input', updateParams);
    kiInput.addEventListener('input', updateParams);
    kdInput.addEventListener('input', updateParams);
    spInput.addEventListener('input', updateParams);

    resetBtn.addEventListener('click', () => {
        state.processVar = 0;
        state.velocity = 0;
        state.integral = 0;
        state.lastError = 0;
        
        // Reset performance metrics
        maxValue = 0;
        settlingTime = null;
        settledCounter = 0;
        currentSimTime = 0;
        lastUpdateTime = 0;
        
        // Reset chart data
        for(let i=0; i<dataPoints; i++) {
            pvData[i] = 0;
            spData[i] = state.setpoint;
        }
        chart.update();
    });

    // Simulation Loop
    function simulate() {
        const now = Date.now();
        const dt = (now - state.lastTime) / 1000; // Delta time in seconds
        state.lastTime = now;

        if (dt > 0.1) { // Prevent huge jumps if tab was inactive
            requestAnimationFrame(simulate);
            return; 
        }

        // 1. Calculate Error
        const error = state.setpoint - state.processVar;

        // 2. Integral Term
        state.integral += error * dt;
        
        // Anti-windup (limit integral contribution)
        const integLimit = 100;
        if(state.integral > integLimit) state.integral = integLimit;
        if(state.integral < -integLimit) state.integral = -integLimit;

        // 3. Derivative Term
        const derivative = (error - state.lastError) / dt;
        state.lastError = error;

        // 4. PID Output
        let output = (state.kp * error) + (state.ki * state.integral) + (state.kd * derivative);

        // Saturation limits (Output usually 0-100% or similar force limits)
        if(output > 200) output = 200;
        if(output < -200) output = -200;

        // 5. Apply Output to Physical System (F = ma => a = F/m)
        // Force = PID Output - Damping * Velocity - Spring * Position
        const force = output - (physics.damping * state.velocity) - (physics.spring * state.processVar);
        const acceleration = force / physics.mass;

        // 6. Update Physics State
        state.velocity += acceleration * dt;
        state.processVar += state.velocity * dt;

        // Hard limits on process variable to keep graph readable
        if(state.processVar > 150) { state.processVar = 150; state.velocity = 0; }
        if(state.processVar < -50) { state.processVar = -50; state.velocity = 0; }

        // 7. Calculate Performance Metrics
        // Track maximum value for overshoot calculation
        if (state.processVar > maxValue) {
            maxValue = state.processVar;
        }
        
        // Check if system is within settling band (±2%)
        const settlingBand = state.setpoint * settlingThreshold;
        const absError = Math.abs(error);
        
        if (absError <= settlingBand) {
            settledCounter++;
            // Consider settled after staying in band for 2 seconds (20 × 0.1s)
            if (settledCounter >= 20 && settlingTime === null) {
                settlingTime = fmtVE(currentSimTime, 1);
            }
        } else {
            settledCounter = 0;
        }

        // 8. Update Chart Data (only every updateInterval ms for readability)
        if (now - lastUpdateTime >= updateInterval) {
            lastUpdateTime = now;
            currentSimTime += updateInterval / 1000;
            
            spData.shift();
            spData.push(state.setpoint);
            
            pvData.shift();
            pvData.push(state.processVar);

            chart.update('none'); // Update without animation for performance
            
            // Update performance metrics UI if elements exist
            updateMetricsUI(error, output);
        }

        requestAnimationFrame(simulate);
    }
    
    // Update metrics display
    function updateMetricsUI(error, output) {
        // Update existing metrics (Venezuelan format)
        metricError.textContent = fmtVE(error);
        metricOutput.textContent = fmtVE(output);
        
        // Update performance metrics if elements exist
        const metricOvershoot = document.getElementById('metric-overshoot');
        const metricSettling = document.getElementById('metric-settling');
        const metricSSE = document.getElementById('metric-sse');
        
        if (metricOvershoot) {
            const overshoot = ((maxValue - state.setpoint) / state.setpoint) * 100;
            metricOvershoot.textContent = overshoot > 0 ? `+${fmtVE(overshoot, 1)}%` : '0,0%';
        }
        
        if (metricSettling) {
            metricSettling.textContent = settlingTime ? `${settlingTime}s` : 'Aún no';
        }
        
        if (metricSSE) {
            metricSSE.textContent = fmtVE(Math.abs(error));
        }
    }

    // Start Simulation
    updateParams();
    requestAnimationFrame(simulate);
});
