import { Component } from '../../core/Component.js';

export class IC74xx extends Component {
  constructor(id, modelNumber, numPins = 14) {
    super(id);
    this.modelNumber = modelNumber;
    this.metadata = { name: `74${modelNumber}`, description: 'TTL Logic Chip' };
    this.numPins = numPins;
    this.width = (numPins / 2) * 20; // Visual width based on pins
    this.height = 50; 
    
    // Power Pins (Standard: p7=GND, p14=VCC for 14-pin chips)
    this.gndPin = `p${numPins / 2}`;
    this.vccPin = `p${numPins}`;

    for (let i = 1; i <= numPins; i++) {
        this.addPin(`p${i}`, 'io');
    }
  }

  // Power check (More permissive for simulation sagging)
  isPowered() {
    const vcc = this.getPin(this.vccPin).getVoltage();
    const gnd = this.getPin(this.gndPin).getVoltage();
    // Debug only
    if (this.modelNumber === '08' && Math.random() < 0.01) {
        console.log(`IC7408 Power Check: VCC=${vcc.toFixed(2)}V, GND=${gnd.toFixed(2)}V`);
    }
    return vcc > 3.5 && gnd < 1.5;
  }

  // Helper to read logic level (Threshold approx 0.8V - 2.0V)
  getLogicState(pinId) {
    if (!this.isPowered()) return 0;
    const v = this.getPin(pinId).getVoltage();
    return v > 1.8 ? 1 : 0; 
  }

  // Helper to output digital level
  setLogicState(pinId, state) {
    if (!this.isPowered()) return;
    const pin = this.getPin(pinId);
    if (pin.net) {
      // Force digital driving state
      pin.net.voltage = state === 1 ? 5 : 0;
      pin.net.isFixed = true; 
    }
  }
}
