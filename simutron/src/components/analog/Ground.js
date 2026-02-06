import { Component } from '../../core/Component.js';

export class Ground extends Component {
  constructor(id) {
    super(id);
    this.metadata = { name: 'Ground', description: '0V Reference' };
    this.addPin('gnd', 'bidirectional');
  }

  computeOutputs() {
    const pin = this.getPin('gnd');
    if (pin.net) {
      pin.net.voltage = 0;
      pin.net.isFixed = true;
      pin.net.ground = true; // Helper for UI
    }
  }
}
