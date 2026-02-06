import { Component } from '../../core/Component.js';

export class LM555 extends Component {
  constructor(id) {
    super(id);
    console.log(`LM555 Constructor called for ${id}. Logic Version: 2.5 (Fixed)`);
    this.metadata = { name: 'LM555', description: 'Precision Timer' };
    this.width = 140; 
    this.height = 50;

    // Standard 8-pin DIP
    // 1: GND, 2: Trigger, 3: Output, 4: Reset
    // 5: Control, 6: Threshold, 7: Discharge, 8: VCC
    this.addPin('gnd', 'input');      // Pin 1
    this.addPin('trig', 'input');     // Pin 2
    this.addPin('out', 'output');     // Pin 3
    this.addPin('reset', 'input');    // Pin 4
    this.addPin('cv', 'io');          // Pin 5
    this.addPin('thresh', 'input');   // Pin 6
    this.addPin('disch', 'io');       // Pin 7 (Open collector)
    this.addPin('vcc', 'input');      // Pin 8

    this.latch = false;
  }

  update(dt) {
    // 555 Timer "Analogue" Simulation Helper
    // The digital engine cannot naturally solve the RC charging curve.
    // We sniff the connected components and simulate vCap internally.
    
    const pinTrig = this.getPin('trig');
    const pinThresh = this.getPin('thresh');
    const pinDisch = this.getPin('disch');
    const pinVcc = this.getPin('vcc');
    const pinGnd = this.getPin('gnd');

    // 1. Basic Power Check
    if (!pinVcc.net || !pinGnd.net) {
        console.warn('LM555: No Power Nets detected');
        return; 
    }
    const vcc = pinVcc.getVoltage();
    //console.log(`LM555 Input VCC: ${vcc}`);
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

    if (C === 0) C = 10e-6; // Robust Default: 10uF so user sees SOMETHING (slow blink)

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

    // Debug every ~1 sec (assuming 60fps called in loop or physics tick)
    if (Math.random() < 0.005) {
        console.log(`LM555 [${this.id}] C=${C.toExponential(1)} R1=${R_pullup} R2=${R_inter} vC=${this.vCap.toFixed(2)}`);
    }
  }

  computeOutputs() {
    const vcc = this.getPin('vcc').getVoltage();
    const pinReset = this.getPin('reset');
    
    // 5. Drive Nets (Injecting analog voltage)
    if (this.vCap !== undefined) {
         const pinTrig = this.getPin('trig');
         const pinThresh = this.getPin('thresh');
         
         // FORCE voltage on Trigger Net (Override Resistor's digital high)
         if (pinTrig.net) {
             pinTrig.net.setVoltage(this.vCap);
         }
         // FORCE voltage on Threshold Net
         if (pinThresh.net) {
            pinThresh.net.setVoltage(this.vCap);
         }
    }

    // Logic Inputs
    let voltageT = this.vCap !== undefined ? this.vCap : this.getPin('thresh').getVoltage();
    let voltageTr = this.vCap !== undefined ? this.vCap : this.getPin('trig').getVoltage();
    const resetVolts = pinReset.net ? pinReset.getVoltage() : vcc;

    // Comparators / Flip-Flop
    if (resetVolts < 0.8) {
      this.latch = false;
      // Do not force vCap=0. Let R2 discharge it naturally.
    } else {
      if (voltageTr < (vcc / 3.0)) {
        this.latch = true;
      } else if (voltageT > (vcc * 2.0 / 3.0)) {
        this.latch = false;
      }
    }

    // Output Pin 3
    const outPin = this.getPin('out');
    if (outPin.net) {
        outPin.net.setVoltage(this.latch ? (vcc - 1.5) : 0.1);
    }

    // Discharge Pin 7
    const dischPin = this.getPin('disch');
    if (!this.latch && dischPin.net) {
      dischPin.net.setVoltage(0.1); 
    }
  }

  reset() {
    this.latch = false;
    this.vCap = 0;
  }
}
