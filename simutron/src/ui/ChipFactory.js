import { GRID_SIZE, DIP_WIDTH_PX } from '../core/Constants.js';

export class ChipFactory {
  createVisual(component) {
    const el = document.createElement('div');
    el.className = 'sim-component';
    el.id = `view-${component.id}`;
    el.style.left = `${component.x}px`;
    el.style.top = `${component.y}px`;

    // Visual Styling based on type
    const name = component.metadata.name;
    if (name.startsWith('74') || name.startsWith('LM')) {
      return this.createDIPChip(component, el);
    } else if (name === 'LED') {
      return this.createLED(component, el);
    } else if (name === 'Push Button') {
      return this.createButton(component, el);
    } else if (name === 'Voltage Source') {
      return this.createBattery(component, el);
    } else if (name === 'Ground') {
      return this.createGround(component, el);
    } else if (name === 'Resistor') {
      return this.createResistor(component, el);
    } else if (name === 'Capacitor') {
      return this.createCapacitor(component, el);
    } else if (name === '7-Segment') {
      return this.createSevenSegment(component, el);
    } else if (name === 'Signal Generator') {
      return this.createSignalGenerator(component, el);
    } else if (name === 'Voltimetro') {
      return this.createVoltmeter(component, el);
    } else if (name === 'Amperimetro') {
      return this.createAmmeter(component, el);
    } else if (name === 'Osciloscopio') {
      return this.createOscilloscope(component, el);
    } else if (name === 'Dual Power Supply') {
      return this.createDualSupply(component, el);
    }
    
    // Default fallback
    el.style.width = '100px';
    el.style.height = '50px';
    el.style.background = '#444';
    el.style.color = '#fff';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.border = '1px solid #666';
    el.textContent = name;
    return el;
  }

  createDIPChip(comp, el) {
    const pinCount = comp.pins.length; 
    const is8Pin = pinCount <= 8;
    const is16Pin = pinCount === 16;
    
    // Adjust size based on pin count
    const unitsWide = is8Pin ? 4 : (is16Pin ? 8 : 7);
    const chipWidth = unitsWide * GRID_SIZE;
    
    el.style.width = `${chipWidth}px`;
    el.style.height = '46px';
    el.style.background = '#1a1a1a'; // Darker epoxy
    el.style.borderRadius = '2px';
    el.style.boxShadow = '1px 1px 4px rgba(0,0,0,0.6)';
    
    // Text
    const text = document.createElement('div');
    text.textContent = comp.metadata.name;
    text.style.color = '#ccc';
    text.style.fontFamily = '"JetBrains Mono", monospace';
    text.style.fontSize = '11px';
    text.style.textAlign = 'center';
    text.style.marginTop = '15px';
    text.style.opacity = '0.9';
    el.appendChild(text);

    // Notch
    const notch = document.createElement('div');
    notch.style.width = '10px';
    notch.style.height = '10px';
    notch.style.background = '#000';
    notch.style.borderRadius = '50%';
    notch.style.position = 'absolute';
    notch.style.left = '-5px';
    notch.style.top = '18px';
    el.appendChild(notch);

    // Calculate legs
    const sideCount = pinCount / 2;
    for (let i = 0; i < sideCount; i++) {
        const x = 10 + i * GRID_SIZE;
        // Bottom pins (1..N/2)
        this.addLeg(el, x, 53, `p${i+1}`);
        // Top pins (N..N/2+1)
        this.addLeg(el, x, -7, `p${pinCount-i}`);
    }

    return el;
  }

  addLeg(parent, x, y, id) {
    const leg = document.createElement('div');
    leg.className = 'sim-pin';
    leg.dataset.pinId = id;
    leg.style.width = '6px';
    leg.style.height = '6px';
    leg.style.background = 'linear-gradient(to right, #999, #eee, #999)';
    leg.style.position = 'absolute';
    leg.style.left = `${x}px`;
    leg.style.top = `${y}px`;
    parent.appendChild(leg);
  }


