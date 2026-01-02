document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('transformerCanvas');
    const ctx = canvas.getContext('2d');
    
    // Load Transformer Image
    const trafoImg = new Image();
    trafoImg.src = 'images/transformer_real.png';
    let imageLoaded = false;
    trafoImg.onload = () => {
        imageLoaded = true;
        draw();
    };

    // Load Logo (Assuming existing logo)
    const logoImg = new Image();
    // Try to find the logo relative path. Based on HTML it might be images/logo.png or just logo.png.
    // Let's assume images/logo.png to match standard structure, or fallback if needed.
    // The previous file listing showed logo.png at root. 
    // But the HTML <img src="images/logo.png"> suggests it's in images.
    // Let's try 'images/logo.png'.
    logoImg.src = 'images/logo.png'; 
    let logoLoaded = false;
    logoImg.onload = () => {
        logoLoaded = true;
        draw();
    };

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
    const colC = '#FFD600'; // Changed to Yellow (Green reserved for ground)
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
        const gap = w * 0.02; // Reduced gap
        // Maintain aspect ratio of image?
        // Assume image is roughly 1:2 or 1:2.5
        // Let's fit 3 transformers.
        
        const tWidth = (w - gap*4) / 3;
        // Image aspect ratio approximation (from user image view)
        // It looks tall. Let's say H = 2 * W approximately.
        // We need to ensure it fits in h.
        let tHeight = tWidth * 2.2; 
        
        if (tHeight > h * 0.8) {
            tHeight = h * 0.8;
            // Adjust width to maintain aspect if needed, but drawing will stretch.
            // Better to let width be fixed by column and stretch height? 
            // Or let's center them vertically.
        }

        const startY = (h - tHeight) / 2 + 20; // Center vertically, slightly shifted down

        const labels = ['T1', 'T2', 'T3'];

        for(let i=0; i<3; i++) {
            const x = gap + i*(tWidth + gap);
            const y = startY;
            
            // Image Feature Coordinates (approximate percentages based on the uploaded image)
            // Top Bushings: Tall. Tips are at ~5% height.
            // H1 (Left Bushing): ~30% width, ~5% height
            // H2 (Right Bushing): ~70% width, ~5% height
            
            // Front Bushings (X1, X3, X2, X4)
            // They are in a row at ~35-40% height of the image? 
            // Looking at the image:
            // The bushings are on the side/front.
            // X1, X3, X2, X4.
            // Height: About 35% down from top.
            
            // Let's map normalized coordinates relative to (x, y, tWidth, tHeight)
            
            trafos.push({
                x: x,
                y: y,
                w: tWidth,
                h: tHeight,
                label: labels[i],
                // Primary Top Bushings (Tips)
                // H1 Left, H2 Right. Bushings slant outwards slightly.
                // Adjusted: Closer to 30% and 70%. Height slightly lower to hit the metal tip.
                h1: {x: x + tWidth*0.29, y: y + tHeight*0.06}, 
                h2: {x: x + tWidth*0.71, y: y + tHeight*0.06},
                
                // Secondary Front Bushings
                // Located roughly at 30% down the image height
                // The image shows them clustered in the center-front.
                // Labels X1 X3 X2 X4 are above the bushings.
                // We need to bring them closer together horizontally and check height.
                // Previous: 0.22, 0.40, 0.60, 0.78 (Range 0.56w)
                // New: Tighten to center. Range ~0.5w?
                // Also visually they are slightly lower than the 'X1' label text.
                // Let's drop Y slightly to 0.36
                x1: {x: x + tWidth*0.26, y: y + tHeight*0.37},
                x3: {x: x + tWidth*0.42, y: y + tHeight*0.37},
                x2: {x: x + tWidth*0.58, y: y + tHeight*0.37},
                x4: {x: x + tWidth*0.74, y: y + tHeight*0.37}
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
        
        // Routing logic
        // p1 is always on the transformer (Trafo Point)
        // p2 is either another trafo point or a busbar point
        
        // If p1 is internal (connection between trf terminals), we handle it in drawJumper/Internal
        // Here we handle Trafo -> Busbar.
        
        // H1/H2 (Primary) go UP to busbar.
        // X1..X4 (Secondary) go DOWN to busbar.
        
        const isPri = p1.y < (trafos[0].y + trafos[0].h * 0.2); // Rough check if top part
        
        // Mid line for neatness
        const midY = isPri ? p1.y - 30 - offset : p1.y + 30 + offset;
        
        // But wait, the secondary terminals are now in the middle of the body (y + 0.35h).
        // If we go strictly down, we cross the transformer body.
        // It might look better to go "Out" (Z-axis visually?) or just go down over the body?
        // Let's go down.
        
        // If Secondary, we might need a larger offset or different routing to clear the labels/body if desired.
        // For now, simple orthogonal.
        
        // Adjust midY for secondary to be below the transformer
        let actualMidY = midY;
        if (!isPri) {
             // Ensure we go below the transformer body before turning horizontal?
             // Or just go down from the terminal. 
             // Since terminals are at 35% height, we have 65% body below.
             // Wires going down over the white body is fine, realistic.
             
             // Ensure midY is below the transformer body to avoid crossing labels?
             // The labels in the image are painted on.
             // The wire busbars are at the very bottom (h - 40).
             // Let's just go directly to busbar level Y?
             
             // The previous logic used 'midY' as a horizontal channel.
        }

        ctx.lineTo(p1.x, actualMidY);
        ctx.lineTo(p2.x, actualMidY);
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
        if (imageLoaded) {
            // Draw Image
            ctx.drawImage(trafoImg, t.x, t.y, t.w, t.h);
            
            // Draw Logo Overlay (Replace bottom brand)
            // Brand is at approx bottom 20% center.
            if (logoLoaded) {
                const logoW = t.w * 0.3; // Logo width
                const logoAspect = logoImg.width / logoImg.height; // Keep aspect if possible
                const logoH = logoW / logoAspect;
                
                const logoX = t.x + (t.w - logoW) / 2;
                const logoY = t.y + t.h * 0.78; // Moved up from 0.85 to cover original brand
                
                // Draw a white circle/bg behind logo to mask original brand?
                ctx.fillStyle = '#fff'; // Transformer body color
                ctx.beginPath();
                ctx.arc(logoX + logoW/2, logoY + logoH/2, logoW/1.5, 0, Math.PI*2);
                ctx.fill();

                ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
            }

        } else {
            // Fallback
            ctx.fillStyle = '#334155';
            ctx.fillRect(t.x, t.y, t.w, t.h);
        }

        // Draw Terminals (just dots for connection reference)
        const bushings = [
            {p: t.h1, l: '', c: colH}, {p: t.h2, l: '', c: colH},
            {p: t.x1, l: '', c: colX}, {p: t.x3, l: '', c: colX},
            {p: t.x2, l: '', c: colX}, {p: t.x4, l: '', c: colX}
        ];

        bushings.forEach(b => {
             ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // Semi-transparent overlay
             ctx.beginPath();
             ctx.arc(b.p.x, b.p.y, 5, 0, Math.PI*2);
             ctx.fill();
             // Optional: outline
             ctx.strokeStyle = b.c;
             ctx.lineWidth = 1;
             ctx.stroke();
        });
        
        // Label? Image has text "37.5 kVA". We can add T1/T2/T3 below or above.
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(t.label, t.x + t.w/2, t.y + t.h + 20); // Below unit
    }

    function drawSystem() {
        if(!state.showWiring) return;
        drawBusbarsAndExternal();
        drawInternalConnections();
    }

    function drawBusbarsAndExternal() {
        // Busbars positions
        const busY = 25; // Top
        const busGap = 12;
        const loadY = h - 25; // Bottom

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

        // Define Open Delta Check Early
        const isOpenDelta = state.secondaryConn.startsWith('delta-open');

        // --- Primary Connections (Fixed Delta) ---
        // T1: H1->A, H2->B
        // T2: H1->B, H2->C
        // T3: H1->C, H2->A (Skip if Open Delta)
        
        drawWire(trafos[0].h1, {x: trafos[0].h1.x, y: srcA.y}, colA, 5);
        drawWire(trafos[0].h2, {x: trafos[0].h2.x, y: srcB.y}, colB, 10);

        drawWire(trafos[1].h1, {x: trafos[1].h1.x, y: srcB.y}, colB, 15);
        drawWire(trafos[1].h2, {x: trafos[1].h2.x, y: srcC.y}, colC, 20);

        if (!isOpenDelta) {
            drawWire(trafos[2].h1, {x: trafos[2].h1.x, y: srcC.y}, colC, 25);
            drawWire(trafos[2].h2, {x: trafos[2].h2.x, y: srcA.y}, colA, 30);
        }

        // --- Secondary Busbars (a, b, c, n) ---
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
        // isOpenDelta already defined

        trafos.forEach((t, i) => {
            if(isOpenDelta && i === 2) return; 

            let hotPoint, returnPoint;

            if(state.secondaryConn.includes('parallel')) {
                hotPoint = t.x1; 
                returnPoint = t.x4; 
            } else {
                hotPoint = t.x1;
                returnPoint = t.x4;
            }

            // STAR CONNECTION
            if(isStar) {
                const targetLineY = (i===0) ? out_a : (i===1) ? out_b : out_c;
                const targetColor = (i===0) ? colA : (i===1) ? colB : colC;
                
                // Route down to busbar. 
                // Since points are high up (35% H), we need to clear down.
                drawWire(hotPoint, {x: hotPoint.x, y: targetLineY}, targetColor, 10 + i*5);
                drawWire(returnPoint, {x: returnPoint.x, y: out_n}, colN, 40);
            }

            // DELTA CONNECTION
            if(isDelta) {
                const myLineY = (i===0) ? out_a : (i===1) ? out_b : out_c; 
                const myColor = (i===0) ? colA : (i===1) ? colB : colC;

                drawWire(hotPoint, {x: hotPoint.x, y: myLineY}, myColor, 10 + i*5);

                const nextLineY = (i===0) ? out_b : (i===1) ? out_c : out_a;
                const nextColor = (i===0) ? colB : (i===1) ? colC : colA;
                
                if(isOpenDelta) {
                   if(i===0) drawWire(returnPoint, {x: returnPoint.x, y: out_b}, colB, 30);
                   if(i===1) drawWire(returnPoint, {x: returnPoint.x, y: out_c}, colC, 30);
                } else {
                   drawWire(returnPoint, {x: returnPoint.x, y: nextLineY}, nextColor, 35);
                }
            }
        });
    }

    function drawInternalConnections() {
        const isOpenDelta = state.secondaryConn.startsWith('delta-open');
        trafos.forEach((t, i) => {
            if(isOpenDelta && i === 2) return; // Skip T3 internal jumper

            // Because X1..X4 are horizontal, we can arc or bracket them.
            // Arcs might be cleaner than square jumps for local connections.
            
            if(state.secondaryConn.includes('parallel')) {
                // X1-X3 and X2-X4
                drawLocalJumper(t.x1, t.x3, '#fff');
                drawLocalJumper(t.x2, t.x4, '#fff');
            } else {
                // Series: X2-X3
                drawLocalJumper(t.x2, t.x3, '#fff');
            }
        });
    }

    function drawLocalJumper(p1, p2, color) {
        ctx.beginPath();
        // Arc downwards?
        const centerX = (p1.x + p2.x) / 2;
        const dist = Math.abs(p2.x - p1.x);
        const controlY = p1.y + dist/1.5; // Control point below
        
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(centerX, controlY, p2.x, p2.y);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 3, 0, Math.PI*2);
        ctx.arc(p2.x, p2.y, 3, 0, Math.PI*2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function calculateValues() {
        let v_sec_winding = 120;
        if(state.secondaryConn.includes('series') || state.secondaryConn === 'delta-open') v_sec_winding = 240;

        let v_ll = 0;
        let v_ln = 0;

        if(state.secondaryConn.includes('star')) {
            v_ll = v_sec_winding * Math.sqrt(3);
            v_ln = v_sec_winding;
        } else if (state.secondaryConn.includes('delta')) {
            v_ll = v_sec_winding;
            v_ln = v_sec_winding / Math.sqrt(3); 
        }

        // Venezuelan format: comma for decimals
        const fmt = (n) => n.toLocaleString('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        dispVLL.textContent = fmt(v_ll) + ' V';
        dispVLN.textContent = fmt(v_ln) + ' V';
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
