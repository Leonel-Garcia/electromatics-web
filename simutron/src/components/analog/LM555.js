import { Component } from '../../core/Component.js';

export class LM555 extends Component {
  constructor(id) {
    super(id);
    console.log(`LM555 Constructor called for ${id}. Logic Version: 3.0 (Pins Fixed)`);
    this.metadata = { name: 'LM555', description: 'Precision Timer' };
    this.width = 140; 
    this.height = 50;

    // Standard 8-pin DIP
    // 1: GND, 2: Trigger, 3: Output, 4: Reset
    // 5: Control, 6: Threshold, 7: Discharge, 8: VCC
    
    // Map internal semantic names to their pin IDs for clarity
    this.pinMap = {
        gnd: 'p1',
        trig: 'p2',
        out: 'p3',
        reset: 'p4',
        cv: 'p5',
        thresh: 'p6',
        disch: 'p7',
        vcc: 'p8'
    };

    // Initialize Pins p1 to p8
    this.addPin('p1', 'input');   // GND
    this.addPin('p2', 'input');   // Trigger
    this.addPin('p3', 'output');  // Output
    this.addPin('p4', 'input');   // Reset
    this.addPin('p5', 'io');      // Control
    this.addPin('p6', 'input');   // Threshold
    this.addPin('p7', 'io');      // Discharge
    this.addPin('p8', 'input');   // VCC

    this.latch = false;
  }

  // Helper to get pin by semantic name
  getSemPin(name) {
      return this.getPin(this.pinMap[name]);
  }

  // Override getPin to support legacy wire connections (e.g. 'vcc' -> 'p8')
  getPin(id) {
    // If id is a semantic name in our map, translate it
    if (this.pinMap[id]) {
        return super.getPin(this.pinMap[id]);
    }
    return super.getPin(id);
  }

  update(dt) {
    const pinTrig = this.getSemPin('trig');
    const pinThresh = this.getSemPin('thresh');
    const pinDisch = this.getSemPin('disch');
    const pinVcc = this.getSemPin('vcc');
    const pinGnd = this.getSemPin('gnd');

    // 1. Basic Power Check
    if (!pinVcc.net || !pinGnd.net) {
        // Debugging why power is missing
        if (Math.random() < 0.05) {
            console.warn(`LM555 [${this.id}] Missing Power Connections:`, 
                !pinVcc.net ? 'VCC(p8) Disconnected' : 'VCC OK',
                !pinGnd.net ? 'GND(p1) Disconnected' : 'GND OK'
            );
        }
        return; 
    }
    const vcc = pinVcc.getVoltage();
    if (vcc < 2) return; 

    // 2. Identify C (Capacitance)
    let C = 0;
    const timingNets = new Set([pinTrig.net, pinThresh.net].filter(n => n));
    
    timingNets.forEach(net => {
        net.pins.forEach(p => {
            if (p.component && p.component !== this) {
                if (p.component.capacitance) {
                    C += p.component.capacitance;
                }
            }
        });
    });

    if (C === 0) C = 10e-6; // Robust Default: 10uF

    // 3. Identify Resistances (R1, R2)
    let R_pullup = 0; // VCC -> Disch (R1)
    let R_inter = 0;  // Disch -> Trig/Thresh (R2)
    
    if (pinDisch.net) {
        pinDisch.net.pins.forEach(p => {
            if (p.component && p.component !== this && p.component.resistance) {
                const res = p.component;
                const otherPin = p.id === 'a' ? res.getPin('b') : res.getPin('a');
                if (otherPin.net) {
                    if (otherPin.net === pinVcc.net) {
                        R_pullup += res.resistance;
                    } else if (timingNets.has(otherPin.net)) {
                        R_inter += res.resistance;
                    }
                }
            }
        });
    }

    if (R_pullup === 0) R_pullup = 10000; // Default 10k
    if (R_inter === 0) R_inter = 1000;    // Default 1k

    // 4. Calculate vCap (Physics Step)
    if (this.vCap === undefined) this.vCap = 0;

    let targetV, tau;
    if (this.latch) {
        // Output High -> Discharge Open -> Charge towards VCC
        targetV = vcc;
        tau = (R_pullup + R_inter) * C;
    } else {
        // Output Low -> Discharge Low -> Discharge C through R2
        targetV = 0.1; // Saturation
        tau = R_inter * C;
    }
    
    if (tau < 1e-9) tau = 1e-9;
    const alpha = 1 - Math.exp(-dt / tau);
    this.vCap += (targetV - this.vCap) * alpha;

    // Debug
    if (Math.random() < 0.005) {
        // console.log(`LM555 [${this.id}] C=${C.toExponential(1)} vC=${this.vCap.toFixed(2)}`);
    }
  }

  computeOutputs() {
    const pinVcc = this.getSemPin('vcc');
    const pinReset = this.getSemPin('reset');
    
    // Safety check if VCC pin is valid
    if (!pinVcc) return;
    const vcc = pinVcc.getVoltage();

    // 5. Drive Nets (Injecting analog voltage)
    if (this.vCap !== undefined) {
         const pinTrig = this.getSemPin('trig');
         const pinThresh = this.getSemPin('thresh');
         
         if (pinTrig.net) {
             pinTrig.net.voltage = this.vCap;
             pinTrig.net.isFixed = true; 
         }
         if (pinThresh.net) {
             pinThresh.net.voltage = this.vCap;
             pinThresh.net.isFixed = true; 
         }
    }

    // Logic Inputs
    let voltageT = this.vCap !== undefined ? this.vCap : this.getSemPin('thresh').getVoltage();
    let voltageTr = this.vCap !== undefined ? this.vCap : this.getSemPin('trig').getVoltage();
    const resetVolts = pinReset.net ? pinReset.getVoltage() : vcc;

    // Comparators / Flip-Flop
    if (resetVolts < 0.8) {
      this.latch = false;
    } else {
      if (voltageTr < (vcc / 3.0)) {
        this.latch = true;
      } else if (voltageT > (vcc * 2.0 / 3.0)) {
        this.latch = false;
      }
    }

    // Output Pin 3
    const outPin = this.getSemPin('out');
    if (outPin.net) {
        // Active Drive
        outPin.net.voltage = this.latch ? (vcc - 1.5) : 0.1;
        outPin.net.isFixed = true;
    }

    // Discharge Pin 7
    const dischPin = this.getSemPin('disch');
    if (!this.latch && dischPin.net) {
      // Aggressive sink
      dischPin.net.voltage = 0.1;
      dischPin.net.isFixed = true; 
    }
  }

  reset() {
    this.latch = false;
    this.vCap = 0;
  }
}