  createButton(comp, el) {
    el.style.width = '40px';
    el.style.height = '40px';
    el.style.background = '#333';
    el.style.borderRadius = '4px';
    
    const btn = document.createElement('div');
    btn.style.width = '30px';
    btn.style.height = '30px';
    btn.style.background = '#c00';
    btn.style.borderRadius = '50%';
    btn.style.margin = '5px';
    btn.style.boxShadow = '0 3px 0 #800';
    btn.style.cursor = 'pointer';
    
    // Logic press effect
    const triggerUpdate = () => {
        if (comp.engine) {
            comp.engine.solveNetwork(); 
            // Update all components (visual sync)
            comp.engine.components.forEach(c => {
                if (c.update) c.update(0);
            });
        }
    };

    btn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        btn.style.transform = 'translateY(2px)';
        btn.style.boxShadow = '0 1px 0 #800';
        comp.press();
        triggerUpdate();
    });
    btn.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 3px 0 #800';
        comp.release();
        triggerUpdate();
    });
    
    btn.addEventListener('mouseleave', () => {
        if (comp.isPressed) {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 3px 0 #800';
            comp.release();
            triggerUpdate();
        }
    });

    el.appendChild(btn);

    // Visible Metallic Legs (SIDES - Reverted as requested)
    const legL = document.createElement('div');
    legL.style.cssText = 'position:absolute; left:-16px; top:14px; width:16px; height:12px; background:linear-gradient(#888, #eee, #888); border-radius: 4px 0 0 4px; border: 1px solid #555;';
    el.appendChild(legL);
    
    const legR = document.createElement('div');
    legR.style.cssText = 'position:absolute; right:-16px; top:14px; width:16px; height:12px; background:linear-gradient(#888, #eee, #888); border-radius: 0 4px 4px 0; border: 1px solid #555;';
    el.appendChild(legR);

    // 2 terminals (Separation 60px = 3 grid units for perfect alignment)
    this.addLeg(el, -13, 17, 'a');
    this.addLeg(el, 47, 17, 'b');
    
    return el;
  }
  
  createBattery(comp, el) { 
      // Compact Power Module (matches rail spacing)
      // Body Size: 40px wide (2 grid units), ~44px high
      el.style.width = '42px'; 
      el.style.height = '44px';
      el.style.background = '#333'; 
      el.style.border = '2px solid #888';
      el.style.borderRadius = '4px';
      el.style.boxShadow = '2px 2px 4px rgba(0,0,0,0.5)';
      
      // Label
      const label = document.createElement('div');
      label.textContent = `${comp.voltage}V`; 
      label.id = `label-${comp.id}`;
      label.style.color = '#fff'; 
      label.style.textAlign = 'center';
      label.style.marginTop = '12px';
      label.style.fontSize = '12px';
      label.style.fontWeight = 'bold';
      label.style.fontFamily = 'monospace';
      label.style.pointerEvents = 'none';
      el.appendChild(label);
      
      // Polarity Indicators (Big and Clear)
      const plus = document.createElement('div');
      plus.textContent = '+';
      plus.style.position = 'absolute';
      plus.style.right = '4px';
      plus.style.bottom = '4px';
      plus.style.color = '#f55'; // Red
      plus.style.fontWeight = 'bold';
      plus.style.fontSize = '14px';
      plus.style.pointerEvents = 'none';
      el.appendChild(plus);
      
      const minus = document.createElement('div');
      minus.textContent = '-';
      minus.style.position = 'absolute';
      minus.style.right = '4px';
      minus.style.top = '2px';
      minus.style.color = '#5ae'; // Blue
      minus.style.fontWeight = 'bold';
      minus.style.fontSize = '16px';
      minus.style.pointerEvents = 'none';
      el.appendChild(minus);
      
      // Visible Legs (Wires sticking out)
      // Top Leg (Negative)
      const leg1 = document.createElement('div');
      leg1.style.position = 'absolute';
      leg1.style.left = '-12px'; // Stick out to left
      leg1.style.top = '10px';
      leg1.style.width = '12px';
      leg1.style.height = '4px'; // Thick wire
      leg1.style.background = '#ccc';
      leg1.style.border = '1px solid #999';
      leg1.style.pointerEvents = 'none';
      el.appendChild(leg1);
      
      // Bottom Leg (Positive)
      const leg2 = document.createElement('div');
      leg2.style.position = 'absolute';
      leg2.style.left = '-12px'; // Stick out to left
      leg2.style.top = '30px'; // 20px apart from top leg
      leg2.style.width = '12px';
      leg2.style.height = '4px';
      leg2.style.background = '#ccc';
      leg2.style.border = '1px solid #999';
      leg2.style.pointerEvents = 'none';
      el.appendChild(leg2);

      // Pins (Hitboxes) at the end of the legs
      // Reverted to original positions for correct breadboard alignment
      this.addLeg(el, -12, 10 - 1, 'neg');
      this.addLeg(el, -12, 30 - 1, 'pos');
      
      return el;
  }
  
  createResistor(comp, el) {
    // Horizontal Resistor (Standard 0.4" / 4 grid units)
    el.style.width = '86px'; 
    el.style.height = '14px';
    
    // Wire going through horizontally
    const wire = document.createElement('div');
    wire.style.position = 'absolute';
    wire.style.left = '3px';
    wire.style.top = '6px';
    wire.style.width = '80px';
    wire.style.height = '2px';
    wire.style.background = '#aaa';
    el.appendChild(wire);
    
    // Body (Beige Peanut)
    const body = document.createElement('div');
    body.style.position = 'absolute';
    body.style.left = '23px';
    body.style.top = '0px';
    body.style.width = '40px';
    body.style.height = '14px';
    body.style.background = '#f5e1a4'; // Beige
    body.style.borderRadius = '4px';
    body.style.border = '1px solid #d4c184';
    body.style.boxShadow = '1px 1px 2px rgba(0,0,0,0.3)';
    el.appendChild(body);
    
    // Bands (Decorative)
    const bands = ['brown', 'black', 'red', 'gold'];
    bands.forEach((color, i) => {
        const band = document.createElement('div');
        band.style.position = 'absolute';
        band.style.top = '0';
        band.style.left = `${8 + i * 8}px`;
        band.style.width = '3px';
        band.style.height = '100%';
        band.style.background = color;
        body.appendChild(band);
    });

    // Pins (Left and Right - 80px apart center-to-center = 4 units)
    // Center 1 at x=3, Center 2 at x=83
    this.addLeg(el, 0, 4, 'a');
    this.addLeg(el, 80, 4, 'b');
    
    return el;
  }

  createCapacitor(comp, el) {
    // Standing Electrolytic Capacitor (Vertical Body)
    // Pins are 1 unit apart (20px) center-to-center
    el.style.width = '30px'; 
    el.style.height = '62px';
    el.style.background = 'transparent';
    el.innerHTML = '';
    
    // Main Body (Cylinder - Standing)
    const body = document.createElement('div');
    body.style.position = 'absolute';
    body.style.left = '0';
    body.style.top = '0';
    body.style.width = '30px';
    body.style.height = '42px';
    body.style.background = 'linear-gradient(135deg, #0984e3, #1e3799)'; // Sharper blue gradient
    body.style.borderRadius = '5px 5px 3px 3px';
    body.style.border = '1px solid #000';
    body.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.4)';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    el.appendChild(body);
    
    // Label (µF and V) - High Contrast & No Stripe blocking
    const label = document.createElement('div');
    const uF = Math.round(comp.capacitance * 1e6);
    label.innerHTML = `
        <div style="font-size: 9px; font-weight: 800; color: #fff; line-height: 1.1; text-shadow: 0 1px 2px #000;">${uF}µF</div>
        <div style="font-size: 7px; font-weight: 600; color: rgba(255,255,255,0.9);">${comp.maxVoltage}V</div>
    `;
    label.style.fontFamily = '"Inter", sans-serif';
    label.style.textAlign = 'center';
    label.id = `cap-label-${comp.id}`;
    body.appendChild(label);

    // Polarity indicators ON the body, near the bottom edge
    const plus = document.createElement('div');
    plus.textContent = '+';
    plus.style.position = 'absolute';
    plus.style.left = '4px';
    plus.style.bottom = '2px';
    plus.style.fontSize = '12px';
    plus.style.color = '#ffaaaa'; // Light red on blue body
    plus.style.fontWeight = 'bold';
    body.appendChild(plus);

    const minus = document.createElement('div');
    minus.textContent = '-';
    minus.style.position = 'absolute';
    minus.style.right = '4px';
    minus.style.bottom = '2px';
    minus.style.fontSize = '16px';
    minus.style.color = '#ffffff'; // White on blue body
    minus.style.fontWeight = 'bold';
    body.appendChild(minus);

    // Leads (Parallel sticking out the bottom)
    const legLeft = document.createElement('div');
    legLeft.style.position = 'absolute';
    legLeft.style.left = '4px';
    legLeft.style.top = '42px';
    legLeft.style.width = '2px';
    legLeft.style.height = '16px';
    legLeft.style.background = 'linear-gradient(to right, #888, #ccc, #888)';
    el.appendChild(legLeft);
    
    const legRight = document.createElement('div');
    legRight.style.position = 'absolute';
    legRight.style.left = '24px'; 
    legRight.style.top = '42px';
    legRight.style.width = '2px';
    legRight.style.height = '16px';
    legRight.style.background = 'linear-gradient(to right, #888, #ccc, #888)';
    el.appendChild(legRight);
    
    // (Removed original indicators from here)
    
    // Hitboxes (Pins)
    this.addLeg(el, 2, 54, 'pos');  
    this.addLeg(el, 22, 54, 'neg'); 
    
    return el;
  }
  
  createSevenSegment(comp, el) {
      el.style.width = '60px'; 
      el.style.height = '85px';
      el.style.background = '#1a1a1a';
      el.style.borderRadius = '3px';
      el.style.border = '1px solid #000';
      el.style.boxShadow = 'inset 0 0 10px #000, 2px 2px 5px rgba(0,0,0,0.5)';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.innerHTML = '';
      
      const display = document.createElement('div');
      display.style.width = '42px';
      display.style.height = '62px';
      display.style.position = 'relative';
      display.style.background = '#050505';
      display.style.borderRadius = '2px';
      display.style.border = '1px solid #333';
      el.appendChild(display);
      
      // CSS Segments Mapping (Optimized to avoid DP overlap)
      const layouts = {
          a: { t: 4, l: 6, w: 25, h: 5 },
          b: { t: 8, l: 30, w: 5, h: 22 },
          c: { t: 34, l: 30, w: 5, h: 22 },
          d: { t: 54, l: 6, w: 25, h: 5 },
          e: { t: 34, l: 2, w: 5, h: 22 },
          f: { t: 8, l: 2, w: 5, h: 22 },
          g: { t: 29, l: 6, w: 25, h: 4 },
          dp: { t: 55, l: 37, w: 4, h: 4 }
      };

      for (const [id, s] of Object.entries(layouts)) {
          const seg = document.createElement('div');
          seg.id = `seg-${comp.id}-${id}`;
          seg.style.position = 'absolute';
          seg.style.top = `${s.t}px`;
          seg.style.left = `${s.l}px`;
          seg.style.width = `${s.w}px`;
          seg.style.height = `${s.h}px`;
          seg.style.background = 'rgba(255, 0, 0, 0.05)'; 
          if (id === 'dp') {
              seg.style.borderRadius = '50%';
          } else {
              seg.style.borderRadius = '2px';
          }
          seg.style.border = '1px solid rgba(255, 0, 0, 0.02)';
          seg.style.transition = 'all 0.1s ease';
          display.appendChild(seg);
      }

      // 10 Pins (5 bottom, 5 top) and labels
      const pinIds = ['e', 'd', 'vcc1', 'c', 'dp', 'b', 'a', 'vcc2', 'f', 'g'];
      const labels = ['e', 'd', 'V', 'c', 'dp', 'b', 'a', 'V', 'f', 'g'];

      for (let i = 0; i < 5; i++) {
          const x = 10 + i * GRID_SIZE;
          
          // Bottom Legs
          this.addLeg(el, x, 90, pinIds[i]);
          const lblB = document.createElement('div');
          lblB.textContent = labels[i];
          lblB.style.position = 'absolute';
          lblB.style.left = `${x-2}px`;
          lblB.style.bottom = '2px';
          lblB.style.fontSize = '8px';
          lblB.style.color = '#777';
          lblB.style.fontFamily = 'monospace';
          el.appendChild(lblB);

          // Top Legs
          this.addLeg(el, x, -12, pinIds[9-i]);
          const lblT = document.createElement('div');
          lblT.textContent = labels[9-i];
          lblT.style.position = 'absolute';
          lblT.style.left = `${x-2}px`;
          lblT.style.top = '2px';
          lblT.style.fontSize = '8px';
          lblT.style.color = '#777';
          lblT.style.fontFamily = 'monospace';
          el.appendChild(lblT);
      }

      return el;
  }
  
  createGround(comp, el) {
      el.style.width = '30px'; 
      el.style.height = '30px';
      el.style.display = 'flex';
      el.style.justifyContent = 'center';
      el.style.background = 'transparent';
      el.style.border = 'none';
      el.style.colorScheme = 'light';
      
      // Símbolo de Tierra Estándar (Triángulo de líneas)
      // Usamos un solo path para asegurar que todo tenga el mismo estilo
      el.innerHTML = `
        <svg width="30" height="30" viewBox="0 0 30 30" style="overflow:visible !important;">
            <path d="M 15 0 L 15 12 M 5 12 L 25 12 M 10 17 L 20 17 M 13 22 L 17 22" 
                  stroke="#000000" 
                  stroke-width="2.5" 
                  stroke-linecap="round" 
                  style="stroke:#000000 !important; stroke-width:2.5px !important;" />
        </svg>
      `;
      
      // Connection Point (Pin) at top center
      this.addLeg(el, 14, 0, 'gnd'); 
      return el;
  }

  createSignalGenerator(comp, el) {
      el.style.width = '60px'; 
      el.style.height = '50px';
      el.style.background = '#2c3e50'; 
      el.style.border = '2px solid #95a5a6';
      el.style.borderRadius = '6px';
      el.style.boxShadow = '3px 3px 6px rgba(0,0,0,0.4)';
      
      // LCD Display area
      const lcd = document.createElement('div');
      lcd.id = `lcd-${comp.id}`;
      lcd.style.width = '44px';
      lcd.style.height = '24px';
      lcd.style.background = '#dff9fb';
      lcd.style.margin = '6px auto';
      lcd.style.borderRadius = '3px';
      lcd.style.border = '1px solid #7ed6df';
      lcd.style.display = 'flex';
      lcd.style.alignItems = 'center';
      lcd.style.justifyContent = 'center';
      lcd.style.overflow = 'hidden';
      
      const waveIcon = document.createElement('div');
      waveIcon.id = `wave-icon-${comp.id}`;
      waveIcon.style.fontSize = '16px';
      waveIcon.style.color = '#130f40';
      waveIcon.textContent = comp.waveform === 'sine' ? '∿' : '⎍';
      waveIcon.style.pointerEvents = 'none';
      lcd.appendChild(waveIcon);
      lcd.style.pointerEvents = 'none';
      el.appendChild(lcd);
      
      // Label
      const label = document.createElement('div');
      label.textContent = 'Sig Gen';
      label.style.color = '#fff';
      label.style.fontSize = '8px';
      label.style.textAlign = 'center';
      label.style.fontWeight = 'bold';
      label.style.textShadow = '0 1px 1px rgba(0,0,0,0.9)';
      label.style.fontFamily = '"Inter", sans-serif';
      label.style.pointerEvents = 'none';
      el.appendChild(label);
      
      // Terminal connectors on the body (internal)
      const tOut = document.createElement('div');
      tOut.style.cssText = 'position:absolute; bottom:5px; left:15px; width:8px; height:8px; border-radius:50%; background:#f1c40f; border:1px solid #000; box-shadow:inset 0 0 4px #000;';
      el.appendChild(tOut);

      const tCom = document.createElement('div');
      tCom.style.cssText = 'position:absolute; bottom:5px; right:15px; width:8px; height:8px; border-radius:50%; background:#2c3e50; border:1px solid #000; box-shadow:inset 0 0 4px #000;';
      el.appendChild(tCom);

      // Create the Probes
      this.createProbeTip(comp, 'out', '#f1c40f');
      this.createProbeTip(comp, 'com', '#2c3e50');
      
      return el;
  }

  createVoltmeter(comp, el) {
    el.style.width = '80px'; el.style.height = '60px';
    el.style.background = '#f39c12'; el.style.border = '2px solid #d35400';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '5px 5px 15px rgba(0,0,0,0.5)';
    el.style.cursor = 'grab';
    el.style.zIndex = '50'; 


    const display = document.createElement('div');
    display.id = `meter-val-${comp.id}`;
    display.style.width = '70px'; display.style.height = '30px';
    display.style.background = '#000'; display.style.margin = '8px auto 4px auto';
    display.style.color = '#0f0'; display.style.fontFamily = '"Courier New", monospace';
    display.style.textAlign = 'center'; display.style.lineHeight = '30px';
    display.style.fontSize = '18px'; display.style.fontWeight = 'bold';
    display.style.textShadow = '0 0 8px #0f0'; display.style.border = '1px solid #444';
    display.textContent = '0.00';
    el.appendChild(display);

    const label = document.createElement('div');
    label.textContent = 'MULTIMETER'; label.style.fontSize = '9px';
    label.style.fontWeight = 'bold'; label.style.textAlign = 'center'; label.style.color = '#fff';
    el.appendChild(label);

    // Terminal connectors on the body (internal)
    const tPos = document.createElement('div');
    tPos.className = 'internal-terminal';
    tPos.style.cssText = 'position:absolute; bottom:5px; left:20px; width:8px; height:8px; border-radius:50%; background:#c0392b; border:1px solid #000;';
    el.appendChild(tPos);

    const tNeg = document.createElement('div');
    tNeg.className = 'internal-terminal';
    tNeg.style.cssText = 'position:absolute; bottom:5px; right:20px; width:8px; height:8px; border-radius:50%; background:#222; border:1px solid #000;';
    el.appendChild(tNeg);

    // Create the Probes as separate draggable entities linked to the component
    this.createProbeTip(comp, 'pos', '#e74c3c');
    this.createProbeTip(comp, 'neg', '#2c3e50');

    return el;
  }

  createProbeTip(comp, type, color) {
    const probe = document.createElement('div');
    probe.id = `probe-${comp.id}-${type}`;
    probe.className = 'sim-probe-tip sim-pin';
    probe.dataset.compId = comp.id;
    probe.dataset.pinId = type;
    
    // Probes look like small cylinders with a metallic tip
    probe.style.cssText = `
        position: absolute;
        width: 12px;
        height: 30px;
        background: ${color};
        border: 2px solid #000;
        border-radius: 3px 3px 6px 6px;
        cursor: grab;
        z-index: 100;
        box-shadow: 0 4px 8px rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
    `;
    
    // Grippy texture
    const grip = document.createElement('div');
    grip.style.cssText = 'width:100%; height:15px; margin-top:5px; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2) 2px, transparent 2px, transparent 4px);';
    probe.appendChild(grip);
    
    // The actual "tip" (metallic part)
    const tip = document.createElement('div');
    tip.style.cssText = 'position:absolute; bottom:-8px; left:4px; width:4px; height:8px; background:#bdc3c7; border:1px solid #7f8c8d; border-radius:0 0 2px 2px;';
    probe.appendChild(tip);

    // Initial position based on component metadata
    const startPos = comp.probes[type];
    // Offset by -6px to center the 12px probe body on the target coordinate
    probe.style.left = `${comp.x + startPos.x - 6}px`;
    probe.style.top = `${comp.y + startPos.y - 38}px`; // Subtract tip height to align tip to target Y

    document.getElementById('component-layer').appendChild(probe);
  }

  createAmmeter(comp, el) {
    el.style.width = '50px'; el.style.height = '40px';
    el.style.background = '#e74c3c'; el.style.border = '2px solid #c0392b';
    el.style.borderRadius = '4px';

    const display = document.createElement('div');
    display.id = `meter-val-${comp.id}`;
    display.style.width = '40px'; display.style.height = '20px';
    display.style.background = '#000'; display.style.margin = '4px auto';
    display.style.color = '#0ff'; display.style.fontFamily = 'monospace';
    display.style.textAlign = 'center'; display.style.lineHeight = '20px';
    display.style.fontSize = '12px'; display.textContent = '0.00A';
    el.appendChild(display);

    const label = document.createElement('div');
    label.textContent = 'AMPS'; label.style.fontSize = '8px';
    label.style.textAlign = 'center'; label.style.color = '#fff';
    el.appendChild(label);

    this.addLeg(el, 10, 36, 'a');
    this.addLeg(el, 30, 36, 'b');
    return el;
  }

  createOscilloscope(comp, el) {
    el.style.width = '160px'; 
    el.style.height = '110px';
    el.style.background = '#34495e'; 
    el.style.border = '4px solid #95a5a6';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '10px 10px 30px rgba(0,0,0,0.6)';
    el.style.cursor = 'grab'; // Indicates the whole unit is draggable
    el.style.zIndex = '50';
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = 'height:20px; background:#2c3e50; border-bottom:1px solid #7f8c8d; display:flex; justify-content:space-between; align-items:center; padding:0 8px; border-radius:4px 4px 0 0;';
    header.innerHTML = '<span style="color:#00ff00; font-size:10px; font-weight:bold; font-family:sans-serif;">OSCILLOSCOPE LIVE V2</span>';
    
    // Maximize button
    const maxBtn = document.createElement('button');
    maxBtn.innerHTML = '⛶'; // Fullscreen icon
    maxBtn.style.cssText = 'background:none; border:none; color:#fff; cursor:pointer; font-size:14px; padding:0;';
    maxBtn.title = 'Maximizar Pantalla';
    maxBtn.onclick = (e) => {
      e.stopPropagation();
      this.showMaximizedScope(comp);
    };
    header.appendChild(maxBtn);
    el.appendChild(header);

    // Screen Container
    const screenWrap = document.createElement('div');
    screenWrap.style.position = 'relative';
    screenWrap.style.margin = '6px auto';
    screenWrap.style.width = '140px';
    screenWrap.style.height = '70px';
    el.appendChild(screenWrap);

    // Screen Canvas
    const screen = document.createElement('canvas');
    screen.id = `scope-screen-${comp.id}`;
    screen.width = 140; 
    screen.height = 70;
    screen.style.cssText = 'background:#050505; width:100%; height:100%; display:block; border-radius:4px; border:2px solid #1abc9c; box-shadow:inset 0 0 10px #000; cursor:ns-resize;';
    screenWrap.appendChild(screen);

    // Screen Interaction for Offset (Vertical Mobility)
    let isDragging = false;
    let startY = 0;
    let initialOffset1 = 0;
    let initialOffset2 = 0;

    screen.onmousedown = (e) => {
        if (e.button !== 0) return; // Only left click
        e.stopPropagation(); // Prevent component drag
        e.preventDefault();
        isDragging = true;
        startY = e.clientY;
        initialOffset1 = comp.offsets[0];
        initialOffset2 = comp.offsets[1];
        screen.style.cursor = 'grabbing';
        
        const onMouseMove = (me) => {
            if (!isDragging) return;
            const dy = me.clientY - startY;
            // 1 division is approx 14px in small view
            const sensitivity = 0.05; // divisions per pixel
            const delta = dy * sensitivity;

            // Dragging DOWN (positive dy) should move trace DOWN (decrease offset val, since +Offset moves trace UP in plot logic)
            // Logic check: plot y = center - (v/scale) - (offset * px_per_div)
            // If offset increases, y decreases (goes UP).
            // So to move trace DOWN (follow mouse), offset must DECREASE.
            
            if (me.shiftKey) {
                // Control CH2
                comp.offsets[1] = initialOffset2 - delta;
            } else {
                // Control CH1
                comp.offsets[0] = initialOffset1 - delta;
            }
        };

        const onMouseUp = () => {
            isDragging = false;
            screen.style.cursor = 'ns-resize';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };
    

    // Control panel (Interactive Knobs)
    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex; justify-content:space-around; padding:2px 10px;';
    
    const knobConfigs = [
        { label: 'CH1', type: 'volt', idx: 0, color: '#f1c40f' },
        { label: 'CH2', type: 'volt', idx: 1, color: '#3498db' },
        { label: 'TIME', type: 'time', idx: null, color: '#bdc3c7' }
    ];

    knobConfigs.forEach(cfg => {
      const knobWrap = document.createElement('div');
      knobWrap.style.cssText = 'display:flex; flex-direction:column; align-items:center; cursor:pointer;';
      knobWrap.title = 'Click: Zoom In (-), Right-Click: Zoom Out (+)';
      
      const knob = document.createElement('div');
      knob.style.cssText = `width:14px; height:14px; border-radius:50%; background:${cfg.color}; border:2px solid #2c3e50; box-shadow:1px 1px 3px #000; position:relative;`;
      
      // Indicator line
      const line = document.createElement('div');
      line.style.cssText = 'position:absolute; top:2px; left:5px; width:2px; height:5px; background:#000; transform-origin:bottom center;';
      knob.appendChild(line);

      const lbl = document.createElement('div');
      lbl.textContent = cfg.label;
      lbl.style.cssText = 'font-size:7px; color:#bdc3c7; margin-top:2px; font-weight:bold;';
      
      knobWrap.appendChild(knob);
      knobWrap.appendChild(lbl);
      
      // Knob Logic
      const updateRotation = () => {
          let val = 0;
          if (cfg.type === 'time') val = comp.timebase;
          else val = comp.voltsPerDiv[cfg.idx];
          
          // Rotation based on the "standard" knob positions (0-270 deg)
          const rot = (Math.log10(val) * 60) % 270;
          line.style.transform = `rotate(${rot}deg)`;
      };
      updateRotation();

      knobWrap.onmousedown = (e) => e.stopPropagation();

      const standardSequence = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
      
      const getNextVal = (current, dir) => {
          // Find closest value in sequence
          let bestIdx = 0;
          let minDiff = Infinity;
          for(let i=0; i<standardSequence.length; i++) {
              let diff = Math.abs(standardSequence[i] - current);
              if (diff < minDiff) { minDiff = diff; bestIdx = i; }
          }
          let nextIdx = Math.max(0, Math.min(standardSequence.length - 1, bestIdx + dir));
          return standardSequence[nextIdx];
      };

      knobWrap.onclick = (e) => {
          e.stopPropagation();
          if (cfg.type === 'time') {
              comp.timebase = getNextVal(comp.timebase, -1);
          } else {
              comp.voltsPerDiv[cfg.idx] = getNextVal(comp.voltsPerDiv[cfg.idx], -1);
          }
          updateRotation();
      };

      knobWrap.oncontextmenu = (e) => {
          e.preventDefault(); e.stopPropagation();
          if (cfg.type === 'time') {
              comp.timebase = getNextVal(comp.timebase, 1);
          } else {
              comp.voltsPerDiv[cfg.idx] = getNextVal(comp.voltsPerDiv[cfg.idx], 1);
          }
           updateRotation();
      };
      
      knobWrap.onwheel = (e) => {
          e.preventDefault(); e.stopPropagation();
          const dir = e.deltaY > 0 ? 1 : -1;
          if (cfg.type === 'time') {
              comp.timebase = getNextVal(comp.timebase, dir);
          } else {
              comp.voltsPerDiv[cfg.idx] = getNextVal(comp.voltsPerDiv[cfg.idx], dir);
          }
          updateRotation();
      };

      controls.appendChild(knobWrap);
    });
    
    el.appendChild(controls);

    // Terminal connectors on the body (internal)
    const connectors = [
      { id: 'ch1', color: '#f1c40f', x: 25 },
      { id: 'ch2', color: '#3498db', x: 80 },
      { id: 'gnd', color: '#2c3e50', x: 135 }
    ];
    
    connectors.forEach(conn => {
      const t = document.createElement('div');
      t.className = 'internal-terminal';
      t.style.cssText = `position:absolute; bottom:4px; left:${conn.x}px; width:10px; height:10px; border-radius:50%; background:${conn.color}; border:1px solid #000; box-shadow:inset 0 0 4px #000;`;
      el.appendChild(t);
    });

    // Real-time plotting loop inside the component
    const ctx = screen.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    screen.width = 140 * dpr;
    screen.height = 70 * dpr;
    ctx.scale(dpr, dpr);

    const drawGrid = () => {
        ctx.strokeStyle = 'rgba(0, 51, 0, 0.5)'; ctx.lineWidth = 0.5;
        for(let x=0; x<140; x+=14) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,70); ctx.stroke(); }
        for(let y=0; y<70; y+=14) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(140,y); ctx.stroke(); }
    };

    const plot = () => {
        if (!document.getElementById(screen.id)) return;
        ctx.fillStyle = '#050505';
        ctx.fillRect(0,0,140,70);
        drawGrid();

        // CH1 (Yellow)
        ctx.lineWidth = 1.5; ctx.shadowBlur = 6; ctx.shadowColor = '#f1c40f';
        ctx.strokeStyle = '#f1c40f';
        ctx.beginPath();
        comp.channels.ch1.forEach((v, i) => {
            const x = (i / comp.bufferSize) * 140;
            const y = 35 - (v * (14 / comp.voltsPerDiv[0])) - (comp.offsets[0] * 14); 
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // CH2 (Cyan)
        ctx.strokeStyle = '#3498db'; ctx.shadowColor = '#3498db';
        ctx.beginPath();
        comp.channels.ch2.forEach((v, i) => {
            const x = (i / comp.bufferSize) * 140;
            const y = 35 - (v * (14 / comp.voltsPerDiv[1])) - (comp.offsets[1] * 14);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Indicator overlaid info
        ctx.font = '8px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.shadowBlur = 0;
        
        let tStr = comp.timebase >= 1 ? `${comp.timebase.toFixed(1)}s` : `${(comp.timebase*1000).toFixed(0)}ms`;
        if (comp.timebase < 0.001) tStr = `${(comp.timebase*1e6).toFixed(0)}µs`;
        
        ctx.fillText(`T:${tStr}`, 2, 8);
        ctx.fillStyle = '#f1c40f';
        ctx.fillText(`CH1:${comp.voltsPerDiv[0].toFixed(0)}V`, 2, 65);
        ctx.fillStyle = '#3498db';
        ctx.fillText(`CH2:${comp.voltsPerDiv[1].toFixed(0)}V`, 50, 65);

        requestAnimationFrame(plot);
    };
    requestAnimationFrame(plot);

    // Create the Probes
    this.createProbeTip(comp, 'ch1', '#f1c40f');
    this.createProbeTip(comp, 'ch2', '#3498db');
    this.createProbeTip(comp, 'gnd', '#2c3e50');

    return el;
  }

  // New function for LED component
  createLED(comp, el) {
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.background = 'transparent';
    el.style.position = 'relative';

    // LED Body (Round part)
    const body = document.createElement('div');
    body.id = `led-bulb-${comp.id}`;
    body.style.cssText = `
        position: absolute;
        left: 4px;
        top: 0px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, ${comp.color || '#ff0000'}, #880000);
        border: 1px solid #333;
        box-shadow: inset 0 0 3px rgba(255,255,255,0.5), 0 0 5px rgba(0,0,0,0.5);
    `;
    el.appendChild(body);

    // Cathode Flat Side (Visual indicator)
    const flatSide = document.createElement('div');
    flatSide.style.cssText = `
        position: absolute;
        left: 4px;
        top: 0px;
        width: 1px; /* Thin line to indicate flat side */
        height: 12px;
        background: rgba(0,0,0,0.3);
        border-radius: 0 50% 50% 0; /* Only round the right side */
        transform: translateX(11px); /* Position at the right edge of the body */
    `;
    body.appendChild(flatSide);

    // Anode Leg
    const anodeLeg = document.createElement('div');
    anodeLeg.style.cssText = `
        position: absolute;
        left: 5px;
        top: 12px;
        width: 2px;
        height: 12px;
        background: linear-gradient(to bottom, #888, #ccc, #888);
        border-radius: 0 0 1px 1px;
    `;
    el.appendChild(anodeLeg);

    // Cathode Leg
    const cathodeLeg = document.createElement('div');
    cathodeLeg.style.cssText = `
        position: absolute;
        left: 25px;
        top: 12px;
        width: 2px;
        height: 10px; /* SHORTER for cathode */
        background: linear-gradient(to bottom, #888, #ccc, #888);
        border-radius: 0 0 1px 1px;
    `;
    el.appendChild(cathodeLeg);

    // Hitboxes for interaction
    this.addLeg(el, 3, 22, 'anode'); // Anode
    this.addLeg(el, 23, 20, 'cathode'); // Cathode

    // Labels for Anode (A) and Cathode (K)
    const anodeLabel = document.createElement('div');
    anodeLabel.textContent = 'A';
    anodeLabel.style.cssText = `
        position: absolute;
        left: 3px;
        top: 22px;
        font-size: 8px;
        color: #fff;
        font-weight: bold;
        font-family: sans-serif;
        pointer-events: none;
    `;
    el.appendChild(anodeLabel);

    const cathodeLabel = document.createElement('div');
    cathodeLabel.textContent = 'K';
    cathodeLabel.style.cssText = `
        position: absolute;
        left: 23px;
        top: 22px;
        font-size: 8px;
        color: #fff;
        font-weight: bold;
        font-family: sans-serif;
        pointer-events: none;
    `;
    el.appendChild(cathodeLabel);

    // Body needs to be centered between pins (total width should be ~30px)
    el.style.width = '30px';
    body.style.left = '9px'; // (30/2 - 12/2)

    // Hitboxes (Pins) - Center of the 2px legs (approx)
    this.addLeg(el, 5 - 2, 21, 'anode');
    this.addLeg(el, 25 - 2, 21, 'cathode');

    return el;
  }

  showMaximizedScope(comp) {
    let modal = document.getElementById('scope-max-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'scope-max-modal';
      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:2000; display:flex; flex-direction:column; align-items:center; justify-content:center;';
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.innerHTML = '';

    const container = document.createElement('div');
    container.style.cssText = 'width:90%; height:85%; background:#2c3e50; border:10px solid #95a5a6; border-radius:20px; position:relative; display:flex; flex-direction:column; padding:20px; box-shadow:0 0 50px rgba(0,0,0,1);';
    
    const title = document.createElement('h2');
    title.textContent = 'Digital Storage Oscilloscope PRO';
    title.style.cssText = 'color:#fff; margin-top:0; border-bottom:2px solid #34495e; padding-bottom:10px; font-family:sans-serif; letter-spacing:2px;';
    container.appendChild(title);

    const screenWrap = document.createElement('div');
    screenWrap.style.cssText = 'flex-grow:1; background:#000; border:4px solid #1abc9c; border-radius:10px; overflow:hidden; position:relative;';
    
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 600;
    canvas.style.cssText = 'width:100%; height:100%;';
    screenWrap.appendChild(canvas);
    container.appendChild(screenWrap);

    // Controls at bottom
    const controls = document.createElement('div');
    controls.style.cssText = 'height:100px; display:flex; gap:30px; align-items:center; justify-content:center; color:#fff; font-family:monospace; margin-top:20px;';
    
    // Controls logic
    const standardVDiv = [1, 2, 5, 10, 20, 50, 100];
    const standardTBase = [
        0.0001, 0.0002, 0.0005, 
        0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 
        1, 2, 5
    ];

    const getNextVal = (seq, current, dir) => {
      let bestIdx = 0; let minDiff = Infinity;
      for(let i=0; i<seq.length; i++) {
        let diff = Math.abs(seq[i] - current);
        if (diff < minDiff) { minDiff = diff; bestIdx = i; }
      }
      return seq[Math.max(0, Math.min(seq.length-1, bestIdx + dir))];
    };

    // UI creation
    const createControl = (label, valGetter, valSetter, seq) => {
      const div = document.createElement('div');
      div.style.textAlign = 'center';
      div.innerHTML = `<div style="font-size:12px; color:#bdc3c7; margin-bottom:10px;">${label}</div>`;
      
      const row = document.createElement('div');
      row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.gap = '10px';
      
      const btnDec = document.createElement('button');
      btnDec.textContent = '-'; btnDec.style.cssText = 'width:35px; height:35px; background:#e74c3c; border:none; color:#fff; border-radius:50%; cursor:pointer; font-weight:bold; font-size:18px;';
      
      const display = document.createElement('div');
      display.style.cssText = 'width:120px; font-size:20px; font-weight:bold; color:#0f0; background:#000; padding:8px; border:1px solid #333; border-radius:4px;';
      
      const btnInc = document.createElement('button');
      btnInc.textContent = '+'; btnInc.style.cssText = 'width:35px; height:35px; background:#2ecc71; border:none; color:#fff; border-radius:50%; cursor:pointer; font-weight:bold; font-size:18px;';

      const updateUI = () => {
          const v = valGetter();
          let txt = v.toString();
          if (label.includes('TIMEBASE')) {
              if (v < 0.001) txt = (v*1e6).toFixed(0) + ' µs';
              else if (v < 1) txt = (v*1000).toFixed(0) + ' ms';
              else txt = v.toFixed(1) + ' s';
          } else if (label.includes('V/DIV')) {
              txt = v.toFixed(0) + ' V';
          } else {
              txt = v.toFixed(1);
          }
          display.textContent = txt;
      };

      btnDec.onclick = () => { valSetter(getNextVal(seq, valGetter(), -1)); updateUI(); };
      btnInc.onclick = () => { valSetter(getNextVal(seq, valGetter(), 1)); updateUI(); };
      
      updateUI();
      row.appendChild(btnDec);
      row.appendChild(display);
      row.appendChild(btnInc);
      div.appendChild(row);
      return div;
    };

    const timeCtrl = createControl('TIMEBASE', () => comp.timebase, (v) => comp.timebase = v, standardTBase);
    controls.appendChild(timeCtrl);

    const ch1Ctrl = createControl('CH1 V/DIV', () => comp.voltsPerDiv[0], (v) => comp.voltsPerDiv[0] = v, standardVDiv);
    controls.appendChild(ch1Ctrl);

    const ch2Ctrl = createControl('CH2 V/DIV', () => comp.voltsPerDiv[1], (v) => comp.voltsPerDiv[1] = v, standardVDiv);
    controls.appendChild(ch2Ctrl);

    // Vertical Offsets with Mouse-like dragging or fine buttons
    const createOffsetCtrl = (label, idx) => {
        return createControl(label, () => comp.offsets[idx], (v) => comp.offsets[idx] = v, [-4,-3.5,-3,-2.5,-2,-1.5,-1,-0.5,0,0.5,1,1.5,2,2.5,3,3.5,4]);
    };
    controls.appendChild(createOffsetCtrl('OFFSET CH1', 0));
    controls.appendChild(createOffsetCtrl('OFFSET CH2', 1));

    // Screen Mouse Interaction (Drag vertically to change offset)
    let isDraggingOffset = false;
    let startY = 0;
    let initialOffset = 0;
    let dragChannel = 0;

    canvas.onmousedown = (e) => {
        isDraggingOffset = true;
        startY = e.clientY;
        // Determine which channel to drag based on mouse Y position or just CH1 by default
        // For simplicity: Top half drags CH1, Bottom half drags CH2? OR use shift
        dragChannel = e.shiftKey ? 1 : 0;
        initialOffset = comp.offsets[dragChannel];
        canvas.style.cursor = 'ns-resize';
    };

    window.addEventListener('mousemove', (e) => {
        if (!isDraggingOffset) return;
        const dy = e.clientY - startY;
        const h = canvas.height / mDpr;
        // 1 division is h/8
        const sensitivity = 8 / h; 
        comp.offsets[dragChannel] = initialOffset - (dy * sensitivity);
    });

    window.addEventListener('mouseup', () => {
        isDraggingOffset = false;
        canvas.style.cursor = 'default';
    });

    container.appendChild(controls);

    // Close button
    const close = document.createElement('button');
    close.textContent = '✕ ESC';
    close.style.cssText = 'position:absolute; top:20px; right:20px; background:#c0392b; color:#fff; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; font-weight:bold;';
    close.onclick = () => modal.style.display = 'none';
    container.appendChild(close);

    modal.appendChild(container);

    // Max Screen Plot Loop
    const mCtx = canvas.getContext('2d');
    const mDpr = window.devicePixelRatio || 1;
    const updateSize = () => {
        const w = container.clientWidth - 40;
        const h = container.clientHeight - 200;
        canvas.width = w * mDpr;
        canvas.height = h * mDpr;
        mCtx.scale(mDpr, mDpr);
    };
    window.addEventListener('resize', updateSize);
    updateSize();

    const drawMGrid = () => {
        const w = canvas.width / mDpr;
        const h = canvas.height / mDpr;
        mCtx.strokeStyle = 'rgba(0, 255, 0, 0.1)'; mCtx.lineWidth = 1;
        for(let x=0; x<w; x+=w/10) { mCtx.beginPath(); mCtx.moveTo(x,0); mCtx.lineTo(x,h); mCtx.stroke(); }
        for(let y=0; y<h; y+=h/8) { mCtx.beginPath(); mCtx.moveTo(0,y); mCtx.lineTo(w,y); mCtx.stroke(); }
        // Center lines
        mCtx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        mCtx.beginPath(); mCtx.moveTo(w/2, 0); mCtx.lineTo(w/2, h); mCtx.stroke();
        mCtx.beginPath(); mCtx.moveTo(0, h/2); mCtx.lineTo(w, h/2); mCtx.stroke();
    };

    const runMPlot = () => {
        if (modal.style.display === 'none') return;
        const w = canvas.width / mDpr;
        const h = canvas.height / mDpr;
        
        mCtx.fillStyle = '#050505';
        mCtx.fillRect(0,0,w,h);
        drawMGrid();

        // Waveforms
        mCtx.lineWidth = 3; mCtx.shadowBlur = 15;
        
        // CH1
        mCtx.strokeStyle = '#f1c40f'; mCtx.shadowColor = '#f1c40f';
        mCtx.beginPath();
        comp.channels.ch1.forEach((v, i) => {
            const x = (i / comp.bufferSize) * w;
            const y = (h/2) - (v * (h / (8 * comp.voltsPerDiv[0]))) - (comp.offsets[0] * (h/8));
            if (i === 0) mCtx.moveTo(x, y); else mCtx.lineTo(x, y);
        });
        mCtx.stroke();

        // CH2
        mCtx.strokeStyle = '#3498db'; mCtx.shadowColor = '#3498db';
        mCtx.beginPath();
        comp.channels.ch2.forEach((v, i) => {
            const x = (i / comp.bufferSize) * w;
            const y = (h/2) - (v * (h / (8 * comp.voltsPerDiv[1]))) - (comp.offsets[1] * (h/8));
            if (i === 0) mCtx.moveTo(x, y); else mCtx.lineTo(x, y);
        });
        mCtx.stroke();

        requestAnimationFrame(runMPlot);
    };
    runMPlot();
  }

  createDualSupply(comp, el) {
      // Professional Modular Dual Supply
      // Height increased to bridge the gap between rails and main breadboard area
      el.style.width = '64px'; 
      el.style.height = '100px';
      el.style.background = '#2c3e50'; 
      el.style.border = '2px solid #7f8c8d';
      el.style.borderRadius = '6px';
      el.style.boxShadow = '3px 3px 10px rgba(0,0,0,0.5)';
      
      // LCD / Label Area
      const display = document.createElement('div');
      display.style.cssText = 'width:52px; height:24px; background:#1e1e1e; margin:8px auto; border-radius:3px; border:1px solid #444; color:#e74c3c; font-family:monospace; font-size:12px; display:flex; align-items:center; justify-content:center; font-weight:bold;';
      display.textContent = `±${comp.voltage}V`;
      el.appendChild(display);

      // Label
      const label = document.createElement('div');
      label.textContent = 'DUAL DC SOURCE';
      label.style.cssText = 'color:#bdc3c7; font-size:7px; text-align:center; font-weight:bold; margin-top:-2px;';
      el.appendChild(label);

      // Vertical pin layout to bridge Power Bus to Row A
      // Logic: 
      // y=12 -> Connects to top-neg (-12V)
      // y=32 -> Connects to top-pos (+12V)
      // y=72 -> Connects to Row A (COM/Reference)
      const terminals = [
        { id: 'neg', color: '#3498db', label: '-', y: 12 },
        { id: 'pos', color: '#e74c3c', label: '+', y: 32 },
        { id: 'com', color: '#ffffff', label: 'COM', y: 72 }
      ];

      terminals.forEach(t => {
          // Internal connection dot
          const dot = document.createElement('div');
          dot.style.cssText = `position:absolute; left:6px; top:${t.y-4}px; width:8px; height:8px; border-radius:50%; background:${t.color}; border:1px solid #000;`;
          el.appendChild(dot);
          
          if(t.label !== 'COM') {
              const sym = document.createElement('div');
              sym.textContent = t.label;
              sym.style.cssText = `position:absolute; left:16px; top:${t.y-6}px; color:#fff; font-size:10px; font-weight:bold;`;
              el.appendChild(sym);
          } else {
              const sym = document.createElement('div');
              sym.textContent = 'COM';
              sym.style.cssText = `position:absolute; left:16px; top:${t.y-6}px; color:#fff; font-size:8px; font-weight:bold;`;
              el.appendChild(sym);
          }

          // Connector wires sticking out to the left
          const wire = document.createElement('div');
          wire.style.cssText = `position:absolute; left:-12px; top:${t.y-2}px; width:12px; height:4px; background:#bdc3c7; border:1px solid #7f8c8d; border-radius:2px 0 0 2px; pointer-events:none;`;
          el.appendChild(wire);

          // Connection pins (hitboxes) - Offset for precise hole snapping
          this.addLeg(el, -12, t.y-3, t.id);
      });

      return el;
  }
}
