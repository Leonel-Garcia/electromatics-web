document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('transformerCanvas');
    const ctx = canvas.getContext('2d');
    
    // Config State
    const state = {
        primaryConn: 'delta',
        secondaryConn: 'star-parallel',
        showWiring: true
    };

    // Elements
    const selSec = document.getElementById('conn-secondary');
    const chkWiring = document.getElementById('show-wiring');
    const dispVLL = document.getElementById('val-vll');
    const dispVLN = document.getElementById('val-vln');

    // Colors
    const colA = '#FF5252';
    const colB = '#448aff';
    const colC = '#00E676';
    const colN = '#e2e8f0';
    const colH = '#f59e0b'; // HV Bushing
    const colX = '#94a3b8'; // LV Bushing

    // Geometry
    let w, h;
    let trafos = [];

    function resize() {
        // Make high res
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height; // Fixed height in CSS mostly
        w = canvas.width;
        h = canvas.height;
        initTrafos();
        draw();
    }
    window.addEventListener('resize', resize);

    function initTrafos() {
        trafos = [];
        const gap = w * 0.05;
        const tWidth = (w - gap*4) / 3;
        const tHeight = h * 0.4;
        const startY = h * 0.35;

        const labels = ['T1', 'T2', 'T3'];

        for(let i=0; i<3; i++) {
            const x = gap + i*(tWidth + gap);
            const y = startY;
            
            // Layout: X1, X3, X2, X4 spaced evenly at bottom to facilitate parallel/series jumpers
            // Order: X1 (0.15), X3 (0.38), X2 (0.62), X4 (0.85)
            trafos.push({
                x: x,
                y: y,
                w: tWidth,
                h: tHeight,
                label: labels[i],
                // Primary Top: H1 (Left), H2 (Right)
                h1: {x: x + tWidth*0.25, y: y + 15},
                h2: {x: x + tWidth*0.75, y: y + 15},
                
                // Secondary Bottom: X1, X3, X2, X4
                x1: {x: x + tWidth*0.15, y: y + tHeight - 15},
                x3: {x: x + tWidth*0.38, y: y + tHeight - 15}, // Swapped position with X2
                x2: {x: x + tWidth*0.62, y: y + tHeight - 15}, // Swapped position with X3
                x4: {x: x + tWidth*0.85, y: y + tHeight - 15}
            });
        }
    }

    function drawLine(p1, p2, color, dashed=false) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        if(dashed) ctx.setLineDash([5,5]);
        else ctx.setLineDash([]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Advanced wiring: Draw orthogonal paths
    function drawWire(p1, p2, color, offset=0) {
        if(!state.showWiring) return;
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        
        // Simple 3-segment path logic
        // If connecting top terminals (Primary), go up
        // If connecting bottom (Secondary), go down
        
        const isPri = p1.y < h/2;
        const midY = isPri ? p1.y - 30 - offset : p1.y + 30 + offset;
        
        ctx.lineTo(p1.x, midY);
        ctx.lineTo(p2.x, midY);
        ctx.lineTo(p2.x, p2.y);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        // Dot at connection
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 4, 0, Math.PI*2);
        ctx.arc(p2.x, p2.y, 4, 0, Math.PI*2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawTrafo(t) {
        // Body
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(t.x, t.y, t.w, t.h);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.font = 'bold 32px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.label, t.x + t.w/2, t.y + t.h/2);

        // Terminals
        const bushings = [
            {p: t.h1, l: 'H1', c: colH}, {p: t.h2, l: 'H2', c: colH},
            {p: t.x1, l: 'X1', c: colX}, {p: t.x3, l: 'X3', c: colX},
            {p: t.x2, l: 'X2', c: colX}, {p: t.x4, l: 'X4', c: colX}
        ];

        bushings.forEach(b => {
             // Bushing Body
             ctx.fillStyle = '#1e293b';
             ctx.beginPath();
             ctx.arc(b.p.x, b.p.y, 8, 0, Math.PI*2);
             ctx.fill();
             ctx.lineWidth = 2;
             ctx.strokeStyle = b.c;
             ctx.stroke();

             // Label
             ctx.fillStyle = '#fff';
             ctx.font = '10px Inter';
             ctx.textAlign = 'center';
             ctx.fillText(b.l, b.p.x, b.p.y < t.y+t.h/2 ? b.p.y + 20 : b.p.y - 15);
        });
    }

    function drawSystem() {
        if(!state.showWiring) return;
        drawBusbarsAndExternal();
        drawInternalConnections();
    }

    function drawBusbarsAndExternal() {
        // Busbars positions
        const busY = 40;
        const busGap = 15;
        const loadY = h - 40;

        const srcA = {x: 0, y: busY, c: colA}; // Line A
        const srcB = {x: 0, y: busY+busGap, c: colB}; // Line B
        const srcC = {x: 0, y: busY+busGap*2, c: colC}; // Line C

        // Draw Busbars
        drawLine({x:0, y:srcA.y}, {x:w, y:srcA.y}, colA);
        drawLine({x:0, y:srcB.y}, {x:w, y:srcB.y}, colB);
        drawLine({x:0, y:srcC.y}, {x:w, y:srcC.y}, colC);
        
        ctx.font = '12px Inter';
        ctx.fillStyle = colA; ctx.fillText('A (HV)', 10, srcA.y-5);
        ctx.fillStyle = colB; ctx.fillText('B', 10, srcB.y-5);
        ctx.fillStyle = colC; ctx.fillText('C', 10, srcC.y-5);

        // --- Primary Connections (Fixed Delta for now) ---
        // T1: H1->A, H2->B
        // T2: H1->B, H2->C
        // T3: H1->C, H2->A
        
        drawWire(trafos[0].h1, {x: trafos[0].h1.x, y: srcA.y}, colA, 5);
        drawWire(trafos[0].h2, {x: trafos[0].h2.x, y: srcB.y}, colB, 10);

        drawWire(trafos[1].h1, {x: trafos[1].h1.x, y: srcB.y}, colB, 15);
        drawWire(trafos[1].h2, {x: trafos[1].h2.x, y: srcC.y}, colC, 20);

        drawWire(trafos[2].h1, {x: trafos[2].h1.x, y: srcC.y}, colC, 25);
        drawWire(trafos[2].h2, {x: trafos[2].h2.x, y: srcA.y}, colA, 30);


        // --- Secondary Busbars (a, b, c, n) ---
        // Just defining Y positions for output lines
        const out_a = loadY - busGap*3;
        const out_b = loadY - busGap*2;
        const out_c = loadY - busGap;
        const out_n = loadY;

        drawLine({x:0, y:out_a}, {x:w, y:out_a}, colA);
        drawLine({x:0, y:out_b}, {x:w, y:out_b}, colB);
        drawLine({x:0, y:out_c}, {x:w, y:out_c}, colC);
        drawLine({x:0, y:out_n}, {x:w, y:out_n}, colN); // Neutral

        ctx.fillStyle = colA; ctx.fillText('a (LV)', 10, out_a-5);
        ctx.fillStyle = colB; ctx.fillText('b', 10, out_b-5);
        ctx.fillStyle = colC; ctx.fillText('c', 10, out_c-5);
        ctx.fillStyle = colN; ctx.fillText('n', 10, out_n-5);

        // --- Secondary External Connections ---
        
        const isStar = state.secondaryConn.includes('star');
        const isDelta = state.secondaryConn.includes('delta');
        const isOpenDelta = state.secondaryConn.startsWith('delta-open');

        // Identify 'Hot' and 'Return' terminal for each trafo based on internal jumping
        // Parallel: Hot = X1(linked to X3), Return = X2(linked to X4) (Polarity: X1,X3 are starts)
        // Series: Hot = X1, Mid = X2-X3, Return = X4 .
        
        trafos.forEach((t, i) => {
            if(isOpenDelta && i === 2) return; // Skip T3 wiring for Open Delta

            let hotPoint, returnPoint;

            if(state.secondaryConn.includes('parallel')) {
                // Parallel (120V): 
                // X1 tied to X3 (Starts). X2 tied to X4 (Ends).
                // Output taken from X1 (Hot) and X4 (Return/Neutral).
                hotPoint = t.x1; 
                returnPoint = t.x4; 
            } else {
                // Series (240V): 
                // X2 tied to X3 (Center Tap).
                // Output X1 (Hot 1) and X4 (Hot 2 or Return depending on Star/Delta).
                // For Star 3-phase (4-wire): X1 is Line, X4 is Neutral?
                // Or Center Tap is grounded?
                // Standard Star 4-wire (208/120V) uses Parallel coils.
                // Standard Star (480/277V) uses Series coils? 
                // If Series: X1->Line, X4->Neutral/Common Point.
                hotPoint = t.x1;
                returnPoint = t.x4;
            }

            // STAR CONNECTION
            if(isStar) {
                // Phase output to a/b/c
                const targetLineY = (i===0) ? out_a : (i===1) ? out_b : out_c;
                const targetColor = (i===0) ? colA : (i===1) ? colB : colC;
                
                drawWire(hotPoint, {x: hotPoint.x, y: targetLineY}, targetColor, 10 + i*5);

                // Neutral Point
                // In Star, all 'Return' points connect to Neutral Bus
                drawWire(returnPoint, {x: returnPoint.x, y: out_n}, colN, 40);
            }

            // DELTA CONNECTION
            if(isDelta) {
                // Delta closes the loop: End of T1 -> Start of T2
                // Return of T1 -> Hot of T2
                
                // Draw to lines
                const myLineY = (i===0) ? out_a : (i===1) ? out_b : out_c; // a, b, c
                const myColor = (i===0) ? colA : (i===1) ? colB : colC;

                // T_Hot goes to My Line
                drawWire(hotPoint, {x: hotPoint.x, y: myLineY}, myColor, 10 + i*5);

                // T_Return goes to Next Line
                // T1(X4) -> T2(X1) (aka Line b)
                
                const nextLineY = (i===0) ? out_b : (i===1) ? out_c : out_a;
                const nextColor = (i===0) ? colB : (i===1) ? colC : colA;
                
                if(isOpenDelta) {
                   if(i===0) {
                        // T1 Ret -> b
                        drawWire(returnPoint, {x: returnPoint.x, y: out_b}, colB, 30);
                   }
                   if(i===1) {
                        // T2 Ret -> c
                        drawWire(returnPoint, {x: returnPoint.x, y: out_c}, colC, 30);
                   }
                } else {
                   // Full Delta
                   drawWire(returnPoint, {x: returnPoint.x, y: nextLineY}, nextColor, 35);
                }
            }
        });
    }

    function drawInternalConnections() {
        trafos.forEach(t => {
            if(state.secondaryConn.includes('parallel')) {
                // Parallel: X1-X3 and X2-X4
                // Jumpers
                drawJumper(t.x1, t.x3, '#fff', -20);
                drawJumper(t.x2, t.x4, '#fff', -20);
            } else {
                // Series: X2-X3
                drawJumper(t.x2, t.x3, '#fff', -20);
            }
        });
    }

    function drawJumper(p1, p2, color, offset) {
        ctx.beginPath();
        const y = p1.y - offset; // actually offset is negative for up? No, p1.y is bottom. +offset goes down.
        // Let's go down.
        const midY = p1.y + Math.abs(offset);
        
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p1.x, midY);
        ctx.lineTo(p2.x, midY);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 3, 0, Math.PI*2);
        ctx.arc(p2.x, p2.y, 3, 0, Math.PI*2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function calculateValues() {
        // ... (Keep existing logic but update comments if needed)
        // Re-implementing for safety
        
        let v_phase_pri = 13800; 
        
        // Single Phase Output Voltage based on internal connection
        // Ratio 13800/120 = 115
        // Parallel (X1//X3): 120V
        // Series (X1-X2-X3-X4): 240V
        
        let v_sec_winding = 120;
        if(state.secondaryConn.includes('series') || state.secondaryConn === 'delta-open') v_sec_winding = 240;

        let v_ll = 0;
        let v_ln = 0;

        if(state.secondaryConn.includes('star')) {
            v_ll = v_sec_winding * Math.sqrt(3);
            v_ln = v_sec_winding;
        } else if (state.secondaryConn.includes('delta')) {
            v_ll = v_sec_winding;
             // High leg theoretical? Just show phase
            v_ln = v_sec_winding / Math.sqrt(3); // Virtual center
        }

        dispVLL.textContent = v_ll.toFixed(1) + ' V';
        dispVLN.textContent = v_ln.toFixed(1) + ' V';
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);
        trafos.forEach(drawTrafo);
        drawSystem();
        calculateValues();
    }

    // Handlers
    selSec.addEventListener('change', (e) => {
        state.secondaryConn = e.target.value;
        draw();
    });

    chkWiring.addEventListener('change', (e) => {
        state.showWiring = e.target.checked;
        draw();
    });

    // Start
    resize();
});
