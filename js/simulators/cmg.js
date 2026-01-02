document.addEventListener('DOMContentLoaded', function() {
    // State
    const state = {
        freq: 60,
        speed: 10,  // Animation speed multiplier
        reverse: false,
        showVectors: true,
        poles: 4,       // Number of poles
        slip: 3,        // Slip percentage
        Ns: 1800,       // Synchronous speed (calculated)
        Nr: 1746        // Rotor speed (calculated)
    };

    // Elements
    const freqSlider = document.getElementById('param_freq');
    const speedSlider = document.getElementById('param_speed');
    const reverseCheck = document.getElementById('param_reverse');
    const vectorsCheck = document.getElementById('param_vectors');
    const polesSelect = document.getElementById('param_poles');
    const slipSlider = document.getElementById('param_slip');
    
    const valFreq = document.getElementById('val-freq');
    const valSpeed = document.getElementById('val-speed');
    const valSlip = document.getElementById('val-slip');
    const seqLabel = document.getElementById('seq-label');
    const speedSync = document.getElementById('speed-sync');
    const speedRotor = document.getElementById('speed-rotor');
    const speedDiff = document.getElementById('speed-diff');

    // Chart Setup (Waveforms)
    const ctxChart = document.getElementById('waveformChart').getContext('2d');
    
    // Pre-calculate sine data for 2 cycles
    function generateSineData(phaseOffset) {
        const points = [];
        for (let i = 0; i <= 360 * 2; i += 5) {
            points.push({
                x: i,
                y: Math.cos((i - phaseOffset) * Math.PI / 180)
            });
        }
        return points;
    }

    const dataA = generateSineData(0);
    const dataB = generateSineData(120);
    const dataC = generateSineData(240);

    const waveformChart = new Chart(ctxChart, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Fase A',
                    data: dataA,
                    borderColor: '#FF5252',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Fase B',
                    data: dataB,
                    borderColor: '#448aff',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Fase C',
                    data: dataC,
                    borderColor: '#00E676',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            interaction: { intersect: false, mode: 'index' },
            scales: {
                x: {
                    type: 'linear',
                    display: false, // Hide X axis numbers for clean look
                    min: 0,
                    max: 720
                },
                y: {
                    display: false,
                    min: -1.5,
                    max: 1.5
                }
            },
            plugins: {
                legend: { display: false },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            xMin: 0,
                            xMax: 0,
                            borderColor: 'white',
                            borderWidth: 2,
                            borderDash: [5, 5]
                        }
                    }
                }
            }
        }
    });

    // Import annotation plugin? Standard Chart.js might not have it loaded.
    // We'll manually draw the vertical line if needed, or update options. 
    // Actually, let's just use a vertical bar dataset or simple update mechanism.
    // Simpler: Just update a plugin-less vertical line drawing in afterDraw hook?
    // Let's stick to update logic: We will shift the data? No, shifting data is expensive.
    // Better: Update xMin/xMax of an annotation if available, or just use a custom plugin.
    
    // Custom Plugin for Current Time Marker
    const verticalLinePlugin = {
        id: 'verticalLine',
        afterDraw: (chart) => {
            if (!chart.scales.x) return;
            const ctx = chart.ctx;
            const xVal = state.currentTimeAngle % 720;
            const xPix = chart.scales.x.getPixelForValue(xVal);
            const top = chart.chartArea.top;
            const bottom = chart.chartArea.bottom;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(xPix, top);
            ctx.lineTo(xPix, bottom);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.restore();
        }
    };
    Chart.register(verticalLinePlugin);

    // Calculate Speeds Function (Venezuelan format)
    const fmtVE = (n, d=0) => n.toLocaleString('es-VE', { minimumFractionDigits: d, maximumFractionDigits: d });
    
    function calculateSpeeds() {
        // Synchronous speed: Ns = 120 * f / P
        state.Ns = (120 * state.freq) / state.poles;
        
        // Rotor speed: Nr = Ns * (1 - s/100)
        state.Nr = state.Ns * (1 - state.slip / 100);
        
        // Update UI
        speedSync.textContent = fmtVE(state.Ns) + ' RPM';
        speedRotor.textContent = fmtVE(state.Nr) + ' RPM';
        speedDiff.textContent = fmtVE(state.Ns - state.Nr) + ' RPM';
    }


    // Vector Animation (Canvas)
    const canvas = document.getElementById('motorCanvas');
    const ctx = canvas.getContext('2d');
    let animationId;
    let lastTime = 0;
    state.currentTimeAngle = 0; // Degrees 0-720

    function drawArrow(ctx, fromX, fromY, toX, toY, color, width = 3) {
        const headlen = 10; 
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        // Arrowhead
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
    }

    function drawCoil(ctx, angle, color, label) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const radius = 140;
        
        const x = cx + radius * Math.cos(angle * Math.PI / 180);
        const y = cy + radius * Math.sin(angle * Math.PI / 180);

        // Draw Coil circle
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, 2 * Math.PI);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();
        
        ctx.fillStyle = color;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
    }

    function animate(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const delta = timestamp - lastTime;
        lastTime = timestamp;

        // Update Time Angle
        // Speed factor: 
        // Real freq is too fast for vis. We use 'speed' param as visual Hz.
        // degrees per second = 360 * (speed / 100 * 2) roughly
        const speedFactor = state.speed / 20; 
        // Direction
        const dir = state.reverse ? -1 : 1;
        
        state.currentTimeAngle += (delta * 0.1 * speedFactor * state.freq * 0.1); 
        // Need to calibrate visual speed
        // Let's simply: increment = delta * speed slider
        
        const inc = (delta / 16) * (state.speed * 0.5); // base speed
        state.currentTimeAngle += inc;

        // Keep strictly increasing for chart x-axis scrolling?
        // Actually for chart we wrap at 720.
        // For physics calculation, we use angle
        
        const theta = state.currentTimeAngle * (Math.PI / 180); // Current electrical time-angle

        // Clear Canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Draw Stator Ring
        ctx.beginPath();
        ctx.arc(cx, cy, 160, 0, 2 * Math.PI);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 10;
        ctx.stroke();

        // Calculate Phase Currents (Instantaneous)
        // rev means switch B and C phase currents time-lag?
        // Standard Sequence: A(0), B(-120), C(-240)
        // Reverse Sequence: A(0), C(-120), B(-240) -> Effectively A(0), B(+120), C(+240) or similar.
        // Let's toggle B and C logic based on Reverse.
        
        let phaseA, phaseB, phaseC;
        if (!state.reverse) {
            // ABC
            phaseA = Math.cos(theta);
            phaseB = Math.cos(theta - 2*Math.PI/3);
            phaseC = Math.cos(theta - 4*Math.PI/3);
        } else {
            // CBA (ACB)
            phaseA = Math.cos(theta);
            phaseB = Math.cos(theta + 2*Math.PI/3); // B leads A
            phaseC = Math.cos(theta + 4*Math.PI/3);
        }

        // Draw Coils (Fixed positions)
        // A at Top (90 deg -> -Math.PI/2 in canvas y-down? No, standard math cos/sin)
        // Let's map 0 degrees to Right.
        // Coil A Axis: 90 deg (Top).
        // Coil B Axis: 330 deg (-30).
        // Coil C Axis: 210 deg.
        
        const angA = -90 * (Math.PI/180);
        const angB = 30 * (Math.PI/180);
        const angC = 150 * (Math.PI/180); 
        // Standard motor placement is often 120 apart. 
        // Top, Bottom Right, Bottom Left.
        
        drawCoil(ctx, -90, '#FF5252', 'A');
        drawCoil(ctx, 30, '#448aff', 'B');
        drawCoil(ctx, 150, '#00E676', 'C');

        // Draw Individual Phase Vectors (Example: A pulses up/down)
        if (state.showVectors) {
            const scale = 100;
            // Vector A
            drawArrow(ctx, cx, cy, cx + Math.cos(angA)*phaseA*scale, cy + Math.sin(angA)*phaseA*scale, 'rgba(255, 82, 82, 0.5)', 2);
            // Vector B
            drawArrow(ctx, cx, cy, cx + Math.cos(angB)*phaseB*scale, cy + Math.sin(angB)*phaseB*scale, 'rgba(68, 138, 255, 0.5)', 2);
            // Vector C
            drawArrow(ctx, cx, cy, cx + Math.cos(angC)*phaseC*scale, cy + Math.sin(angC)*phaseC*scale, 'rgba(0, 230, 118, 0.5)', 2);
        }

        // Calculate Resultant Vector
        // Sum of vectors: V_total = Va + Vb + Vc
        // Va = (phaseA * cos(angA), phaseA * sin(angA))
        // ...
        
        const Rx = phaseA*Math.cos(angA) + phaseB*Math.cos(angB) + phaseC*Math.cos(angC);
        const Ry = phaseA*Math.sin(angA) + phaseB*Math.sin(angB) + phaseC*Math.sin(angC);
        
        const ResultantScale = 100; // Expected magnitude is 1.5 * scale

        // Draw Resultant (Magnetic Field)
        drawArrow(ctx, cx, cy, cx + Rx*ResultantScale, cy + Ry*ResultantScale, '#ffffff', 5);

        // ROTOR VISUALIZATION
        // Rotor rotates at Nr speed (slower than field at Ns)
        // Calculate rotor angle based on its speed relative to field
        const direction = state.reverse ? -1 : 1;
        const rotorAngleRad = direction * (state.currentTimeAngle * (state.Nr / state.Ns)) * (Math.PI / 180);
        
        // Draw rotor body (inner circle)
        ctx.beginPath();
        ctx.arc(cx, cy, 80, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw rotor marker (radial line to show rotation)
        const markRadius = 70;
        const markX = cx + markRadius * Math.cos(rotorAngleRad);
        const markY = cy + markRadius * Math.sin(rotorAngleRad);
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(markX, markY);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // Draw marker dot
        ctx.beginPath();
        ctx.arc(markX, markY, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#f97316';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Update Chart vertical bar
        waveformChart.update('none'); // Efficient update just for plugin?
        waveformChart.draw(); // Trigger draw to render plugin line

        animationId = requestAnimationFrame(animate);
    }


    // Listeners
    freqSlider.addEventListener('input', (e) => {
        valFreq.textContent = e.target.value;
        state.freq = parseInt(e.target.value);
        calculateSpeeds();
    });

    speedSlider.addEventListener('input', (e) => {
        valSpeed.textContent = e.target.value + '%';
        state.speed = parseInt(e.target.value);
    });

    reverseCheck.addEventListener('change', (e) => {
        state.reverse = e.target.checked;
        seqLabel.textContent = state.reverse ? 'Secuencia ACB (Inversa)' : 'Secuencia ABC';
        
        // Update Chart Colors or Data order? 
        // For chart, let's keep A,B,C lines fixed color. 
        // Mathematically, if we switch sequence, we swap B and C curves.
        if (state.reverse) {
            waveformChart.data.datasets[1].label = 'Fase C'; // Swap labels/colors technically
            waveformChart.data.datasets[2].label = 'Fase B';
            // Actually simpler to swap data reference
            waveformChart.data.datasets[1].data = dataC; // B takes C's phase
            waveformChart.data.datasets[2].data = dataB; // C takes B's phase
        } else {
            waveformChart.data.datasets[1].data = dataB;
            waveformChart.data.datasets[2].data = dataC;
        }
        waveformChart.update();
    });

    vectorsCheck.addEventListener('change', (e) => {
        state.showVectors = e.target.checked;
    });

    polesSelect.addEventListener('change', (e) => {
        state.poles = parseInt(e.target.value);
        calculateSpeeds();
    });

    slipSlider.addEventListener('input', (e) => {
        state.slip = parseFloat(e.target.value);
        valSlip.textContent = fmtVE(state.slip, 1) + '%';
        calculateSpeeds();
    });

    // Initial calculations
    calculateSpeeds();
    
    // Start animation
    animate(0);
});
