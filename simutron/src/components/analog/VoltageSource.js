import { Component } from '../../core/Component.js';

export class VoltageSource extends Component {
  constructor(id, voltage = 5) {
    super(id);
    this.voltage = voltage;
    this.metadata = { name: 'Voltage Source', description: `${voltage}V DC Source` };
    
    // Pin 0: Positive (VCC)
    // Pin 1: Negative (GND reference, usually)
    this.addPin('pos', 'output'); 
    this.addPin('neg', 'input');  // Often connected to ground
  }

  computeOutputs() {
    const posPin = this.getPin('pos');
    const negPin = this.getPin('neg');

    // If negative pin is connected, use its voltage as reference
    const refVoltage = negPin.getVoltage();
    
    if (posPin.net) {
      // Force the net to reference + voltage (Override passive locks)
      posPin.net.voltage = refVoltage + this.voltage;
      posPin.net.isFixed = true; 
    }
  }
}
