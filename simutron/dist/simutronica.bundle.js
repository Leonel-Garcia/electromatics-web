(function() {
  "use strict";
  class Engine {
    constructor() {
      this.components = /* @__PURE__ */ new Set();
      this.nets = /* @__PURE__ */ new Set();
      this.time = 0;
      this.isRunning = false;
      this.animationFrameId = null;
      this.updatesPerSecond = 100;
      this.lastTime = 0;
      this.accumulator = 0;
    }
    addComponent(component) {
      this.components.add(component);
      component.engine = this;
    }
    removeComponent(component) {
      this.components.delete(component);
      component.engine = null;
    }
    addNet(net) {
      this.nets.add(net);
    }
    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
    stop() {
      this.isRunning = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      for (const component of this.components) {
        if (component.reset) {
          component.reset();
        }
      }
      for (const net of this.nets) {
        net.voltage = 0;
        net.isFixed = false;
      }
      this.time = 0;
      this.lastTime = 0;
      this.accumulator = 0;
    }
    step(dt) {
      for (const component of this.components) {
        component.update(dt);
      }
      this.solveNetwork();
      this.time += dt;
    }
    solveNetwork() {
      for (const net of this.nets) {
        net.voltage = 0;
        net.isFixed = false;
      }
      const MAX_PASSES = 10;
      for (let i = 0; i < MAX_PASSES; i++) {
        let changed = false;
        for (const component of this.components) {
          const oldVoltages = Array.from(component.pins.values()).map((p) => p.getVoltage());
          component.computeOutputs();
          const newVoltages = Array.from(component.pins.values()).map((p) => p.getVoltage());
          if (!changed) {
            for (let j = 0; j < oldVoltages.length; j++) {
              if (Math.abs(oldVoltages[j] - newVoltages[j]) > 0.01) {
                changed = true;
                break;
              }
            }
          }
        }
        if (!changed) break;
      }
    }
    loop(timestamp) {
      if (!this.isRunning) return;
      if (!this.lastTime) this.lastTime = timestamp;
      const elapsed = (timestamp - this.lastTime) / 1e3;
      this.lastTime = timestamp;
      const fixedDt = 1e-4;
      this.accumulator += elapsed;
      if (this.accumulator > 0.1) this.accumulator = 0.1;
      while (this.accumulator >= fixedDt) {
        this.step(fixedDt);
        this.accumulator -= fixedDt;
      }
      this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }
  }
  class Net {
    constructor(id) {
      this.id = id;
      this.pins = /* @__PURE__ */ new Set();
      this.voltage = 0;
      this.isFixed = false;
      this.color = "#111";
    }
    addPin(pin) {
      this.pins.add(pin);
      pin.net = this;
    }
    removePin(pin) {
      this.pins.delete(pin);
      if (pin.net === this) pin.net = null;
    }
    setVoltage(v) {
      if (this.isFixed) return;
      this.voltage = v;
    }
  }
  const GRID_SIZE = 20;
  const BB_START_X = 60;
  const BB_START_Y = 80;
  const ROW_COUNT = 63;
  class Breadboard {
    constructor(engine) {
      this.engine = engine;
      this.holes = /* @__PURE__ */ new Map();
      this.setupConnectivity();
    }
    setupConnectivity() {
      this.holes.clear();
      for (let r = 1; r <= ROW_COUNT; r++) {
        const net1 = new Net(`Row-${r}-Left`);
        this.engine.addNet(net1);
        ["a", "b", "c", "d", "e"].forEach((c) => this.holes.set(`${r},${c}`, net1));
        const net2 = new Net(`Row-${r}-Right`);
        this.engine.addNet(net2);
        ["f", "g", "h", "i", "j"].forEach((c) => this.holes.set(`${r},${c}`, net2));
      }
      const vccNet = new Net("Bus-VCC");
      vccNet.color = "#ff0000";
      const gndNet = new Net("Bus-GND");
      gndNet.color = "#0000ff";
      this.engine.addNet(vccNet);
      this.engine.addNet(gndNet);
      for (let r = 1; r <= ROW_COUNT; r++) {
        this.holes.set(`${r},top-pos`, vccNet);
        this.holes.set(`${r},top-neg`, gndNet);
        this.holes.set(`${r},bot-pos`, vccNet);
        this.holes.set(`${r},bot-neg`, gndNet);
      }
    }
    // Helper to re-establish pristine state
    resetConnectivity() {
      const oldNets = Array.from(this.holes.values());
      oldNets.forEach((n) => this.engine.nets.delete(n));
      this.setupConnectivity();
    }
    getNetAt(row, col) {
      return this.holes.get(`${row},${col}`);
    }
    getHoleAt(x, y) {
      const checkDist = 15;
      for (let r = 1; r <= ROW_COUNT; r++) {
        const hx = BB_START_X + (r - 1) * GRID_SIZE;
        if (Math.abs(x - hx) > checkDist) continue;
        for (let i = 0; i < 5; i++) {
          const hy = BB_START_Y + i * GRID_SIZE;
          const d = Math.sqrt((x - hx) ** 2 + (y - hy) ** 2);
          if (d <= checkDist) return { r, c: ["a", "b", "c", "d", "e"][i] };
        }
        const yF = BB_START_Y + 7 * GRID_SIZE;
        for (let i = 0; i < 5; i++) {
          const hy = yF + i * GRID_SIZE;
          const d = Math.sqrt((x - hx) ** 2 + (y - hy) ** 2);
          if (d <= checkDist) return { r, c: ["f", "g", "h", "i", "j"][i] };
        }
        const railYs = [
          { y: BB_START_Y - 3 * GRID_SIZE, c: "top-neg" },
          { y: BB_START_Y - 2 * GRID_SIZE, c: "top-pos" },
          { y: BB_START_Y + 13 * GRID_SIZE, c: "bot-pos" },
          { y: BB_START_Y + 14 * GRID_SIZE, c: "bot-neg" }
        ];
        for (const rail of railYs) {
          const d = Math.sqrt((x - hx) ** 2 + (y - rail.y) ** 2);
          if (d <= checkDist) return { r, c: rail.c };
        }
      }
      return null;
    }
  }
  class Renderer {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas.getContext("2d");
      window.addEventListener("resize", () => this.resize());
      this.resize();
    }
    resize() {
      this.canvas.width = this.canvas.parentElement.clientWidth;
      this.canvas.height = this.canvas.parentElement.clientHeight;
      this.draw();
    }
    draw() {
      const { ctx, canvas } = this;
      const width = canvas.width;
      const height = canvas.height;
      ctx.fillStyle = "#2d2d30";
      ctx.fillRect(0, 0, width, height);
      const holeSpacing = GRID_SIZE;
      const boardWidth = ROW_COUNT * holeSpacing + 80;
      ctx.fillStyle = "#fdfcf0";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 10;
      const boardHeightUnits = 21;
      ctx.fillRect(BB_START_X - 20, BB_START_Y - 5 * GRID_SIZE, boardWidth, boardHeightUnits * GRID_SIZE);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#e0e0e0";
      const grooveCenter = BB_START_Y + (4 * GRID_SIZE + 7 * GRID_SIZE) / 2;
      ctx.fillRect(BB_START_X - 20, grooveCenter - 6, boardWidth, 12);
      ctx.font = "10px monospace";
      ctx.fillStyle = "#aaa";
      ctx.textAlign = "center";
      for (let c = 0; c < ROW_COUNT; c++) {
        const x = BB_START_X + c * holeSpacing;
        const rNum = c + 1;
        if (rNum % 5 === 0 || rNum === 1) {
          ctx.fillText(rNum, x, BB_START_Y - 4.2 * GRID_SIZE);
        }
        this.drawHole(x, BB_START_Y - 3 * GRID_SIZE);
        this.drawHole(x, BB_START_Y - 2 * GRID_SIZE);
        for (let r = 0; r < 5; r++) {
          this.drawHole(x, BB_START_Y + r * GRID_SIZE);
        }
        const yF = BB_START_Y + 7 * GRID_SIZE;
        for (let r = 0; r < 5; r++) {
          this.drawHole(x, yF + r * GRID_SIZE);
        }
        const yBot2 = BB_START_Y + 13 * GRID_SIZE;
        this.drawHole(x, yBot2);
        this.drawHole(x, yBot2 + GRID_SIZE);
      }
      const w = boardWidth - 60;
      this.drawRailLine(BB_START_X, BB_START_Y - 3.4 * GRID_SIZE, w, "#00f");
      this.drawRailLine(BB_START_X, BB_START_Y - 1.6 * GRID_SIZE, w, "#f00");
      const yBot = BB_START_Y + 13 * GRID_SIZE;
      this.drawRailLine(BB_START_X, yBot - 0.4 * GRID_SIZE, w, "#f00");
      this.drawRailLine(BB_START_X, yBot + 1.4 * GRID_SIZE, w, "#00f");
    }
    drawHole(x, y) {
      this.ctx.beginPath();
      this.ctx.fillStyle = "#111";
      this.ctx.rect(x - 2, y - 2, 4, 4);
      this.ctx.fill();
      this.ctx.fillStyle = "#666";
      this.ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    drawRailLine(x, y, w, color) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + w - 100, y);
      this.ctx.stroke();
    }
  }
  class ChipFactory {
    createVisual(component) {
      const el = document.createElement("div");
      el.className = "sim-component";
      el.id = `view-${component.id}`;
      el.style.left = `${component.x}px`;
      el.style.top = `${component.y}px`;
      const name = component.metadata.name;
      if (name.startsWith("74") || name.startsWith("LM")) {
        return this.createDIPChip(component, el);
      } else if (name === "LED") {
        return this.createLED(component, el);
      } else if (name === "Push Button") {
        return this.createButton(component, el);
      } else if (name === "Voltage Source") {
        return this.createBattery(component, el);
      } else if (name === "Ground") {
        return this.createGround(component, el);
      } else if (name === "Resistor") {
        return this.createResistor(component, el);
      } else if (name === "Capacitor") {
        return this.createCapacitor(component, el);
      } else if (name === "7-Segment") {
        return this.createSevenSegment(component, el);
      } else if (name === "Signal Generator") {
        return this.createSignalGenerator(component, el);
      } else if (name === "Voltimetro") {
        return this.createVoltmeter(component, el);
      } else if (name === "Amperimetro") {
        return this.createAmmeter(component, el);
      } else if (name === "Osciloscopio") {
        return this.createOscilloscope(component, el);
      }
      el.style.width = "100px";
      el.style.height = "50px";
      el.style.background = "#444";
      el.style.color = "#fff";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.border = "1px solid #666";
      el.textContent = name;
      return el;
    }
    createDIPChip(comp, el) {
      const pinCount = comp.pins.length;
      const is8Pin = pinCount <= 8;
      const is16Pin = pinCount === 16;
      const unitsWide = is8Pin ? 4 : is16Pin ? 8 : 7;
      const chipWidth = unitsWide * GRID_SIZE;
      el.style.width = `${chipWidth}px`;
      el.style.height = "46px";
      el.style.background = "#1a1a1a";
      el.style.borderRadius = "2px";
      el.style.boxShadow = "1px 1px 4px rgba(0,0,0,0.6)";
      const text = document.createElement("div");
      text.textContent = comp.metadata.name;
      text.style.color = "#ccc";
      text.style.fontFamily = '"JetBrains Mono", monospace';
      text.style.fontSize = "11px";
      text.style.textAlign = "center";
      text.style.marginTop = "15px";
      text.style.opacity = "0.9";
      el.appendChild(text);
      const notch = document.createElement("div");
      notch.style.width = "10px";
      notch.style.height = "10px";
      notch.style.background = "#000";
      notch.style.borderRadius = "50%";
      notch.style.position = "absolute";
      notch.style.left = "-5px";
      notch.style.top = "18px";
      el.appendChild(notch);
      const sideCount = pinCount / 2;
      for (let i = 0; i < sideCount; i++) {
        const x = 10 + i * GRID_SIZE;
        this.addLeg(el, x, 53, `p${i + 1}`);
        this.addLeg(el, x, -7, `p${pinCount - i}`);
      }
      return el;
    }
    addLeg(parent, x, y, id) {
      const leg = document.createElement("div");
      leg.className = "sim-pin";
      leg.dataset.pinId = id;
      leg.style.width = "6px";
      leg.style.height = "6px";
      leg.style.background = "linear-gradient(to right, #999, #eee, #999)";
      leg.style.position = "absolute";
      leg.style.left = `${x}px`;
      leg.style.top = `${y}px`;
      parent.appendChild(leg);
    }
    createButton(comp, el) {
      el.style.width = "40px";
      el.style.height = "40px";
      el.style.background = "#333";
      el.style.borderRadius = "4px";
      const btn = document.createElement("div");
      btn.style.width = "30px";
      btn.style.height = "30px";
      btn.style.background = "#c00";
      btn.style.borderRadius = "50%";
      btn.style.margin = "5px";
      btn.style.boxShadow = "0 3px 0 #800";
      btn.style.cursor = "pointer";
      const triggerUpdate = () => {
        if (comp.engine) {
          comp.engine.solveNetwork();
          comp.engine.components.forEach((c) => {
            if (c.update) c.update(0);
          });
        }
      };
      btn.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        btn.style.transform = "translateY(2px)";
        btn.style.boxShadow = "0 1px 0 #800";
        comp.press();
        triggerUpdate();
      });
      btn.addEventListener("mouseup", (e) => {
        e.stopPropagation();
        btn.style.transform = "translateY(0)";
        btn.style.boxShadow = "0 3px 0 #800";
        comp.release();
        triggerUpdate();
      });
      btn.addEventListener("mouseleave", () => {
        if (comp.isPressed) {
          btn.style.transform = "translateY(0)";
          btn.style.boxShadow = "0 3px 0 #800";
          comp.release();
          triggerUpdate();
        }
      });
      el.appendChild(btn);
      const legL = document.createElement("div");
      legL.style.cssText = "position:absolute; left:-16px; top:14px; width:16px; height:12px; background:linear-gradient(#888, #eee, #888); border-radius: 4px 0 0 4px; border: 1px solid #555;";
      el.appendChild(legL);
      const legR = document.createElement("div");
      legR.style.cssText = "position:absolute; right:-16px; top:14px; width:16px; height:12px; background:linear-gradient(#888, #eee, #888); border-radius: 0 4px 4px 0; border: 1px solid #555;";
      el.appendChild(legR);
      this.addLeg(el, -13, 17, "a");
      this.addLeg(el, 47, 17, "b");
      return el;
    }
    createBattery(comp, el) {
      el.style.width = "42px";
      el.style.height = "44px";
      el.style.background = "#333";
      el.style.border = "2px solid #888";
      el.style.borderRadius = "4px";
      el.style.boxShadow = "2px 2px 4px rgba(0,0,0,0.5)";
      const label = document.createElement("div");
      label.textContent = `${comp.voltage}V`;
      label.id = `label-${comp.id}`;
      label.style.color = "#fff";
      label.style.textAlign = "center";
      label.style.marginTop = "12px";
      label.style.fontSize = "12px";
      label.style.fontWeight = "bold";
      label.style.fontFamily = "monospace";
      label.style.pointerEvents = "none";
      el.appendChild(label);
      const plus = document.createElement("div");
      plus.textContent = "+";
      plus.style.position = "absolute";
      plus.style.right = "4px";
      plus.style.bottom = "4px";
      plus.style.color = "#f55";
      plus.style.fontWeight = "bold";
      plus.style.fontSize = "14px";
      plus.style.pointerEvents = "none";
      el.appendChild(plus);
      const minus = document.createElement("div");
      minus.textContent = "-";
      minus.style.position = "absolute";
      minus.style.right = "4px";
      minus.style.top = "2px";
      minus.style.color = "#5ae";
      minus.style.fontWeight = "bold";
      minus.style.fontSize = "16px";
      minus.style.pointerEvents = "none";
      el.appendChild(minus);
      const leg1 = document.createElement("div");
      leg1.style.position = "absolute";
      leg1.style.left = "-12px";
      leg1.style.top = "10px";
      leg1.style.width = "12px";
      leg1.style.height = "4px";
      leg1.style.background = "#ccc";
      leg1.style.border = "1px solid #999";
      leg1.style.pointerEvents = "none";
      el.appendChild(leg1);
      const leg2 = document.createElement("div");
      leg2.style.position = "absolute";
      leg2.style.left = "-12px";
      leg2.style.top = "30px";
      leg2.style.width = "12px";
      leg2.style.height = "4px";
      leg2.style.background = "#ccc";
      leg2.style.border = "1px solid #999";
      leg2.style.pointerEvents = "none";
      el.appendChild(leg2);
      this.addLeg(el, -12, 10 - 1, "neg");
      this.addLeg(el, -12, 30 - 1, "pos");
      return el;
    }
    createResistor(comp, el) {
      el.style.width = "86px";
      el.style.height = "14px";
      const wire = document.createElement("div");
      wire.style.position = "absolute";
      wire.style.left = "3px";
      wire.style.top = "6px";
      wire.style.width = "80px";
      wire.style.height = "2px";
      wire.style.background = "#aaa";
      el.appendChild(wire);
      const body = document.createElement("div");
      body.style.position = "absolute";
      body.style.left = "23px";
      body.style.top = "0px";
      body.style.width = "40px";
      body.style.height = "14px";
      body.style.background = "#f5e1a4";
      body.style.borderRadius = "4px";
      body.style.border = "1px solid #d4c184";
      body.style.boxShadow = "1px 1px 2px rgba(0,0,0,0.3)";
      el.appendChild(body);
      const bands = ["brown", "black", "red", "gold"];
      bands.forEach((color, i) => {
        const band = document.createElement("div");
        band.style.position = "absolute";
        band.style.top = "0";
        band.style.left = `${8 + i * 8}px`;
        band.style.width = "3px";
        band.style.height = "100%";
        band.style.background = color;
        body.appendChild(band);
      });
      this.addLeg(el, 0, 4, "a");
      this.addLeg(el, 80, 4, "b");
      return el;
    }
    createCapacitor(comp, el) {
      el.style.width = "30px";
      el.style.height = "62px";
      el.style.background = "transparent";
      el.innerHTML = "";
      const body = document.createElement("div");
      body.style.position = "absolute";
      body.style.left = "0";
      body.style.top = "0";
      body.style.width = "30px";
      body.style.height = "42px";
      body.style.background = "linear-gradient(135deg, #0984e3, #1e3799)";
      body.style.borderRadius = "5px 5px 3px 3px";
      body.style.border = "1px solid #000";
      body.style.boxShadow = "2px 2px 5px rgba(0,0,0,0.4)";
      body.style.display = "flex";
      body.style.flexDirection = "column";
      body.style.alignItems = "center";
      body.style.justifyContent = "center";
      el.appendChild(body);
      const label = document.createElement("div");
      const uF = Math.round(comp.capacitance * 1e6);
      label.innerHTML = `
        <div style="font-size: 9px; font-weight: 800; color: #fff; line-height: 1.1; text-shadow: 0 1px 2px #000;">${uF}µF</div>
        <div style="font-size: 7px; font-weight: 600; color: rgba(255,255,255,0.9);">${comp.maxVoltage}V</div>
    `;
      label.style.fontFamily = '"Inter", sans-serif';
      label.style.textAlign = "center";
      label.id = `cap-label-${comp.id}`;
      body.appendChild(label);
      const plus = document.createElement("div");
      plus.textContent = "+";
      plus.style.position = "absolute";
      plus.style.left = "4px";
      plus.style.bottom = "2px";
      plus.style.fontSize = "12px";
      plus.style.color = "#ffaaaa";
      plus.style.fontWeight = "bold";
      body.appendChild(plus);
      const minus = document.createElement("div");
      minus.textContent = "-";
      minus.style.position = "absolute";
      minus.style.right = "4px";
      minus.style.bottom = "2px";
      minus.style.fontSize = "16px";
      minus.style.color = "#ffffff";
      minus.style.fontWeight = "bold";
      body.appendChild(minus);
      const legLeft = document.createElement("div");
      legLeft.style.position = "absolute";
      legLeft.style.left = "4px";
      legLeft.style.top = "42px";
      legLeft.style.width = "2px";
      legLeft.style.height = "16px";
      legLeft.style.background = "linear-gradient(to right, #888, #ccc, #888)";
      el.appendChild(legLeft);
      const legRight = document.createElement("div");
      legRight.style.position = "absolute";
      legRight.style.left = "24px";
      legRight.style.top = "42px";
      legRight.style.width = "2px";
      legRight.style.height = "16px";
      legRight.style.background = "linear-gradient(to right, #888, #ccc, #888)";
      el.appendChild(legRight);
      this.addLeg(el, 2, 54, "pos");
      this.addLeg(el, 22, 54, "neg");
      return el;
    }
    createSevenSegment(comp, el) {
      el.style.width = "60px";
      el.style.height = "85px";
      el.style.background = "#1a1a1a";
      el.style.borderRadius = "3px";
      el.style.border = "1px solid #000";
      el.style.boxShadow = "inset 0 0 10px #000, 2px 2px 5px rgba(0,0,0,0.5)";
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.innerHTML = "";
      const display = document.createElement("div");
      display.style.width = "42px";
      display.style.height = "62px";
      display.style.position = "relative";
      display.style.background = "#050505";
      display.style.borderRadius = "2px";
      display.style.border = "1px solid #333";
      el.appendChild(display);
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
        const seg = document.createElement("div");
        seg.id = `seg-${comp.id}-${id}`;
        seg.style.position = "absolute";
        seg.style.top = `${s.t}px`;
        seg.style.left = `${s.l}px`;
        seg.style.width = `${s.w}px`;
        seg.style.height = `${s.h}px`;
        seg.style.background = "rgba(255, 0, 0, 0.05)";
        if (id === "dp") {
          seg.style.borderRadius = "50%";
        } else {
          seg.style.borderRadius = "2px";
        }
        seg.style.border = "1px solid rgba(255, 0, 0, 0.02)";
        seg.style.transition = "all 0.1s ease";
        display.appendChild(seg);
      }
      const pinIds = ["e", "d", "vcc1", "c", "dp", "b", "a", "vcc2", "f", "g"];
      const labels = ["e", "d", "V", "c", "dp", "b", "a", "V", "f", "g"];
      for (let i = 0; i < 5; i++) {
        const x = 10 + i * GRID_SIZE;
        this.addLeg(el, x, 90, pinIds[i]);
        const lblB = document.createElement("div");
        lblB.textContent = labels[i];
        lblB.style.position = "absolute";
        lblB.style.left = `${x - 2}px`;
        lblB.style.bottom = "2px";
        lblB.style.fontSize = "8px";
        lblB.style.color = "#777";
        lblB.style.fontFamily = "monospace";
        el.appendChild(lblB);
        this.addLeg(el, x, -12, pinIds[9 - i]);
        const lblT = document.createElement("div");
        lblT.textContent = labels[9 - i];
        lblT.style.position = "absolute";
        lblT.style.left = `${x - 2}px`;
        lblT.style.top = "2px";
        lblT.style.fontSize = "8px";
        lblT.style.color = "#777";
        lblT.style.fontFamily = "monospace";
        el.appendChild(lblT);
      }
      return el;
    }
    createGround(comp, el) {
      el.style.width = "30px";
      el.style.height = "30px";
      el.style.display = "flex";
      el.style.justifyContent = "center";
      el.innerHTML = `
        <svg width="30" height="30" viewBox="0 0 30 30" style="overflow:visible; pointer-events:none;">
            <!-- Vertical Connection -->
            <line x1="15" y1="0" x2="15" y2="12" stroke="#e0e0e0" stroke-width="2"/>
            <!-- 3 Horizontal Lines -->
            <line x1="5" y1="12" x2="25" y2="12" stroke="#e0e0e0" stroke-width="2"/>
            <line x1="10" y1="17" x2="20" y2="17" stroke="#e0e0e0" stroke-width="2"/>
            <line x1="13" y1="22" x2="17" y2="22" stroke="#e0e0e0" stroke-width="2"/>
        </svg>
      `;
      this.addLeg(el, 14, 0, "gnd");
      return el;
    }
    createSignalGenerator(comp, el) {
      el.style.width = "60px";
      el.style.height = "50px";
      el.style.background = "#2c3e50";
      el.style.border = "2px solid #95a5a6";
      el.style.borderRadius = "6px";
      el.style.boxShadow = "3px 3px 6px rgba(0,0,0,0.4)";
      const lcd = document.createElement("div");
      lcd.id = `lcd-${comp.id}`;
      lcd.style.width = "44px";
      lcd.style.height = "24px";
      lcd.style.background = "#dff9fb";
      lcd.style.margin = "6px auto";
      lcd.style.borderRadius = "3px";
      lcd.style.border = "1px solid #7ed6df";
      lcd.style.display = "flex";
      lcd.style.alignItems = "center";
      lcd.style.justifyContent = "center";
      lcd.style.overflow = "hidden";
      const waveIcon = document.createElement("div");
      waveIcon.id = `wave-icon-${comp.id}`;
      waveIcon.style.fontSize = "16px";
      waveIcon.style.color = "#130f40";
      waveIcon.textContent = comp.waveform === "sine" ? "∿" : "⎍";
      waveIcon.style.pointerEvents = "none";
      lcd.appendChild(waveIcon);
      lcd.style.pointerEvents = "none";
      el.appendChild(lcd);
      const label = document.createElement("div");
      label.textContent = "Sig Gen";
      label.style.color = "#fff";
      label.style.fontSize = "8px";
      label.style.textAlign = "center";
      label.style.fontWeight = "bold";
      label.style.textShadow = "0 1px 1px rgba(0,0,0,0.9)";
      label.style.fontFamily = '"Inter", sans-serif';
      label.style.pointerEvents = "none";
      el.appendChild(label);
      const tOut = document.createElement("div");
      tOut.style.cssText = "position:absolute; bottom:5px; left:15px; width:8px; height:8px; border-radius:50%; background:#f1c40f; border:1px solid #000; box-shadow:inset 0 0 4px #000;";
      el.appendChild(tOut);
      const tCom = document.createElement("div");
      tCom.style.cssText = "position:absolute; bottom:5px; right:15px; width:8px; height:8px; border-radius:50%; background:#2c3e50; border:1px solid #000; box-shadow:inset 0 0 4px #000;";
      el.appendChild(tCom);
      this.createProbeTip(comp, "out", "#f1c40f");
      this.createProbeTip(comp, "com", "#2c3e50");
      return el;
    }
    createVoltmeter(comp, el) {
      el.style.width = "80px";
      el.style.height = "60px";
      el.style.background = "#f39c12";
      el.style.border = "2px solid #d35400";
      el.style.borderRadius = "8px";
      el.style.boxShadow = "5px 5px 15px rgba(0,0,0,0.5)";
      el.style.cursor = "grab";
      el.style.zIndex = "50";
      const display = document.createElement("div");
      display.id = `meter-val-${comp.id}`;
      display.style.width = "70px";
      display.style.height = "30px";
      display.style.background = "#000";
      display.style.margin = "8px auto 4px auto";
      display.style.color = "#0f0";
      display.style.fontFamily = '"Courier New", monospace';
      display.style.textAlign = "center";
      display.style.lineHeight = "30px";
      display.style.fontSize = "18px";
      display.style.fontWeight = "bold";
      display.style.textShadow = "0 0 8px #0f0";
      display.style.border = "1px solid #444";
      display.textContent = "0.00";
      el.appendChild(display);
      const label = document.createElement("div");
      label.textContent = "MULTIMETER";
      label.style.fontSize = "9px";
      label.style.fontWeight = "bold";
      label.style.textAlign = "center";
      label.style.color = "#fff";
      el.appendChild(label);
      const tPos = document.createElement("div");
      tPos.className = "internal-terminal";
      tPos.style.cssText = "position:absolute; bottom:5px; left:20px; width:8px; height:8px; border-radius:50%; background:#c0392b; border:1px solid #000;";
      el.appendChild(tPos);
      const tNeg = document.createElement("div");
      tNeg.className = "internal-terminal";
      tNeg.style.cssText = "position:absolute; bottom:5px; right:20px; width:8px; height:8px; border-radius:50%; background:#222; border:1px solid #000;";
      el.appendChild(tNeg);
      this.createProbeTip(comp, "pos", "#e74c3c");
      this.createProbeTip(comp, "neg", "#2c3e50");
      return el;
    }
    createProbeTip(comp, type, color) {
      const probe = document.createElement("div");
      probe.id = `probe-${comp.id}-${type}`;
      probe.className = "sim-probe-tip sim-pin";
      probe.dataset.compId = comp.id;
      probe.dataset.pinId = type;
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
      const grip = document.createElement("div");
      grip.style.cssText = "width:100%; height:15px; margin-top:5px; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2) 2px, transparent 2px, transparent 4px);";
      probe.appendChild(grip);
      const tip = document.createElement("div");
      tip.style.cssText = "position:absolute; bottom:-8px; left:4px; width:4px; height:8px; background:#bdc3c7; border:1px solid #7f8c8d; border-radius:0 0 2px 2px;";
      probe.appendChild(tip);
      const startPos = comp.probes[type];
      probe.style.left = `${comp.x + startPos.x - 6}px`;
      probe.style.top = `${comp.y + startPos.y - 38}px`;
      document.getElementById("component-layer").appendChild(probe);
    }
    createAmmeter(comp, el) {
      el.style.width = "50px";
      el.style.height = "40px";
      el.style.background = "#e74c3c";
      el.style.border = "2px solid #c0392b";
      el.style.borderRadius = "4px";
      const display = document.createElement("div");
      display.id = `meter-val-${comp.id}`;
      display.style.width = "40px";
      display.style.height = "20px";
      display.style.background = "#000";
      display.style.margin = "4px auto";
      display.style.color = "#0ff";
      display.style.fontFamily = "monospace";
      display.style.textAlign = "center";
      display.style.lineHeight = "20px";
      display.style.fontSize = "12px";
      display.textContent = "0.00A";
      el.appendChild(display);
      const label = document.createElement("div");
      label.textContent = "AMPS";
      label.style.fontSize = "8px";
      label.style.textAlign = "center";
      label.style.color = "#fff";
      el.appendChild(label);
      this.addLeg(el, 10, 36, "a");
      this.addLeg(el, 30, 36, "b");
      return el;
    }
    createOscilloscope(comp, el) {
      el.style.width = "160px";
      el.style.height = "110px";
      el.style.background = "#34495e";
      el.style.border = "4px solid #95a5a6";
      el.style.borderRadius = "8px";
      el.style.boxShadow = "10px 10px 30px rgba(0,0,0,0.6)";
      el.style.cursor = "grab";
      el.style.zIndex = "50";
      const header = document.createElement("div");
      header.style.cssText = "height:20px; background:#2c3e50; border-bottom:1px solid #7f8c8d; display:flex; justify-content:space-between; align-items:center; padding:0 8px; border-radius:4px 4px 0 0;";
      header.innerHTML = '<span style="color:#bdc3c7; font-size:10px; font-weight:bold; font-family:sans-serif;">OSCILLOSCOPE PRO</span>';
      const maxBtn = document.createElement("button");
      maxBtn.innerHTML = "⛶";
      maxBtn.style.cssText = "background:none; border:none; color:#fff; cursor:pointer; font-size:14px; padding:0;";
      maxBtn.title = "Maximizar Pantalla";
      maxBtn.onclick = (e) => {
        e.stopPropagation();
        this.showMaximizedScope(comp);
      };
      header.appendChild(maxBtn);
      el.appendChild(header);
      const screen = document.createElement("canvas");
      screen.id = `scope-screen-${comp.id}`;
      screen.width = 140;
      screen.height = 70;
      screen.style.cssText = "background:#050505; margin:6px auto; display:block; border-radius:4px; border:2px solid #1abc9c; box-shadow:inset 0 0 10px #000;";
      el.appendChild(screen);
      const controls = document.createElement("div");
      controls.style.cssText = "display:flex; justify-content:space-around; padding:2px 10px;";
      ["CH1", "CH2", "TIME"].forEach((label) => {
        const knob = document.createElement("div");
        knob.style.cssText = "width:12px; height:12px; border-radius:50%; background:#7f8c8d; border:1px solid #34495e; box-shadow:1px 1px 2px #000;";
        const lbl = document.createElement("div");
        lbl.textContent = label;
        lbl.style.cssText = "font-size:7px; color:#fff; text-align:center; margin-top:1px;";
        const wrap = document.createElement("div");
        wrap.appendChild(knob);
        wrap.appendChild(lbl);
        controls.appendChild(wrap);
      });
      el.appendChild(controls);
      const connectors = [
        { id: "ch1", color: "#f1c40f", x: 25 },
        { id: "ch2", color: "#3498db", x: 80 },
        { id: "gnd", color: "#2c3e50", x: 135 }
      ];
      connectors.forEach((conn) => {
        const t = document.createElement("div");
        t.className = "internal-terminal";
        t.style.cssText = `position:absolute; bottom:4px; left:${conn.x}px; width:10px; height:10px; border-radius:50%; background:${conn.color}; border:1px solid #000; box-shadow:inset 0 0 4px #000;`;
        el.appendChild(t);
      });
      const ctx = screen.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      screen.getBoundingClientRect();
      screen.width = 140 * dpr;
      screen.height = 70 * dpr;
      ctx.scale(dpr, dpr);
      const drawGrid = () => {
        ctx.strokeStyle = "rgba(0, 51, 0, 0.5)";
        ctx.lineWidth = 0.5;
        for (let x = 0; x < 140; x += 14) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 70);
          ctx.stroke();
        }
        for (let y = 0; y < 70; y += 14) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(140, y);
          ctx.stroke();
        }
      };
      const plot = () => {
        if (!document.getElementById(screen.id)) return;
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, 140, 70);
        drawGrid();
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#f1c40f";
        ctx.strokeStyle = "#f1c40f";
        ctx.beginPath();
        comp.channels.ch1.forEach((v, i) => {
          const x = i / comp.bufferSize * 140;
          const y = 35 - v * (10 / comp.voltsPerDiv[0]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.strokeStyle = "#3498db";
        ctx.shadowColor = "#3498db";
        ctx.beginPath();
        comp.channels.ch2.forEach((v, i) => {
          const x = i / comp.bufferSize * 140;
          const y = 35 - v * (10 / comp.voltsPerDiv[1]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        requestAnimationFrame(plot);
      };
      requestAnimationFrame(plot);
      this.createProbeTip(comp, "ch1", "#f1c40f");
      this.createProbeTip(comp, "ch2", "#3498db");
      this.createProbeTip(comp, "gnd", "#2c3e50");
      return el;
    }
    // New function for LED component
    createLED(comp, el) {
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.background = "transparent";
      el.style.position = "relative";
      const body = document.createElement("div");
      body.id = `led-bulb-${comp.id}`;
      body.style.cssText = `
        position: absolute;
        left: 4px;
        top: 0px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, ${comp.color || "#ff0000"}, #880000);
        border: 1px solid #333;
        box-shadow: inset 0 0 3px rgba(255,255,255,0.5), 0 0 5px rgba(0,0,0,0.5);
    `;
      el.appendChild(body);
      const flatSide = document.createElement("div");
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
      const anodeLeg = document.createElement("div");
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
      const cathodeLeg = document.createElement("div");
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
      this.addLeg(el, 3, 22, "anode");
      this.addLeg(el, 23, 20, "cathode");
      const anodeLabel = document.createElement("div");
      anodeLabel.textContent = "A";
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
      const cathodeLabel = document.createElement("div");
      cathodeLabel.textContent = "K";
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
      el.style.width = "30px";
      body.style.left = "9px";
      this.addLeg(el, 5 - 2, 21, "anode");
      this.addLeg(el, 25 - 2, 21, "cathode");
      return el;
    }
    showMaximizedScope(comp) {
      let modal = document.getElementById("scope-max-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "scope-max-modal";
        modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:2000; display:flex; flex-direction:column; align-items:center; justify-content:center;";
        document.body.appendChild(modal);
      }
      modal.style.display = "flex";
      modal.innerHTML = "";
      const container = document.createElement("div");
      container.style.cssText = "width:90%; height:85%; background:#2c3e50; border:10px solid #95a5a6; border-radius:20px; position:relative; display:flex; flex-direction:column; padding:20px; box-shadow:0 0 50px rgba(0,0,0,1);";
      const title = document.createElement("h2");
      title.textContent = "Digital Storage Oscilloscope PRO";
      title.style.cssText = "color:#fff; margin-top:0; border-bottom:2px solid #34495e; padding-bottom:10px; font-family:sans-serif; letter-spacing:2px;";
      container.appendChild(title);
      const screenWrap = document.createElement("div");
      screenWrap.style.cssText = "flex-grow:1; background:#000; border:4px solid #1abc9c; border-radius:10px; overflow:hidden; position:relative;";
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 600;
      canvas.style.cssText = "width:100%; height:100%;";
      screenWrap.appendChild(canvas);
      container.appendChild(screenWrap);
      const controls = document.createElement("div");
      controls.style.cssText = "height:100px; display:flex; gap:30px; align-items:center; justify-content:center; color:#fff; font-family:monospace; margin-top:20px;";
      const createControl = (label, val, dec, inc) => {
        const div = document.createElement("div");
        div.style.textAlign = "center";
        div.innerHTML = `<div style="font-size:12px; color:#bdc3c7; margin-bottom:10px;">${label}</div>`;
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "10px";
        const btnDec = document.createElement("button");
        btnDec.textContent = "-";
        btnDec.style.cssText = "width:30px; height:30px; background:#e74c3c; border:none; color:#fff; border-radius:50%; cursor:pointer; font-weight:bold;";
        btnDec.onclick = dec;
        const display = document.createElement("div");
        display.textContent = val;
        display.style.cssText = "width:100px; font-size:20px; font-weight:bold; color:#0f0; background:#000; padding:5px; border:1px solid #333;";
        const btnInc = document.createElement("button");
        btnInc.textContent = "+";
        btnInc.style.cssText = "width:30px; height:30px; background:#2ecc71; border:none; color:#fff; border-radius:50%; cursor:pointer; font-weight:bold;";
        btnInc.onclick = inc;
        row.appendChild(btnDec);
        row.appendChild(display);
        row.appendChild(btnInc);
        div.appendChild(row);
        return { div, display };
      };
      const timeCtrl = createControl(
        "TIMEBASE (ms/div)",
        comp.timebase,
        () => {
          comp.timebase = Math.max(0.1, comp.timebase - 0.1);
          timeCtrl.display.textContent = comp.timebase.toFixed(1);
        },
        () => {
          comp.timebase += 0.1;
          timeCtrl.display.textContent = comp.timebase.toFixed(1);
        }
      );
      controls.appendChild(timeCtrl.div);
      const ch1Ctrl = createControl(
        "CH1 V/DIV",
        comp.voltsPerDiv[0],
        () => {
          comp.voltsPerDiv[0] = Math.max(0.5, comp.voltsPerDiv[0] - 0.5);
          ch1Ctrl.display.textContent = comp.voltsPerDiv[0].toFixed(1);
        },
        () => {
          comp.voltsPerDiv[0] += 0.5;
          ch1Ctrl.display.textContent = comp.voltsPerDiv[0].toFixed(1);
        }
      );
      controls.appendChild(ch1Ctrl.div);
      const ch2Ctrl = createControl(
        "CH2 V/DIV",
        comp.voltsPerDiv[1],
        () => {
          comp.voltsPerDiv[1] = Math.max(0.5, comp.voltsPerDiv[1] - 0.5);
          ch2Ctrl.display.textContent = comp.voltsPerDiv[1].toFixed(1);
        },
        () => {
          comp.voltsPerDiv[1] += 0.5;
          ch2Ctrl.display.textContent = comp.voltsPerDiv[1].toFixed(1);
        }
      );
      controls.appendChild(ch2Ctrl.div);
      container.appendChild(controls);
      const close = document.createElement("button");
      close.textContent = "✕ ESC";
      close.style.cssText = "position:absolute; top:20px; right:20px; background:#c0392b; color:#fff; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; font-weight:bold;";
      close.onclick = () => modal.style.display = "none";
      container.appendChild(close);
      modal.appendChild(container);
      const mCtx = canvas.getContext("2d");
      const mDpr = window.devicePixelRatio || 1;
      const updateSize = () => {
        const w = container.clientWidth - 40;
        const h = container.clientHeight - 200;
        canvas.width = w * mDpr;
        canvas.height = h * mDpr;
        mCtx.scale(mDpr, mDpr);
      };
      window.addEventListener("resize", updateSize);
      updateSize();
      const drawMGrid = () => {
        const w = canvas.width / mDpr;
        const h = canvas.height / mDpr;
        mCtx.strokeStyle = "rgba(0, 255, 0, 0.1)";
        mCtx.lineWidth = 1;
        for (let x = 0; x < w; x += w / 10) {
          mCtx.beginPath();
          mCtx.moveTo(x, 0);
          mCtx.lineTo(x, h);
          mCtx.stroke();
        }
        for (let y = 0; y < h; y += h / 8) {
          mCtx.beginPath();
          mCtx.moveTo(0, y);
          mCtx.lineTo(w, y);
          mCtx.stroke();
        }
        mCtx.strokeStyle = "rgba(0, 255, 0, 0.3)";
        mCtx.beginPath();
        mCtx.moveTo(w / 2, 0);
        mCtx.lineTo(w / 2, h);
        mCtx.stroke();
        mCtx.beginPath();
        mCtx.moveTo(0, h / 2);
        mCtx.lineTo(w, h / 2);
        mCtx.stroke();
      };
      const runMPlot = () => {
        if (modal.style.display === "none") return;
        const w = canvas.width / mDpr;
        const h = canvas.height / mDpr;
        mCtx.fillStyle = "#050505";
        mCtx.fillRect(0, 0, w, h);
        drawMGrid();
        mCtx.lineWidth = 3;
        mCtx.shadowBlur = 15;
        mCtx.strokeStyle = "#f1c40f";
        mCtx.shadowColor = "#f1c40f";
        mCtx.beginPath();
        comp.channels.ch1.forEach((v, i) => {
          const x = i / comp.bufferSize * w;
          const y = h / 2 - v * (h / (8 * comp.voltsPerDiv[0]));
          if (i === 0) mCtx.moveTo(x, y);
          else mCtx.lineTo(x, y);
        });
        mCtx.stroke();
        mCtx.strokeStyle = "#3498db";
        mCtx.shadowColor = "#3498db";
        mCtx.beginPath();
        comp.channels.ch2.forEach((v, i) => {
          const x = i / comp.bufferSize * w;
          const y = h / 2 - v * (h / (8 * comp.voltsPerDiv[1]));
          if (i === 0) mCtx.moveTo(x, y);
          else mCtx.lineTo(x, y);
        });
        mCtx.stroke();
        requestAnimationFrame(runMPlot);
      };
      runMPlot();
    }
  }
  class Interaction {
    constructor(engine, breadboard, containerId) {
      this.engine = engine;
      this.breadboard = breadboard;
      this.container = document.getElementById(containerId);
      this.svgLayer = document.getElementById("wire-layer");
      this.svgLayer.style.pointerEvents = "none";
      this.activeColor = "#ff0000";
      this.connections = [];
      this.dragItem = null;
      this.dragOffset = { x: 0, y: 0 };
      this.wireDrag = null;
      this.isWiring = false;
      this.isWireMode = false;
      this.startPin = null;
      this.activeProbe = null;
      this.selectedWire = null;
      this.selectedComponent = null;
      this.currentMousePos = { x: 0, y: 0 };
      this.onComponentSelected = null;
      this.onComponentDeselected = null;
      this.componentMap = /* @__PURE__ */ new Map();
      this.container.addEventListener("mousemove", (e) => this.onMove(e));
      this.container.addEventListener("mouseup", (e) => this.onUp(e));
      this.container.addEventListener("mousedown", (e) => this.onMouseDown(e));
      this.container.addEventListener("contextmenu", (e) => this.onContextMenu(e));
      const wireModeBtn = document.getElementById("btn-wire-mode");
      if (wireModeBtn) {
        wireModeBtn.onclick = () => {
          this.isWireMode = !this.isWireMode;
          wireModeBtn.classList.toggle("active", this.isWireMode);
          this.container.style.cursor = this.isWireMode ? "crosshair" : "default";
          if (this.isWireMode) this.deselectWire();
        };
      }
      document.addEventListener("keydown", (e) => this.onKeyDown(e));
      this.createColorPalette();
      this.createWireToolbar();
      document.addEventListener("mousedown", (e) => {
        const inspector = document.getElementById("inspector");
        if (inspector && inspector.style.display !== "none") {
          if (!inspector.contains(e.target) && !e.target.closest("#schematic-viewer") && !e.target.closest(".sim-component") && !e.target.closest(".sim-probe-tip") && !e.target.closest("path")) {
            this.deselectComponent();
            this.deselectWire();
          }
        }
      });
    }
    onKeyDown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (this.selectedWire) {
          this.deleteSelectedWire();
          e.preventDefault();
        } else if (this.selectedComponent) {
          const { comp, el } = this.selectedComponent;
          this.deleteComponent(comp, el);
          this.deselectComponent();
          e.preventDefault();
        }
      }
      if (e.key === "Escape") {
        this.deselectWire();
        this.deselectComponent();
      }
    }
    createWireToolbar() {
      const toolbar = document.createElement("div");
      toolbar.id = "wire-toolbar";
      toolbar.style.cssText = `
      position: absolute;
      top: 50px;
      right: 20px;
      background: rgba(30, 30, 35, 0.95);
      padding: 10px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      z-index: 25;
      display: none;
      flex-direction: column;
      gap: 8px;
      min-width: 150px;
    `;
      const title = document.createElement("div");
      title.textContent = "🔌 Cable Seleccionado";
      title.style.cssText = "font-size: 12px; color: #aaa; border-bottom: 1px solid #444; padding-bottom: 5px;";
      toolbar.appendChild(title);
      const colorLabel = document.createElement("div");
      colorLabel.textContent = "Cambiar Color:";
      colorLabel.style.cssText = "font-size: 11px; color: #888;";
      toolbar.appendChild(colorLabel);
      const colorContainer = document.createElement("div");
      colorContainer.style.cssText = "display: flex; gap: 4px; flex-wrap: wrap;";
      const colors = ["#ff0000", "#00ff00", "#0066ff", "#ffcc00", "#ff00ff", "#00ffff", "#ffffff", "#333333"];
      colors.forEach((c) => {
        const dot = document.createElement("div");
        dot.style.cssText = `
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: ${c};
        cursor: pointer;
        border: 2px solid transparent;
        transition: transform 0.2s;
      `;
        dot.onmouseover = () => dot.style.transform = "scale(1.2)";
        dot.onmouseout = () => dot.style.transform = "scale(1)";
        dot.onclick = () => this.changeWireColor(c);
        colorContainer.appendChild(dot);
      });
      toolbar.appendChild(colorContainer);
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️ Borrar Cable";
      deleteBtn.style.cssText = `
      background: #a00;
      color: #fff;
      border: none;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-top: 5px;
      transition: background 0.2s;
    `;
      deleteBtn.onmouseover = () => deleteBtn.style.background = "#c00";
      deleteBtn.onmouseout = () => deleteBtn.style.background = "#a00";
      deleteBtn.onclick = () => this.deleteSelectedWire();
      toolbar.appendChild(deleteBtn);
      const deselectBtn = document.createElement("button");
      deselectBtn.textContent = "✕ Deseleccionar";
      deselectBtn.style.cssText = `
      background: #555;
      color: #fff;
      border: none;
      padding: 6px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      transition: background 0.2s;
    `;
      deselectBtn.onmouseover = () => deselectBtn.style.background = "#666";
      deselectBtn.onmouseout = () => deselectBtn.style.background = "#555";
      deselectBtn.onclick = () => this.deselectWire();
      toolbar.appendChild(deselectBtn);
      this.container.appendChild(toolbar);
      this.wireToolbar = toolbar;
    }
    selectWire(conn) {
      this.deselectWire();
      this.selectedWire = conn;
      this.wireToolbar.style.display = "flex";
      this.updateWires();
    }
    deselectWire() {
      this.selectedWire = null;
      if (this.wireToolbar) {
        this.wireToolbar.style.display = "none";
      }
      this.updateWires();
    }
    changeWireColor(newColor) {
      if (this.selectedWire) {
        this.selectedWire.color = newColor;
        this.updateWires();
      }
    }
    deleteSelectedWire() {
      if (this.selectedWire) {
        this.connections = this.connections.filter((c) => c !== this.selectedWire);
        this.selectedWire = null;
        this.wireToolbar.style.display = "none";
        this.rebuildTopology();
        this.updateWires();
      }
    }
    selectComponent(comp, el) {
      this.deselectComponent();
      this.deselectWire();
      this.selectedComponent = { comp, el };
      el.classList.add("selected");
      if (this.onComponentSelected) this.onComponentSelected(comp, el);
    }
    deselectComponent() {
      if (this.selectedComponent) {
        this.selectedComponent.el.classList.remove("selected");
        this.selectedComponent = null;
        if (this.onComponentDeselected) this.onComponentDeselected();
      }
      document.getElementById("inspector").style.display = "none";
    }
    createColorPalette() {
      const colors = ["#ff0000", "#00ff00", "#0066ff", "#ffcc00", "#ff00ff", "#00ffff", "#ffffff", "#333333"];
      const pal = document.createElement("div");
      pal.id = "wire-palette";
      this.container.appendChild(pal);
      colors.forEach((c) => {
        const dot = document.createElement("div");
        dot.className = "color-dot";
        dot.style.background = c;
        if (c === this.activeColor) dot.classList.add("active");
        dot.onclick = () => {
          this.activeColor = c;
          document.querySelectorAll(".color-dot").forEach((d) => d.classList.remove("active"));
          dot.classList.add("active");
        };
        pal.appendChild(dot);
      });
    }
    onMouseDown(e) {
      const probe = e.target.closest(".sim-probe-tip");
      if (probe) {
        e.stopPropagation();
        if (e.button !== 0) return;
        const compId = probe.dataset.compId;
        const type = probe.dataset.pinId;
        const comp = [...this.componentMap.values()].find((c) => c.id === compId);
        if (comp) {
          this.activeProbe = { comp, type, el: probe };
          const rect2 = probe.getBoundingClientRect();
          this.dragOffset = {
            x: e.clientX - rect2.left,
            y: e.clientY - rect2.top
          };
          return;
        }
      }
      if (this.dragItem || this.wireDrag) return;
      const rect = this.container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (this.isWireMode) {
        const hole = this.breadboard.getHoleAt(x, y);
        if (hole) {
          this.deselectWire();
          const coords = this.getHoleCoords(hole.r, hole.c);
          this.isWiring = true;
          this.wiringStart = {
            type: "hole",
            r: hole.r,
            c: hole.c,
            x: coords.x,
            y: coords.y,
            net: this.breadboard.getNetAt(hole.r, hole.c)
          };
          this.currentMousePos = { x, y };
          this.updateWires();
          e.stopPropagation();
        }
      } else {
        if (this.selectedWire && !e.target.closest("path")) {
          this.deselectWire();
        }
        if (!e.target.closest("#schematic-viewer")) {
          this.deselectComponent();
        }
      }
    }
    onContextMenu(e) {
      const probe = e.target.closest(".sim-probe-tip");
      if (probe) {
        e.preventDefault();
        e.stopPropagation();
        const compId = probe.dataset.compId;
        const comp = [...this.componentMap.values()].find((c) => c.id === compId);
        if (comp) {
          let mainEl = null;
          for (const [el, c] of this.componentMap.entries()) {
            if (c === comp) {
              mainEl = el;
              break;
            }
          }
          this.selectComponent(comp, mainEl);
          this.showInspector(comp, mainEl);
        }
      }
    }
    registerComponent(component, el) {
      this.componentMap.set(el, component);
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectComponent(component, el);
        this.showInspector(component, el);
      });
      el.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        if (this.isWireMode) return;
        if (e.target.classList.contains("sim-pin")) {
          this.onPinDown(e, component, e.target);
          return;
        }
        this.selectComponent(component, el);
        this.startDrag(e, component, el);
      });
    }
    onPinDown(e, component, pinEl) {
      e.stopPropagation();
      const pinId = pinEl.dataset.pinId;
      const pin = component.getPin(pinId);
      if (!this.isWiring) {
        this.isWiring = true;
        this.wiringStart = {
          type: "pin",
          pin,
          el: pinEl,
          net: pin.net
        };
        pinEl.style.background = this.activeColor;
        pinEl.style.boxShadow = `0 0 5px ${this.activeColor}`;
      } else {
        this.finishWiring({ type: "pin", pin, el: pinEl, net: pin.net });
      }
    }
    startDrag(e, comp, el) {
      this.dragItem = { comp, el };
      const rect = el.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      comp.pins.forEach((pin) => {
        if (pin.net) {
          const isBoardNet = Array.from(this.breadboard.holes.values()).includes(pin.net);
          if (isBoardNet) {
            pin.disconnect();
          }
        }
      });
      this.dragStartPos = { x: e.clientX, y: e.clientY };
      e.stopPropagation();
    }
    startWireDrag(e, conn, handle) {
      this.wireDrag = {
        conn,
        startX: e.clientX,
        startY: e.clientY,
        startOffset: { ...conn.offset }
      };
      handle.classList.add("dragging");
      e.stopPropagation();
      e.preventDefault();
    }
    onMove(e) {
      const containerRect = this.container.getBoundingClientRect();
      const x = e.clientX - containerRect.left;
      const y = e.clientY - containerRect.top;
      if (this.activeProbe) {
        const nx = x - this.dragOffset.x;
        const ny = y - this.dragOffset.y;
        this.activeProbe.el.style.left = `${nx}px`;
        this.activeProbe.el.style.top = `${ny}px`;
        const tipX = nx + 6;
        const tipY = ny + 38;
        const hole = this.breadboard.getHoleAt(tipX, tipY);
        const pin = this.activeProbe.comp.getPin(this.activeProbe.type);
        if (hole && pin) {
          pin.connect(this.breadboard.getNetAt(hole.r, hole.c));
        } else if (pin) {
          pin.disconnect();
        }
        this.updateWires();
        return;
      }
      if (this.dragItem) {
        const { comp, el } = this.dragItem;
        const dx = x - this.dragOffset.x - comp.x;
        const dy = y - this.dragOffset.y - comp.y;
        comp.x += dx;
        comp.y += dy;
        el.style.left = `${comp.x}px`;
        el.style.top = `${comp.y}px`;
        const probes = document.querySelectorAll(`.sim-probe-tip[data-comp-id="${comp.id}"]`);
        probes.forEach((p) => {
          if (comp.isFloating) return;
          p.style.left = `${p.offsetLeft + dx}px`;
          p.style.top = `${p.offsetTop + dy}px`;
        });
        this.updateWires();
      }
      if (this.wireDrag) {
        const dx = e.clientX - this.wireDrag.startX;
        const dy = e.clientY - this.wireDrag.startY;
        this.wireDrag.conn.offset.x = this.wireDrag.startOffset.x + dx;
        this.wireDrag.conn.offset.y = this.wireDrag.startOffset.y + dy;
        this.updateWires();
      }
      if (!this.dragItem && !this.wireDrag) {
        const hole = this.breadboard.getHoleAt(x, y);
        if (hole && this.isWireMode) {
          this.container.style.cursor = "crosshair";
        } else if (!this.isWireMode) {
          this.container.style.cursor = "";
        }
      }
      if (this.isWiring && this.wiringStart) {
        this.currentMousePos = { x, y };
        this.updateWires();
      }
    }
    onUp(e) {
      if (this.activeProbe) {
        const nx = parseFloat(this.activeProbe.el.style.left);
        const ny = parseFloat(this.activeProbe.el.style.top);
        const hole = this.breadboard.getHoleAt(nx + 6, ny + 38);
        if (hole) {
          const coords = this.getHoleCoords(hole.r, hole.c);
          this.activeProbe.el.style.left = `${coords.x - 6}px`;
          this.activeProbe.el.style.top = `${coords.y - 38}px`;
        }
        this.activeProbe = null;
        this.rebuildTopology();
        this.updateWires();
      }
      if (this.dragItem) {
        const { comp, el } = this.dragItem;
        this.snapComponent(comp, el);
        this.dragItem = null;
        this.rebuildTopology();
      }
      this.dragItem = null;
      if (this.wireDrag) {
        this.wireDrag = null;
        this.updateWires();
      }
      if (this.isWiring) {
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hole = this.breadboard.getHoleAt(x, y);
        if (hole) {
          const coords = this.getHoleCoords(hole.r, hole.c);
          this.finishWiring({
            type: "hole",
            r: hole.r,
            c: hole.c,
            x: coords.x,
            y: coords.y,
            net: this.breadboard.getNetAt(hole.r, hole.c)
          });
        } else {
          this.cancelWiring();
        }
      }
      if (this.isWireMode) {
        this.container.style.cursor = "crosshair";
      } else {
        this.container.style.cursor = "";
      }
    }
    cancelWiring() {
      if (this.wiringStart && this.wiringStart.type === "pin" && this.wiringStart.el) {
        this.wiringStart.el.style.background = "";
        this.wiringStart.el.style.boxShadow = "";
      }
      this.wiringStart = null;
      this.isWiring = false;
      this.updateWires();
    }
    finishWiring(endEndpoint) {
      if (!this.wiringStart) {
        this.isWiring = false;
        return;
      }
      const startEp = this.wiringStart;
      this.wiringStart = null;
      this.isWiring = false;
      if (startEp.type === "pin" && startEp.el) {
        startEp.el.style.background = "";
        startEp.el.style.boxShadow = "";
      }
      startEp.net;
      endEndpoint.net;
      if (startEp.type === "pin" && endEndpoint.type === "pin" && startEp.pin === endEndpoint.pin) return;
      if (startEp.type === "hole" && endEndpoint.type === "hole" && startEp.r === endEndpoint.r && startEp.c === endEndpoint.c) return;
      const conn = {
        p1: startEp,
        // Endpoint Object
        p2: endEndpoint,
        color: this.activeColor,
        offset: { x: 0, y: 50 + Math.random() * 20 }
      };
      this.connections.push(conn);
      this.rebuildTopology();
      this.updateWires();
    }
    assignNetToEndpoint(ep, net) {
      if (ep.type === "pin") {
        ep.pin.connect(net);
      } else if (ep.type === "hole") {
        this.breadboard.holes.set(`${ep.r},${ep.c}`, net);
      }
    }
    snapComponent(comp, el) {
      let pin1Offset = { x: 13, y: 57 };
      const firstPin = comp.pins[0];
      if (firstPin) {
        if (comp.isFloating) {
          el.style.left = `${comp.x}px`;
          el.style.top = `${comp.y}px`;
          return;
        }
        const pinEl = el.querySelector(`.sim-pin[data-pin-id="${firstPin.id}"]`);
        if (pinEl) {
          const pLeft = parseFloat(pinEl.style.left);
          const pTop = parseFloat(pinEl.style.top);
          if (!isNaN(pLeft) && !isNaN(pTop)) {
            const localPinX = pLeft + (el.clientLeft || 0) + 3;
            const localPinY = pTop + (el.clientTop || 0) + 3;
            const w = el.offsetWidth || parseFloat(el.style.width) || 0;
            const h = el.offsetHeight || parseFloat(el.style.height) || 0;
            const cx = w / 2;
            const cy = h / 2;
            const dx = localPinX - cx;
            const dy = localPinY - cy;
            const angleRad = (comp.rotation || 0) * (Math.PI / 180);
            const dx_rot = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
            const dy_rot = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
            pin1Offset = {
              x: cx + dx_rot,
              y: cy + dy_rot
            };
          }
        }
      }
      const targetX = comp.x + pin1Offset.x;
      const targetY = comp.y + pin1Offset.y;
      const hole = this.breadboard.getHoleAt(targetX, targetY);
      if (hole) {
        const coords = this.getHoleCoords(hole.r, hole.c);
        if (coords) {
          comp.x = coords.x - pin1Offset.x;
          comp.y = coords.y - pin1Offset.y;
          el.style.left = `${comp.x}px`;
          el.style.top = `${comp.y}px`;
        }
      }
    }
    getHoleCoords(r, c) {
      const x = Math.round(BB_START_X + (r - 1) * GRID_SIZE);
      let y = 0;
      const lettersTop = ["a", "b", "c", "d", "e"];
      const lettersBot = ["f", "g", "h", "i", "j"];
      if (lettersTop.includes(c)) {
        y = BB_START_Y + lettersTop.indexOf(c) * GRID_SIZE;
      } else if (lettersBot.includes(c)) {
        const yF = BB_START_Y + 7 * GRID_SIZE;
        y = yF + lettersBot.indexOf(c) * GRID_SIZE;
      } else if (c === "top-neg") y = BB_START_Y - 3 * GRID_SIZE;
      else if (c === "top-pos") y = BB_START_Y - 2 * GRID_SIZE;
      else if (c === "bot-pos") {
        const yBot = BB_START_Y + 13 * GRID_SIZE;
        y = yBot;
      } else if (c === "bot-neg") {
        const yBot = BB_START_Y + 13 * GRID_SIZE;
        y = yBot + GRID_SIZE;
      }
      return { x: Math.round(x), y: Math.round(y) };
    }
    // Visuals
    // ... (keep showInspector and other helpers)
    showInspector(comp, el) {
      const inspector = document.getElementById("inspector");
      const content = document.getElementById("inspector-content");
      inspector.style.display = "flex";
      content.innerHTML = "";
      const title = document.createElement("h4");
      title.textContent = comp.metadata.name;
      title.style.marginTop = "0";
      title.style.borderBottom = "1px solid #444";
      title.style.paddingBottom = "5px";
      content.appendChild(title);
      const idInfo = document.createElement("div");
      idInfo.textContent = `ID: ${comp.id}`;
      idInfo.style.fontSize = "10px";
      idInfo.style.color = "#777";
      idInfo.style.marginBottom = "10px";
      content.appendChild(idInfo);
      const rotRow = document.createElement("div");
      rotRow.style.marginBottom = "10px";
      rotRow.innerHTML = "<label>Rotation</label><br>";
      const rotBtn = document.createElement("button");
      rotBtn.textContent = "Rotate 90°";
      rotBtn.className = "btn";
      rotBtn.style.width = "100%";
      rotBtn.style.marginTop = "5px";
      rotBtn.onclick = () => {
        comp.rotation = (comp.rotation || 0) + 90;
        el.style.transform = `rotate(${comp.rotation}deg)`;
        setTimeout(() => this.updateWires(), 10);
      };
      rotRow.appendChild(rotBtn);
      content.appendChild(rotRow);
      if (comp.metadata.name === "LED") {
        const colRow = document.createElement("div");
        colRow.innerHTML = "<label>Color</label><br>";
        const select = document.createElement("select");
        select.style.width = "100%";
        select.style.background = "#333";
        select.style.color = "#fff";
        select.style.border = "1px solid #555";
        select.style.padding = "4px";
        ["red", "green", "blue", "yellow", "white"].forEach((c) => {
          const opt = document.createElement("option");
          opt.value = c;
          opt.innerText = c;
          if (comp.color === c) opt.selected = true;
          select.appendChild(opt);
        });
        select.onchange = (e) => {
          comp.color = e.target.value;
          const bulb = document.getElementById(`led-bulb-${comp.id}`);
          if (bulb) {
            bulb.style.background = `radial-gradient(circle at 30% 30%, ${comp.color}, #000)`;
          }
        };
        colRow.appendChild(select);
        content.appendChild(colRow);
      }
      if (comp.metadata.name === "Voltage Source") {
        const valRow = document.createElement("div");
        valRow.innerHTML = "<label>Voltage (V)</label><br>";
        const input = document.createElement("input");
        input.type = "number";
        input.value = comp.voltage;
        input.style.width = "100%";
        input.style.background = "#333";
        input.style.color = "#fff";
        input.style.border = "1px solid #555";
        input.onchange = (e) => {
          comp.voltage = parseFloat(e.target.value);
          comp.metadata.description = `${comp.voltage}V DC Source`;
          const label = document.getElementById(`label-${comp.id}`);
          if (label) label.textContent = `${comp.voltage}V`;
        };
        valRow.appendChild(input);
        content.appendChild(valRow);
      }
      if (comp.metadata.name === "Resistor") {
        const valRow = document.createElement("div");
        valRow.innerHTML = "<label>Resistance (Ω)</label><br>";
        const input = document.createElement("input");
        input.type = "number";
        input.value = comp.resistance;
        input.style.width = "100%";
        input.style.background = "#333";
        input.style.color = "#fff";
        input.style.border = "1px solid #555";
        input.onchange = (e) => {
          comp.resistance = parseFloat(e.target.value);
          comp.metadata.description = `${comp.resistance}Ω`;
        };
        valRow.appendChild(input);
        content.appendChild(valRow);
      }
      if (comp.metadata.name === "Capacitor") {
        const capRow = document.createElement("div");
        capRow.style.marginBottom = "10px";
        capRow.innerHTML = "<label>Capacidad (µF)</label><br>";
        const capInput = document.createElement("input");
        capInput.type = "number";
        capInput.value = Math.round((comp.capacitance || 1e-4) * 1e6);
        capInput.style.width = "100%";
        capInput.style.background = "#333";
        capInput.style.color = "#fff";
        capInput.style.border = "1px solid #555";
        capInput.onchange = (e) => {
          comp.capacitance = parseFloat(e.target.value) * 1e-6;
          this.updateComponentVisuals(comp);
        };
        capRow.appendChild(capInput);
        content.appendChild(capRow);
        const voltRow = document.createElement("div");
        voltRow.innerHTML = "<label>Voltaje Nominal (V)</label><br>";
        const voltSelect = document.createElement("select");
        voltSelect.style.width = "100%";
        voltSelect.style.background = "#333";
        voltSelect.style.color = "#fff";
        voltSelect.style.border = "1px solid #555";
        voltSelect.style.padding = "4px";
        [10, 16, 25, 35, 50, 100].forEach((v) => {
          const opt = document.createElement("option");
          opt.value = v;
          opt.innerText = `${v}V`;
          if (comp.maxVoltage === v) opt.selected = true;
          voltSelect.appendChild(opt);
        });
        voltSelect.onchange = (e) => {
          comp.maxVoltage = parseInt(e.target.value);
          this.updateComponentVisuals(comp);
        };
        voltRow.appendChild(voltSelect);
        content.appendChild(voltRow);
      }
      if (comp.metadata.name === "Osciloscopio") {
        const tRow = document.createElement("div");
        tRow.style.marginBottom = "10px";
        tRow.innerHTML = "<label>Timebase (s/div)</label><br>";
        const tInput = document.createElement("input");
        tInput.type = "number";
        tInput.step = "0.1";
        tInput.value = comp.timebase;
        tInput.style.width = "100%";
        tInput.style.background = "#333";
        tInput.style.color = "#fff";
        tInput.onchange = (e) => comp.timebase = parseFloat(e.target.value);
        tRow.appendChild(tInput);
        content.appendChild(tRow);
        const v1Row = document.createElement("div");
        v1Row.style.marginBottom = "10px";
        v1Row.innerHTML = "<label>CH1 Volts/Div</label><br>";
        const v1Input = document.createElement("input");
        v1Input.type = "number";
        v1Input.step = "0.5";
        v1Input.value = comp.voltsPerDiv[0];
        v1Input.style.width = "100%";
        v1Input.style.background = "#333";
        v1Input.style.color = "#fff";
        v1Input.onchange = (e) => comp.voltsPerDiv[0] = parseFloat(e.target.value);
        v1Row.appendChild(v1Input);
        content.appendChild(v1Row);
        const v2Row = document.createElement("div");
        v2Row.style.marginBottom = "10px";
        v2Row.innerHTML = "<label>CH2 Volts/Div</label><br>";
        const v2Input = document.createElement("input");
        v2Input.type = "number";
        v2Input.step = "0.5";
        v2Input.value = comp.voltsPerDiv[1];
        v2Input.style.width = "100%";
        v2Input.style.background = "#333";
        v2Input.style.color = "#fff";
        v2Input.onchange = (e) => comp.voltsPerDiv[1] = parseFloat(e.target.value);
        v2Row.appendChild(v2Input);
        content.appendChild(v2Row);
      }
      if (comp.metadata.name === "Signal Generator") {
        const dutyRow = document.createElement("div");
        const waveRow = document.createElement("div");
        waveRow.style.marginBottom = "10px";
        waveRow.innerHTML = "<label>Waveform</label><br>";
        const waveSelect = document.createElement("select");
        waveSelect.style.width = "100%";
        waveSelect.style.background = "#333";
        waveSelect.style.color = "#fff";
        ["pulse", "sine"].forEach((w) => {
          const opt = document.createElement("option");
          opt.value = w;
          opt.innerText = w.toUpperCase();
          if (comp.waveform === w) opt.selected = true;
          waveSelect.appendChild(opt);
        });
        waveSelect.onchange = (e) => {
          comp.waveform = e.target.value;
          const icon = document.getElementById(`wave-icon-${comp.id}`);
          if (icon) icon.textContent = comp.waveform === "sine" ? "∿" : "⎍";
          dutyRow.style.display = comp.waveform === "pulse" ? "block" : "none";
        };
        waveRow.appendChild(waveSelect);
        content.appendChild(waveRow);
        const freqRow = document.createElement("div");
        freqRow.style.marginBottom = "10px";
        freqRow.innerHTML = "<label>Frequency (Hz)</label><br>";
        const freqInput = document.createElement("input");
        freqInput.type = "number";
        freqInput.value = comp.frequency;
        freqInput.style.width = "100%";
        freqInput.style.background = "#333";
        freqInput.style.color = "#fff";
        freqInput.onchange = (e) => comp.frequency = parseFloat(e.target.value);
        freqRow.appendChild(freqInput);
        content.appendChild(freqRow);
        const magRow = document.createElement("div");
        magRow.style.marginBottom = "10px";
        magRow.innerHTML = "<label>Magnitude (V peak)</label><br>";
        const magInput = document.createElement("input");
        magInput.type = "number";
        magInput.value = comp.magnitude;
        magInput.style.width = "100%";
        magInput.style.background = "#333";
        magInput.style.color = "#fff";
        magInput.onchange = (e) => comp.magnitude = parseFloat(e.target.value);
        magRow.appendChild(magInput);
        content.appendChild(magRow);
        dutyRow.style.display = comp.waveform === "pulse" ? "block" : "none";
        dutyRow.innerHTML = "<label>Duty Cycle (%)</label><br>";
        const dutyInput = document.createElement("input");
        dutyInput.type = "number";
        dutyInput.min = 1;
        dutyInput.max = 99;
        dutyInput.value = comp.dutyCycle;
        dutyInput.style.width = "100%";
        dutyInput.style.background = "#333";
        dutyInput.style.color = "#fff";
        dutyInput.onchange = (e) => comp.dutyCycle = parseFloat(e.target.value);
        dutyRow.appendChild(dutyInput);
        content.appendChild(dutyRow);
      }
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete Component";
      delBtn.className = "btn";
      delBtn.style.background = "#a00";
      delBtn.style.marginTop = "20px";
      delBtn.style.width = "100%";
      delBtn.onclick = () => {
        this.deleteComponent(comp, el);
        inspector.style.display = "none";
      };
      content.appendChild(delBtn);
    }
    rebuildTopology() {
      var _a;
      this.breadboard.resetConnectivity();
      for (const comp of this.engine.components) {
        comp.pins.forEach((p) => p.disconnect());
      }
      const boardNets = new Set(this.breadboard.holes.values());
      for (const net of this.engine.nets) {
        if (!boardNets.has(net)) {
          this.engine.nets.delete(net);
        }
      }
      this.connections.forEach((conn) => {
        const p1Net = this.getEndpointNet(conn.p1);
        const p2Net = this.getEndpointNet(conn.p2);
        if (!p1Net && !p2Net) {
          const newNet = new Net("net_" + Math.random());
          newNet.color = conn.color;
          this.engine.addNet(newNet);
          this.assignNetToEndpoint(conn.p1, newNet);
          this.assignNetToEndpoint(conn.p2, newNet);
        } else if (p1Net && !p2Net) {
          this.assignNetToEndpoint(conn.p2, p1Net);
        } else if (!p1Net && p2Net) {
          this.assignNetToEndpoint(conn.p1, p2Net);
        } else if (p1Net !== p2Net) {
          this.mergeNets(p1Net, p2Net);
        }
      });
      for (const comp of this.engine.components) {
        if (((_a = this.dragItem) == null ? void 0 : _a.comp) === comp) continue;
        let compEl = null;
        for (const [el, c] of this.componentMap.entries()) {
          if (c === comp) {
            compEl = el;
            break;
          }
        }
        if (!compEl) continue;
        comp.pins.forEach((pin) => {
          let pinEl = compEl.querySelector(`.sim-pin[data-pin-id="${pin.id}"]`);
          let isProbe = false;
          if (!pinEl) {
            pinEl = document.getElementById(`probe-${comp.id}-${pin.id}`);
            isProbe = !!pinEl;
          }
          if (!pinEl) return;
          let absX, absY;
          if (isProbe) {
            absX = parseFloat(pinEl.style.left) + 6;
            absY = parseFloat(pinEl.style.top) + 38;
          } else {
            const relX = (parseFloat(pinEl.style.left) || 0) + 3;
            const relY = (parseFloat(pinEl.style.top) || 0) + 3;
            if (comp.rotation) {
              const w = parseFloat(compEl.style.width) || compEl.offsetWidth || 40;
              const h = parseFloat(compEl.style.height) || compEl.offsetHeight || 40;
              const rad = comp.rotation * Math.PI / 180;
              const dx = relX - w / 2;
              const dy = relY - h / 2;
              absX = comp.x + w / 2 + dx * Math.cos(rad) - dy * Math.sin(rad);
              absY = comp.y + h / 2 + dx * Math.sin(rad) + dy * Math.cos(rad);
            } else {
              absX = comp.x + relX;
              absY = comp.y + relY;
            }
          }
          const hole = this.breadboard.getHoleAt(absX, absY);
          if (hole) {
            const boardNet = this.breadboard.getNetAt(hole.r, hole.c);
            if (boardNet) {
              if (pin.net && pin.net !== boardNet) {
                this.mergeNets(boardNet, pin.net);
              } else {
                pin.connect(boardNet);
              }
            }
          }
        });
      }
      if (this.engine) this.engine.solveNetwork();
    }
    getEndpointNet(ep) {
      if (ep.type === "pin") return ep.pin.net;
      if (ep.type === "hole") return this.breadboard.getNetAt(ep.r, ep.c);
      return null;
    }
    mergeNets(targetNet, sourceNet) {
      if (targetNet === sourceNet) return;
      for (const p of sourceNet.pins) p.connect(targetNet);
      for (const [key, val] of this.breadboard.holes.entries()) {
        if (val === sourceNet) this.breadboard.holes.set(key, targetNet);
      }
      this.engine.nets.delete(sourceNet);
    }
    deleteComponent(comp, el) {
      el.remove();
      const probes = document.querySelectorAll(`.sim-probe-tip[data-comp-id="${comp.id}"]`);
      probes.forEach((p) => p.remove());
      this.engine.removeComponent(comp);
      this.componentMap.delete(el);
      this.connections = this.connections.filter(
        (c) => c.p1.component !== comp && c.p2.component !== comp
      );
      this.rebuildTopology();
      this.updateWires();
    }
    updateComponentVisuals(comp) {
      let el = null;
      for (const [e, c] of this.componentMap.entries()) {
        if (c === comp) {
          el = e;
          break;
        }
      }
      if (!el) return;
      if (comp.metadata.name === "Capacitor") {
        const label = document.getElementById(`cap-label-${comp.id}`);
        if (label) {
          const uF = Math.round(comp.capacitance * 1e6);
          label.innerHTML = `<span style="display:block; font-size:8px; line-height:1">${uF}µF</span><span style="display:block; font-size:8px; line-height:1">${comp.maxVoltage}V</span>`;
        }
      }
    }
    updateWires() {
      while (this.svgLayer.firstChild) this.svgLayer.removeChild(this.svgLayer.firstChild);
      this.connections.forEach((conn) => {
        const pos1 = this.getEndpointPos(conn.p1);
        const pos2 = this.getEndpointPos(conn.p2);
        if (pos1 && pos2) {
          this.drawFlexibleWire(conn, pos1, pos2);
        }
      });
      this.engine.components.forEach((comp) => {
        var _a;
        if (comp.isFloating && comp.probes) {
          const compEl = (_a = [...this.componentMap.entries()].find(([el, c]) => c === comp)) == null ? void 0 : _a[0];
          if (!compEl) return;
          Object.keys(comp.probes).forEach((type) => {
            const probeEl = document.getElementById(`probe-${comp.id}-${type}`);
            if (!probeEl) return;
            let startX = comp.x;
            let startY = comp.y + 100;
            let cableColor = "#888";
            if (comp.metadata.name === "MULTIMETER" || comp.metadata.name === "Voltimetro") {
              startX += type === "pos" ? 24 : 64;
              startY = comp.y + 55;
              cableColor = type === "pos" ? "#e74c3c" : "#2c3e50";
            } else if (comp.metadata.name === "Osciloscopio") {
              if (type === "ch1") {
                startX += 25 + 5;
                cableColor = "#f1c40f";
              } else if (type === "ch2") {
                startX += 80 + 5;
                cableColor = "#3498db";
              } else if (type === "gnd") {
                startX += 135 + 5;
                cableColor = "#2c3e50";
              }
              startY = comp.y + 105;
            } else if (comp.metadata.name === "Signal Generator") {
              startX += type === "out" ? 15 + 4 : 45 + 4;
              startY = comp.y + 45;
              cableColor = type === "out" ? "#f1c40f" : "#2c3e50";
            } else if (comp.metadata.name === "Voltage Source") {
              startX += type === "pos" ? 10 + 4 : 30 + 4;
              startY = comp.y + 39;
              cableColor = type === "pos" ? "#f1c40f" : "#2c3e50";
            }
            const endX = probeEl.offsetLeft + 5;
            const endY = probeEl.offsetTop + 5;
            this.drawProbeCable(startX, startY, endX, endY, cableColor);
          });
        }
      });
      if (this.isWiring && this.wiringStart && this.currentMousePos) {
        this.drawTemporaryWire();
      }
    }
    drawTemporaryWire() {
      const startPos = this.wiringStart.type === "pin" ? this.getPinPosition(this.wiringStart.pin) : { x: this.wiringStart.x, y: this.wiringStart.y };
      if (!startPos) return;
      const endPos = this.currentMousePos;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", startPos.x);
      line.setAttribute("y1", startPos.y);
      line.setAttribute("x2", endPos.x);
      line.setAttribute("y2", endPos.y);
      line.setAttribute("stroke", this.activeColor);
      line.setAttribute("stroke-width", "3");
      line.setAttribute("stroke-dasharray", "8,4");
      line.setAttribute("stroke-opacity", "0.8");
      line.setAttribute("stroke-linecap", "round");
      const animate = document.createElementNS("http://www.w3.org/2000/svg", "animate");
      animate.setAttribute("attributeName", "stroke-dashoffset");
      animate.setAttribute("from", "0");
      animate.setAttribute("to", "24");
      animate.setAttribute("dur", "0.5s");
      animate.setAttribute("repeatCount", "indefinite");
      line.appendChild(animate);
      this.svgLayer.appendChild(line);
      const startCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      startCircle.setAttribute("cx", startPos.x);
      startCircle.setAttribute("cy", startPos.y);
      startCircle.setAttribute("r", "6");
      startCircle.setAttribute("fill", this.activeColor);
      startCircle.setAttribute("fill-opacity", "0.8");
      startCircle.setAttribute("stroke", "#fff");
      startCircle.setAttribute("stroke-width", "2");
      this.svgLayer.appendChild(startCircle);
      const endCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      endCircle.setAttribute("cx", endPos.x);
      endCircle.setAttribute("cy", endPos.y);
      endCircle.setAttribute("r", "4");
      endCircle.setAttribute("fill", this.activeColor);
      endCircle.setAttribute("fill-opacity", "0.6");
      const pulseAnimate = document.createElementNS("http://www.w3.org/2000/svg", "animate");
      pulseAnimate.setAttribute("attributeName", "r");
      pulseAnimate.setAttribute("values", "4;8;4");
      pulseAnimate.setAttribute("dur", "0.8s");
      pulseAnimate.setAttribute("repeatCount", "indefinite");
      endCircle.appendChild(pulseAnimate);
      this.svgLayer.appendChild(endCircle);
    }
    drawFlexibleWire(conn, p1, p2) {
      const color = conn.color || "#555";
      const isSelected = conn === this.selectedWire;
      const checkX = (p1.x + p2.x) / 2;
      const checkY = (p1.y + p2.y) / 2;
      const cpX = checkX + conn.offset.x;
      const cpY = checkY + conn.offset.y;
      const d = `M ${p1.x} ${p1.y} Q ${cpX} ${cpY} ${p2.x} ${p2.y}`;
      if (isSelected) {
        const glowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        glowPath.setAttribute("d", d);
        glowPath.setAttribute("stroke", "#fff");
        glowPath.setAttribute("stroke-width", "12");
        glowPath.setAttribute("fill", "none");
        glowPath.setAttribute("stroke-opacity", "0.4");
        glowPath.setAttribute("stroke-linecap", "round");
        const pulseAnim = document.createElementNS("http://www.w3.org/2000/svg", "animate");
        pulseAnim.setAttribute("attributeName", "stroke-opacity");
        pulseAnim.setAttribute("values", "0.2;0.6;0.2");
        pulseAnim.setAttribute("dur", "1.5s");
        pulseAnim.setAttribute("repeatCount", "indefinite");
        glowPath.appendChild(pulseAnim);
        this.svgLayer.appendChild(glowPath);
      }
      const hitbox = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hitbox.setAttribute("d", d);
      hitbox.setAttribute("stroke", "transparent");
      hitbox.setAttribute("stroke-width", "20");
      hitbox.setAttribute("fill", "none");
      hitbox.style.cursor = "pointer";
      hitbox.style.pointerEvents = "stroke";
      hitbox.onmousedown = (e) => {
        e.stopPropagation();
        this.selectWire(conn);
      };
      this.svgLayer.appendChild(hitbox);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", isSelected ? "7" : "5");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-opacity", "1");
      path.setAttribute("stroke-linecap", "round");
      path.style.pointerEvents = "none";
      this.svgLayer.appendChild(path);
      const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      const hX = 0.25 * p1.x + 0.5 * cpX + 0.25 * p2.x;
      const hY = 0.25 * p1.y + 0.5 * cpY + 0.25 * p2.y;
      handle.setAttribute("cx", hX);
      handle.setAttribute("cy", hY);
      handle.setAttribute("r", isSelected ? "7" : "4");
      handle.setAttribute("class", "wire-handle" + (isSelected ? " selected" : ""));
      if (isSelected) {
        handle.setAttribute("fill", "#00ff88");
        handle.setAttribute("stroke", "#fff");
        handle.setAttribute("stroke-width", "2");
      }
      handle.onmousedown = (e) => {
        e.stopPropagation();
        if (this.selectedWire !== conn) this.selectWire(conn);
        this.startWireDrag(e, conn, handle);
      };
      this.svgLayer.appendChild(handle);
    }
    getPinPosition(pin) {
      let compEl = null;
      for (const [el, c] of this.componentMap.entries()) {
        if (c === pin.component) {
          compEl = el;
          break;
        }
      }
      if (!compEl) return null;
      const pinEl = compEl.querySelector(`.sim-pin[data-pin-id="${pin.id}"]`);
      if (!pinEl) return null;
      const rect = pinEl.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      return {
        x: Math.round(rect.left - containerRect.left + rect.width / 2),
        y: Math.round(rect.top - containerRect.top + rect.height / 2)
      };
    }
    getEndpointPos(ep) {
      if (ep.type === "pin") {
        return this.getPinPosition(ep.pin);
      } else if (ep.type === "hole") {
        return { x: ep.x, y: ep.y };
      }
      return null;
    }
    drawProbeCable(sx, sy, ex, ey, color) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const midX = (sx + ex) / 2;
      const midY = (sy + ey) / 2 + 50;
      const d = `M ${sx} ${sy} Q ${midX} ${midY} ${ex} ${ey}`;
      path.setAttribute("d", d);
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", "4");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.style.filter = "drop-shadow(2px 2px 2px rgba(0,0,0,0.5))";
      this.svgLayer.appendChild(path);
    }
  }
  class SchematicManager {
    constructor() {
      this.viewer = document.getElementById("schematic-viewer");
      this.content = document.getElementById("schematic-content");
      this.title = document.getElementById("schematic-title");
      this.description = document.getElementById("schematic-description");
      this.closeBtn = document.getElementById("close-schematic");
      this.header = this.viewer.querySelector(".schematic-header");
      if (this.closeBtn) {
        this.closeBtn.onclick = () => this.hide();
      }
      this.initDragging();
    }
    initDragging() {
      let isDragging = false;
      let offset = { x: 0, y: 0 };
      this.header.onmousedown = (e) => {
        isDragging = true;
        offset.x = e.clientX - this.viewer.offsetLeft;
        offset.y = e.clientY - this.viewer.offsetTop;
        this.header.style.cursor = "grabbing";
        e.preventDefault();
      };
      document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const x = e.clientX - offset.x;
        const y = e.clientY - offset.y;
        this.viewer.style.left = `${x}px`;
        this.viewer.style.top = `${y}px`;
        this.viewer.style.bottom = "auto";
        this.viewer.style.right = "auto";
        this.viewer.style.transform = "none";
      });
      document.addEventListener("mouseup", () => {
        isDragging = false;
        if (this.header) this.header.style.cursor = "grab";
      });
    }
    show(component) {
      if (!this.viewer || !this.content) return;
      const name = component.metadata.name;
      const data = this.getSchematicData(name);
      if (data) {
        this.title.innerHTML = `📋 Datasheet: ${data.title}`;
        this.description.innerHTML = `<strong>Descripción:</strong><br>${data.desc}`;
        if (data.image) {
          this.content.innerHTML = `<img src="${data.image}" style="max-width:100%; height:auto; border-radius:4px; border:1px solid #333; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">`;
        } else {
          this.content.innerHTML = `<div style="padding: 20px; color: #888; text-align: center;">Imagen del catálogo no disponible para este componente.</div>`;
        }
        this.viewer.style.display = "flex";
      } else {
        this.hide();
      }
    }
    hide() {
      if (this.viewer) this.viewer.style.display = "none";
    }
    getSchematicData(name) {
      const specs = {
        "7408": {
          title: "SN7408 Quad 2-Input AND Gate",
          desc: "Diagrama de pines estándar (DIP-14). Contiene 4 compuertas AND independientes de 2 entradas. Alimentación: Pin 14 (VCC), Pin 7 (GND). Salida Y = A • B.",
          image: "simutron/assets/datasheets/7408.png"
        },
        "7404": {
          title: "SN7404 Hex Inverter",
          desc: "Diagrama de pines estándar (DIP-14). Contiene 6 inversores independientes. Alimentación: Pin 14 (VCC), Pin 7 (GND). Salida Y = NOT A.",
          image: "simutron/assets/datasheets/7404.png"
        },
        "7432": {
          title: "SN7432 Quad 2-Input OR Gate",
          desc: "Diagrama de pines estándar (DIP-14). Contiene 4 compuertas OR independientes de 2 entradas. Alimentación: Pin 14 (VCC), Pin 7 (GND). Salida Y = A + B.",
          image: "simutron/assets/datasheets/7432.png"
        },
        "7490": {
          title: "SN7490 Decade Counter (Asíncrono)",
          desc: "Contador de décadas (DIV-10). Configuración estándar: Conectar Salida estandar QA (Pin 12) a Entrada B (Pin 1) para conteo BCD 0-9. Alimentación: Pin 5 (VCC), Pin 10 (GND). Reset 0: Pines 2 y 3 en ALTO.",
          image: "simutron/assets/datasheets/7490.png"
        },
        "7447": {
          title: "SN7447 BCD to 7-Segment Decoder",
          desc: "Decodificador BCD a 7 Segmentos (Salidas Activas en BAJO, Open Collector). Diseñado para displays de Ánodo Común. Alimentación: Pin 16 (VCC), Pin 8 (GND).",
          image: "simutron/assets/datasheets/7447.png"
        },
        "LM741": {
          title: "uA741 Operational Amplifier",
          desc: "Amplificador Operacional de propósito general. Pines clave: 2 (In-), 3 (In+), 6 (Salida). Alimentación simétrica: 7 (V+), 4 (V-).",
          image: "simutron/assets/datasheets/741.png"
        },
        "LM555": {
          title: "NE555 Precision Timer",
          desc: "Temporizador de precisión. Modos: Monoestable y Astable. Alimentación: Pin 8 (VCC), Pin 1 (GND). Salida en Pin 3. Trigger < 1/3 VCC activa la salida.",
          image: "simutron/assets/datasheets/555.png"
        },
        "7-Segment": {
          title: "Display de 7 Segmentos (Ánodo Común)",
          desc: "Configuración de pines estándar. Pines 3 y 8 son Ánodo Común (Conectar a VCC). Los segmentos (a-g) se encienden al ponerlos a tierra (Lógica Negativa, ideal para 7447).",
          image: "simutron/assets/datasheets/7segment.png"
        },
        "74283": {
          title: "SN74LS283 4-Bit Binary Full Adder",
          desc: "Sumador completo de 4 bits con acarreo rápido. Suma dos palabras binarias (A y B) más un acarreo de entrada (C0). Salida Sigma 1-4. Alimentación: Pin 16 (VCC), Pin 8 (GND).",
          image: "simutron/assets/datasheets/74283.png"
        }
      };
      return specs[name];
    }
  }
  class Pin {
    constructor(component, id, type = "io") {
      this.component = component;
      this.id = id;
      this.type = type;
      this.net = null;
    }
    connect(net) {
      if (this.net) {
        this.net.removePin(this);
      }
      net.addPin(this);
    }
    disconnect() {
      if (this.net) {
        this.net.removePin(this);
      }
    }
    getVoltage() {
      return this.net ? this.net.voltage : 0;
    }
    setVoltage(v) {
      if (this.net) {
        this.net.setVoltage(v);
      }
    }
  }
  class Component {
    constructor(id, x = 0, y = 0) {
      this.id = id;
      this.x = x;
      this.y = y;
      this.rotation = 0;
      this.pins = [];
      this.engine = null;
      this.metadata = {
        name: "Generic Component",
        description: "Base class"
      };
    }
    addPin(id, type) {
      const pin = new Pin(this, id, type);
      this.pins.push(pin);
      return pin;
    }
    getPin(id) {
      return this.pins.find((p) => p.id === id);
    }
    // Called every simulation step to update internal state (e.g. charging capacitor)
    update(dt) {
    }
    // Called to assert outputs to the nets
    computeOutputs() {
    }
  }
  class VoltageSource extends Component {
    constructor(id, voltage = 5) {
      super(id);
      this.voltage = voltage;
      this.metadata = { name: "Voltage Source", description: `${voltage}V DC Source` };
      this.addPin("pos", "output");
      this.addPin("neg", "input");
    }
    computeOutputs() {
      const posPin = this.getPin("pos");
      const negPin = this.getPin("neg");
      const refVoltage = negPin.getVoltage();
      if (posPin.net) {
        posPin.net.setVoltage(refVoltage + this.voltage);
        posPin.net.isFixed = true;
      }
    }
  }
  class Ground extends Component {
    constructor(id) {
      super(id);
      this.metadata = { name: "Ground", description: "0V Reference" };
      this.addPin("gnd", "bidirectional");
    }
    computeOutputs() {
      const pin = this.getPin("gnd");
      if (pin.net) {
        pin.net.setVoltage(0);
        pin.net.isFixed = true;
        pin.net.ground = true;
      }
    }
  }
  class Resistor extends Component {
    constructor(id, resistance = 1e3) {
      super(id);
      this.resistance = resistance;
      this.metadata = { name: "Resistor", description: `${resistance}Ω` };
      this.addPin("a", "bidirectional");
      this.addPin("b", "bidirectional");
    }
    computeOutputs() {
      const pinA = this.getPin("a");
      const pinB = this.getPin("b");
      if (pinA.net && pinB.net && pinA.net !== pinB.net) {
        const vA = pinA.getVoltage();
        const vB = pinB.getVoltage();
        if (pinA.net.isFixed && !pinB.net.isFixed) {
          pinB.net.setVoltage(vA);
          pinB.net.isFixed = true;
        } else if (!pinA.net.isFixed && pinB.net.isFixed) {
          pinA.net.setVoltage(vB);
          pinA.net.isFixed = true;
        }
      }
    }
  }
  class Capacitor extends Component {
    constructor(id, capacitance = 1e-4, maxVoltage = 25) {
      super(id);
      this.capacitance = capacitance;
      this.maxVoltage = maxVoltage;
      this.voltageAcross = 0;
      this.metadata = {
        name: "Capacitor",
        description: "Electrolytic Capacitor",
        properties: [
          { key: "capacitance", label: "Capacidad (µF)", type: "number", multiplier: 1e6 },
          { key: "maxVoltage", label: "Voltaje (V)", type: "select", options: [10, 16, 25, 35, 50, 100] }
        ]
      };
      this.addPin("pos", "bidirectional");
      this.addPin("neg", "bidirectional");
    }
    update(dt) {
      const vPos = this.getPin("pos").getVoltage();
      const vNeg = this.getPin("neg").getVoltage();
      this.voltageAcross = vPos - vNeg;
    }
  }
  class LED extends Component {
    constructor(id, color = "red") {
      super(id);
      this.color = color;
      this.isOn = false;
      this.forwardVoltage = 2;
      this.metadata = { name: "LED", description: "Light Emitting Diode" };
      this.addPin("anode", "input");
      this.addPin("cathode", "input");
    }
    update(dt) {
      const vA = this.getPin("anode").getVoltage();
      const vK = this.getPin("cathode").getVoltage();
      this.isOn = vA - vK > this.forwardVoltage;
    }
    reset() {
      this.isOn = false;
    }
  }
  class PushSwitch extends Component {
    constructor(id) {
      super(id);
      this.isPressed = false;
      this.metadata = { name: "Push Button", description: "Momentary Switch" };
      this.addPin("a", "bidirectional");
      this.addPin("b", "bidirectional");
    }
    press() {
      this.isPressed = true;
    }
    release() {
      this.isPressed = false;
    }
    computeOutputs() {
      if (!this.isPressed) return;
      const pinA = this.getPin("a");
      const pinB = this.getPin("b");
      if (pinA.net && pinB.net && pinA.net !== pinB.net) {
        if (pinA.net.isFixed && !pinB.net.isFixed) {
          pinB.net.setVoltage(pinA.net.voltage);
          pinB.net.isFixed = true;
        } else if (!pinA.net.isFixed && pinB.net.isFixed) {
          pinA.net.setVoltage(pinB.net.voltage);
          pinA.net.isFixed = true;
        } else if (pinA.net.isFixed && pinB.net.isFixed) {
          pinB.net.setVoltage(pinA.net.voltage);
        }
      }
    }
    reset() {
      this.isPressed = false;
    }
  }
  class IC74xx extends Component {
    constructor(id, modelNumber, numPins = 14) {
      super(id);
      this.modelNumber = modelNumber;
      this.metadata = { name: `74${modelNumber}`, description: "TTL Logic Chip" };
      this.numPins = numPins;
      this.width = numPins / 2 * 20;
      this.height = 50;
      this.gndPin = `p${numPins / 2}`;
      this.vccPin = `p${numPins}`;
      for (let i = 1; i <= numPins; i++) {
        this.addPin(`p${i}`, "io");
      }
    }
    // Power check (More permissive for simulation sagging)
    isPowered() {
      const vcc = this.getPin(this.vccPin).getVoltage();
      const gnd = this.getPin(this.gndPin).getVoltage();
      if (this.modelNumber === "08" && Math.random() < 0.01) {
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
        pin.net.setVoltage(state === 1 ? 5 : 0);
        pin.net.isFixed = true;
      }
    }
  }
  class IC7408 extends IC74xx {
    constructor(id) {
      super(id, "08");
      this.metadata.description = "Quad 2-Input AND Gate";
    }
    computeOutputs() {
      if (!this.isPowered()) return;
      const gates = [
        { a: "p1", b: "p2", y: "p3" },
        // Porta 1: Entradas 1,2 -> Salida 3
        { a: "p4", b: "p5", y: "p6" },
        // Porta 2: Entradas 4,5 -> Salida 6
        { a: "p9", b: "p10", y: "p8" },
        // Porta 3: Entradas 9,10 -> Salida 8
        { a: "p12", b: "p13", y: "p11" }
        // Porta 4: Entradas 12,13 -> Salida 11
      ];
      gates.forEach((gate) => {
        const stateA = this.getLogicState(gate.a);
        const stateB = this.getLogicState(gate.b);
        const result = stateA === 1 && stateB === 1 ? 1 : 0;
        if (Math.random() < 0.01 && (stateA || stateB)) {
          console.log(`Gate [${gate.a}, ${gate.b}] -> ${gate.y}: InA=${stateA} InB=${stateB} Out=${result}`);
        }
        this.setLogicState(gate.y, result);
      });
    }
  }
  class IC7404 extends IC74xx {
    constructor(id) {
      super(id, "04");
      this.metadata.description = "Hex Inverters";
    }
    computeOutputs() {
      const gates = [
        { in: "p1", out: "p2" },
        { in: "p3", out: "p4" },
        { in: "p5", out: "p6" },
        { in: "p9", out: "p8" },
        { in: "p11", out: "p10" },
        { in: "p13", out: "p12" }
      ];
      gates.forEach((gate) => {
        const state = this.getLogicState(gate.in);
        this.setLogicState(gate.out, state === 1 ? 0 : 1);
      });
    }
  }
  class IC7432 extends IC74xx {
    constructor(id) {
      super(id, "32");
      this.metadata.description = "Quad 2-Input OR Gates";
    }
    computeOutputs() {
      const gates = [
        { in1: "p1", in2: "p2", out: "p3" },
        { in1: "p4", in2: "p5", out: "p6" },
        { in1: "p10", in2: "p9", out: "p8" },
        { in1: "p13", in2: "p12", out: "p11" }
      ];
      gates.forEach((gate) => {
        const s1 = this.getLogicState(gate.in1);
        const s2 = this.getLogicState(gate.in2);
        this.setLogicState(gate.out, s1 || s2 ? 1 : 0);
      });
    }
  }
  class IC7447 extends IC74xx {
    constructor(id) {
      super(id, "47", 16);
      this.metadata.description = "BCD to 7-Segment Decoder";
    }
    computeOutputs() {
      const A = this.getLogicState("p7");
      const B = this.getLogicState("p1");
      const C = this.getLogicState("p2");
      const D = this.getLogicState("p6");
      const val = D << 3 | C << 2 | B << 1 | A;
      const patterns = [
        64,
        // 0
        121,
        // 1
        36,
        // 2
        48,
        // 3
        25,
        // 4
        18,
        // 5
        2,
        // 6
        120,
        // 7
        0,
        // 8
        16,
        // 9
        // 10-15 simplified
        127,
        127,
        127,
        127,
        127,
        127
      ];
      const p = patterns[val] || 127;
      this.setLogicState("p13", p >> 0 & 1);
      this.setLogicState("p12", p >> 1 & 1);
      this.setLogicState("p11", p >> 2 & 1);
      this.setLogicState("p10", p >> 3 & 1);
      this.setLogicState("p9", p >> 4 & 1);
      this.setLogicState("p15", p >> 5 & 1);
      this.setLogicState("p14", p >> 6 & 1);
    }
  }
  class IC7490 extends IC74xx {
    constructor(id) {
      super(id, "90");
      this.metadata.description = "Decade Counter";
      this.lastClockA = 0;
      this.lastClockB = 0;
      this.countA = 0;
      this.countB = 0;
    }
    update(dt) {
      const clkA = this.getLogicState("p14");
      const clkB = this.getLogicState("p1");
      const r01 = this.getLogicState("p2");
      const r02 = this.getLogicState("p3");
      const r91 = this.getLogicState("p6");
      const r92 = this.getLogicState("p7");
      if (r01 && r02) {
        this.countA = 0;
        this.countB = 0;
      } else if (r91 && r92) {
        this.countA = 1;
        this.countB = 4;
        this.countA = 1;
        this.countB = 4;
      } else {
        if (this.lastClockA === 1 && clkA === 0) {
          this.countA = (this.countA + 1) % 2;
        }
        if (this.lastClockB === 1 && clkB === 0) {
          this.countB = (this.countB + 1) % 5;
        }
      }
      this.lastClockA = clkA;
      this.lastClockB = clkB;
    }
    computeOutputs() {
      this.setLogicState("p12", this.countA);
      this.setLogicState("p9", this.countB >> 0 & 1);
      this.setLogicState("p8", this.countB >> 1 & 1);
      this.setLogicState("p11", this.countB >> 2 & 1);
    }
  }
  class IC74283 extends IC74xx {
    constructor(id) {
      super(id, "283", 16);
      this.metadata.description = "4-Bit Binary Full Adder with Fast Carry";
    }
    computeOutputs() {
      const c0 = this.getLogicState("p7");
      const a1 = this.getLogicState("p5");
      const b1 = this.getLogicState("p6");
      const a2 = this.getLogicState("p3");
      const b2 = this.getLogicState("p2");
      const a3 = this.getLogicState("p14");
      const b3 = this.getLogicState("p15");
      const a4 = this.getLogicState("p12");
      const b4 = this.getLogicState("p11");
      let carry = c0;
      const s1 = a1 ^ b1 ^ carry;
      carry = a1 & b1 | carry & (a1 ^ b1);
      const s2 = a2 ^ b2 ^ carry;
      carry = a2 & b2 | carry & (a2 ^ b2);
      const s3 = a3 ^ b3 ^ carry;
      carry = a3 & b3 | carry & (a3 ^ b3);
      const s4 = a4 ^ b4 ^ carry;
      carry = a4 & b4 | carry & (a4 ^ b4);
      this.setLogicState("p4", s1);
      this.setLogicState("p1", s2);
      this.setLogicState("p13", s3);
      this.setLogicState("p10", s4);
      this.setLogicState("p9", carry);
    }
  }
  class LM555 extends Component {
    constructor(id) {
      super(id);
      this.metadata = { name: "LM555", description: "Precision Timer" };
      this.width = 140;
      this.height = 50;
      this.addPin("gnd", "input");
      this.addPin("trig", "input");
      this.addPin("out", "output");
      this.addPin("reset", "input");
      this.addPin("cv", "io");
      this.addPin("thresh", "input");
      this.addPin("disch", "io");
      this.addPin("vcc", "input");
      this.latch = false;
    }
    computeOutputs() {
      const vcc = this.getPin("vcc").getVoltage();
      this.getPin("gnd").getVoltage();
      const trig = this.getPin("trig").getVoltage();
      const thresh = this.getPin("thresh").getVoltage();
      const reset = this.getPin("reset").getVoltage();
      if (reset < 1 && this.getPin("reset").net) {
        this.latch = false;
      } else {
        if (trig < vcc / 3) {
          this.latch = true;
        }
        if (thresh > vcc * 2 / 3) {
          this.latch = false;
        }
      }
      const outPin = this.getPin("out");
      if (outPin.net) {
        outPin.net.setVoltage(this.latch ? vcc - 1.5 : 0.1);
        outPin.net.isFixed = true;
      }
      const dischPin = this.getPin("disch");
      if (!this.latch && dischPin.net) {
        dischPin.net.setVoltage(0.2);
        dischPin.net.isFixed = true;
      }
    }
    reset() {
      this.latch = false;
    }
  }
  class LM741 extends Component {
    constructor(id) {
      super(id);
      this.metadata = { name: "LM741", description: "Operational Amplifier" };
      this.width = 80;
      this.height = 50;
      this.addPin("trim1", "input");
      this.addPin("in_inv", "input");
      this.addPin("in_non", "input");
      this.addPin("v_neg", "input");
      this.addPin("trim2", "input");
      this.addPin("out", "output");
      this.addPin("v_pos", "input");
      this.addPin("nc", "input");
      this.gain = 1e5;
    }
    computeOutputs() {
      const vPos = this.getPin("v_pos").getVoltage();
      const vNeg = this.getPin("v_neg").getVoltage();
      const inPos = this.getPin("in_non").getVoltage();
      const inNeg = this.getPin("in_inv").getVoltage();
      let vOut = this.gain * (inPos - inNeg);
      const upperLimit = vPos - 1.5;
      const lowerLimit = vNeg + 1.5;
      if (vOut > upperLimit) vOut = upperLimit;
      if (vOut < lowerLimit) vOut = lowerLimit;
      const outPin = this.getPin("out");
      if (outPin.net) {
        outPin.net.setVoltage(vOut);
        outPin.net.isFixed = true;
      }
    }
  }
  class SevenSegment extends Component {
    constructor(id) {
      super(id);
      this.metadata = { name: "7-Segment", description: "Common Anode Display" };
      const pins = ["a", "b", "vcc1", "c", "d", "e", "f", "vcc2", "g", "dp"];
      pins.forEach((p) => this.addPin(p, "io"));
      this.states = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, dp: 0 };
    }
    computeOutputs() {
      const vcc1 = this.getPin("vcc1");
      const vcc2 = this.getPin("vcc2");
      const vcc = Math.max(vcc1.getVoltage(), vcc2.getVoltage());
      const isPowered = vcc > 3;
      const segments = ["a", "b", "c", "d", "e", "f", "g", "dp"];
      segments.forEach((seg) => {
        const pin = this.getPin(seg);
        const v = pin.getVoltage();
        const isConnected = pin.net && pin.net.pins.size > 1;
        const isLow = v < 1;
        this.states[seg] = isPowered && isConnected && isLow ? 1 : 0;
      });
    }
  }
  class SignalGenerator extends Component {
    constructor(id) {
      super(id);
      this.waveform = "pulse";
      this.frequency = 1;
      this.magnitude = 2;
      this.dutyCycle = 50;
      this.offset = 0;
      this.isFloating = true;
      this.probes = {
        out: { x: 20, y: 60 },
        com: { x: 60, y: 60 }
      };
      this.metadata = {
        name: "Signal Generator",
        description: "Generador de señales senoidal y de pulsos"
      };
      this.addPin("out", "output");
      this.addPin("com", "input");
    }
    computeOutputs() {
      const outPin = this.getPin("out");
      const comPin = this.getPin("com");
      const refVoltage = comPin.getVoltage();
      const t = this.engine ? this.engine.time : 0;
      let voltage = 0;
      if (this.waveform === "sine") {
        voltage = this.offset + this.magnitude * Math.sin(2 * Math.PI * this.frequency * t);
      } else if (this.waveform === "pulse") {
        const period = 1 / this.frequency;
        const timeInPeriod = t % period;
        const highTime = period * (this.dutyCycle / 100);
        voltage = timeInPeriod < highTime ? this.offset + this.magnitude : this.offset;
      }
      if (outPin.net) {
        outPin.net.setVoltage(refVoltage + voltage);
        outPin.net.isFixed = true;
      }
    }
  }
  class Voltmeter extends Component {
    constructor(id) {
      super(id);
      this.value = 0;
      this.metadata = { name: "Voltimetro", description: "Mide la diferencia de potencial entre dos puntos" };
      this.isFloating = true;
      this.probes = {
        pos: { x: 20, y: 100 },
        neg: { x: 50, y: 100 }
      };
      this.addPin("pos", "input");
      this.addPin("neg", "input");
      setTimeout(() => this.update(), 50);
    }
    update() {
      const p1 = this.getPin("pos");
      const p2 = this.getPin("neg");
      const isP1Active = p1.net && (p1.net.isFixed || p1.net.pins.size > 1);
      const isP2Active = p2.net && (p2.net.isFixed || p2.net.pins.size > 1);
      if (isP1Active && isP2Active) {
        this.value = p1.getVoltage() - p2.getVoltage();
      } else {
        this.value = 0;
      }
      const display = document.getElementById(`meter-val-${this.id}`);
      if (display) {
        let text = Math.abs(this.value).toFixed(2);
        if (this.value < -1e-3) text = "-" + Math.abs(this.value).toFixed(2);
        if (Math.abs(this.value) < 1e-3) text = "0.00";
        display.textContent = text;
        display.style.color = "#00ff41";
        display.style.textShadow = "0 0 10px #00ff41, 0 0 20px rgba(0,255,65,0.5)";
        display.style.fontWeight = "900";
      }
    }
    // Voltmeters have high impedance, they shouldn't influence the circuit
    computeOutputs() {
    }
  }
  class Ammeter extends Component {
    constructor(id) {
      super(id);
      this.value = 0;
      this.metadata = { name: "Amperimetro", description: "Mide la intensidad de corriente en serie" };
      this.addPin("a", "input");
      this.addPin("b", "output");
    }
    computeOutputs() {
      const pinA = this.getPin("a");
      const pinB = this.getPin("b");
      if (pinA.net && pinB.net) {
        const v = pinA.getVoltage();
        pinB.net.setVoltage(v);
      }
    }
    update() {
      this.value = 0;
      const display = document.getElementById(`meter-val-${this.id}`);
      if (display) {
        display.textContent = `${this.value.toFixed(2)}A`;
        display.style.color = Math.abs(this.value) > 1e-3 ? "#0ff" : "#044";
        display.style.textShadow = Math.abs(this.value) > 1e-3 ? "0 0 5px #0ff" : "none";
      }
    }
  }
  class Oscilloscope extends Component {
    constructor(id) {
      super(id);
      this.bufferSize = 400;
      this.channels = {
        ch1: new Array(this.bufferSize).fill(0),
        ch2: new Array(this.bufferSize).fill(0)
      };
      this.timebase = 0.2;
      this.voltsPerDiv = [2, 2];
      this.active = true;
      this.isFloating = true;
      this.probes = {
        ch1: { x: 20, y: 100 },
        ch2: { x: 60, y: 100 },
        gnd: { x: 100, y: 100 }
      };
      this.sampleTimer = 0;
      this.metadata = { name: "Osciloscopio", description: "Monitor de señales de alta precisión" };
      this.addPin("ch1", "input");
      this.addPin("ch2", "input");
      this.addPin("gnd", "input");
    }
    update(dt) {
      if (!this.active) return;
      const sampleInterval = this.timebase / this.bufferSize;
      this.sampleTimer += dt;
      if (this.sampleTimer >= sampleInterval) {
        this.sampleTimer = 0;
        const ref = this.getPin("gnd").getVoltage();
        const v1 = this.getPin("ch1").getVoltage() - ref;
        const v2 = this.getPin("ch2").getVoltage() - ref;
        this.channels.ch1.shift();
        this.channels.ch1.push(v1);
        this.channels.ch2.shift();
        this.channels.ch2.push(v2);
      }
    }
    computeOutputs() {
    }
  }
  class App {
    constructor() {
      console.log("App: Initializing...");
      this.engine = new Engine();
      console.log("App: Engine created.");
      this.breadboard = new Breadboard(this.engine);
      console.log("App: Breadboard created.");
      this.renderer = new Renderer("bg-canvas");
      console.log("App: Renderer created.");
      this.factory = new ChipFactory();
      console.log("App: Factory created.");
      this.interaction = new Interaction(this.engine, this.breadboard, "canvas-container");
      console.log("App: Interaction created.");
      this.schematicManager = new SchematicManager();
      console.log("App: SchematicManager created.");
      this.isHelpActive = false;
      this.compClasses = {
        "Voltage Source": VoltageSource,
        "Ground": Ground,
        "Resistor": Resistor,
        "Capacitor": Capacitor,
        "LED": LED,
        "Push Button": PushSwitch,
        "7408": IC7408,
        "7404": IC7404,
        "7432": IC7432,
        "7447": IC7447,
        "7490": IC7490,
        "74283": IC74283,
        "LM555": LM555,
        "LM741": LM741,
        "7-Segment": SevenSegment,
        "Signal Generator": SignalGenerator,
        "Voltimetro": Voltmeter,
        "Amperimetro": Ammeter,
        "Oscilloscope": Oscilloscope
      };
      this.interaction.onComponentSelected = (comp) => {
        if (this.isHelpActive) this.schematicManager.show(comp);
      };
      this.interaction.onComponentDeselected = () => {
      };
      this.setupPalette();
      this.setupControls();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }
    setupPalette() {
      const palette = document.getElementById("palette-list");
      palette.innerHTML = "";
      const categories = [
        {
          name: "Energía y Suministro",
          items: [
            { name: "Fuente de Voltaje", Class: VoltageSource },
            { name: "Tierra (GND)", Class: Ground },
            { name: "Generador Señal", Class: SignalGenerator }
          ]
        },
        {
          name: "Componentes Pasivos",
          items: [
            { name: "Resistencia", Class: Resistor },
            { name: "Capacitor", Class: Capacitor }
          ]
        },
        {
          name: "E/S y Displays",
          items: [
            { name: "Pulsador", Class: PushSwitch },
            { name: "LED", Class: LED },
            { name: "7-Segment Display", Class: SevenSegment }
          ]
        },
        {
          name: "Instrumentos de Medida",
          items: [
            { name: "Voltimetro", Class: Voltmeter },
            { name: "Amperimetro", Class: Ammeter },
            { name: "Osciloscopio", Class: Oscilloscope }
          ]
        },
        {
          name: "Más Componentes",
          items: [
            { name: "Temporizador 555", Class: LM555 },
            { name: "Amplificador 741", Class: LM741 },
            { name: "Librería Serie 74xx 📚", Class: "Library" }
          ]
        }
      ];
      categories.forEach((cat) => {
        const catDiv = document.createElement("div");
        catDiv.className = "palette-category" + (cat.collapsed ? " collapsed" : "");
        const header = document.createElement("div");
        header.className = "category-header";
        header.innerText = cat.name;
        header.onclick = () => catDiv.classList.toggle("collapsed");
        const content = document.createElement("div");
        content.className = "category-content";
        cat.items.forEach((item) => {
          const btn = document.createElement("div");
          btn.className = "component-card";
          btn.innerHTML = `<strong>${item.name}</strong>`;
          btn.onclick = () => {
            if (item.Class === "Library") {
              this.openLibraryModal();
            } else {
              this.addComponent(new item.Class(this.generateId(item.name)));
            }
          };
          content.appendChild(btn);
        });
        catDiv.appendChild(header);
        catDiv.appendChild(content);
        palette.appendChild(catDiv);
      });
    }
    openLibraryModal() {
      const modal = document.getElementById("modal-container");
      const grid = document.getElementById("library-grid");
      const closeBtn = document.getElementById("close-modal");
      grid.innerHTML = "";
      modal.style.display = "flex";
      const chips = [
        { name: "7408", Class: IC7408, desc: "Quad 2-Input AND Gate" },
        { name: "7404", Class: IC7404, desc: "Hex Inverter (NOT)" },
        { name: "7432", Class: IC7432, desc: "Quad 2-Input OR Gate" },
        { name: "7490", Class: IC7490, desc: "Decade Counter (MOD-10)" },
        { name: "7447", Class: IC7447, desc: "BCD to 7-Segment Decoder" },
        { name: "74283", Class: IC74283, desc: "4-Bit Binary Full Adder" }
      ];
      chips.forEach((chip) => {
        const card = document.createElement("div");
        card.className = "library-card";
        card.innerHTML = `
        <div class="chip-model">${chip.name}</div>
        <div class="chip-desc">${chip.desc}</div>
      `;
        card.onclick = () => {
          this.addComponent(new chip.Class(this.generateId(chip.name)));
          modal.style.display = "none";
        };
        grid.appendChild(card);
      });
      closeBtn.onclick = () => modal.style.display = "none";
      modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
      };
    }
    generateId(prefix) {
      return prefix.replace(/\s+/g, "") + "_" + Math.floor(Math.random() * 1e3);
    }
    addComponent(component) {
      if (component.metadata.name === "Voltage Source") {
        component.x = BB_START_X + 9;
        component.y = BB_START_Y - 3 * GRID_SIZE - 12;
      } else {
        component.x = 100 + Math.random() * 50;
        component.y = 100 + Math.random() * 50;
      }
      this.engine.addComponent(component);
      const el = this.factory.createVisual(component);
      document.getElementById("component-layer").appendChild(el);
      this.interaction.registerComponent(component, el);
      this.interaction.snapComponent(component, el);
      this.interaction.rebuildTopology();
    }
    setupControls() {
      const btnRun = document.getElementById("btn-run");
      const btnStop = document.getElementById("btn-stop");
      btnRun.onclick = () => {
        this.engine.start();
        btnRun.classList.add("active");
        btnStop.classList.remove("active");
      };
      btnStop.onclick = () => {
        this.engine.stop();
        btnRun.classList.remove("active");
        btnStop.classList.add("active");
        setTimeout(() => btnStop.classList.remove("active"), 200);
      };
      document.getElementById("btn-reset").onclick = () => location.reload();
      const btnHelp = document.getElementById("btn-help");
      btnHelp.onclick = () => {
        this.isHelpActive = !this.isHelpActive;
        btnHelp.classList.toggle("active", this.isHelpActive);
        if (this.isHelpActive) {
          if (this.interaction.selectedComponent) {
            this.schematicManager.show(this.interaction.selectedComponent.comp);
          } else {
            this.schematicManager.viewer.style.display = "flex";
          }
        } else {
          this.schematicManager.hide();
        }
      };
      document.getElementById("close-schematic").onclick = () => {
        this.isHelpActive = false;
        btnHelp.classList.remove("active");
        this.schematicManager.hide();
      };
      document.getElementById("btn-save").onclick = () => this.saveCircuit();
      document.getElementById("btn-load").onclick = () => document.getElementById("file-input").click();
      document.getElementById("file-input").onchange = (e) => this.loadCircuit(e);
    }
    saveCircuit() {
      const circuitData = {
        components: Array.from(this.engine.components).map((comp) => ({
          type: comp.metadata.name,
          id: comp.id,
          x: comp.x,
          y: comp.y,
          rotation: comp.rotation || 0,
          properties: {
            resistance: comp.resistance,
            capacitance: comp.capacitance,
            maxVoltage: comp.maxVoltage,
            voltage: comp.voltage,
            color: comp.color
          }
        })),
        wires: this.interaction.connections.map((conn) => ({
          p1: this.serializeEndpoint(conn.p1),
          p2: this.serializeEndpoint(conn.p2),
          color: conn.color,
          offset: conn.offset
        }))
      };
      const blob = new Blob([JSON.stringify(circuitData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `circuito_${(/* @__PURE__ */ new Date()).getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    serializeEndpoint(ep) {
      if (ep.type === "pin") {
        return { type: "pin", compId: ep.comp.id, pinId: ep.pin.id };
      } else {
        return { type: "hole", r: ep.r, c: ep.c };
      }
    }
    async loadCircuit(e) {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      this.engine.stop();
      const componentsToRemove = Array.from(this.engine.components);
      componentsToRemove.forEach((comp) => {
        let el = null;
        for (const [vEl, c] of this.interaction.componentMap.entries()) {
          if (c === comp) {
            el = vEl;
            break;
          }
        }
        this.interaction.deleteComponent(comp, el);
      });
      this.interaction.connections = [];
      const compMap = /* @__PURE__ */ new Map();
      data.components.forEach((cData) => {
        const CompClass = this.compClasses[cData.type];
        if (CompClass) {
          const comp = new CompClass(cData.id);
          comp.x = cData.x;
          comp.y = cData.y;
          comp.rotation = cData.rotation;
          if (cData.properties) {
            if (cData.properties.resistance) comp.resistance = cData.properties.resistance;
            if (cData.properties.capacitance) comp.capacitance = cData.properties.capacitance;
            if (cData.properties.maxVoltage) comp.maxVoltage = cData.properties.maxVoltage;
            if (cData.properties.voltage) comp.voltage = cData.properties.voltage;
            if (cData.properties.color) comp.color = cData.properties.color;
          }
          this.engine.addComponent(comp);
          const el = this.factory.createVisual(comp);
          document.getElementById("component-layer").appendChild(el);
          this.interaction.registerComponent(comp, el);
          el.style.left = `${comp.x}px`;
          el.style.top = `${comp.y}px`;
          if (comp.rotation) el.style.transform = `rotate(${comp.rotation}deg)`;
          compMap.set(comp.id, comp);
        }
      });
      data.wires.forEach((wData) => {
        const p1 = this.deserializeEndpoint(wData.p1, compMap);
        const p2 = this.deserializeEndpoint(wData.p2, compMap);
        if (p1 && p2) {
          this.interaction.connections.push({
            p1,
            p2,
            color: wData.color,
            offset: wData.offset
          });
        }
      });
      this.interaction.rebuildTopology();
      this.interaction.updateWires();
      e.target.value = "";
    }
    deserializeEndpoint(epData, compMap) {
      if (epData.type === "pin") {
        const comp = compMap.get(epData.compId);
        if (comp) {
          const pin = comp.getPin(epData.pinId);
          return { type: "pin", comp, pin };
        }
      } else {
        const coords = this.interaction.getHoleCoords(epData.r, epData.c);
        return {
          type: "hole",
          r: epData.r,
          c: epData.c,
          x: coords.x,
          y: coords.y,
          net: this.breadboard.getNetAt(epData.r, epData.c)
        };
      }
      return null;
    }
    loop() {
      this.interaction.updateWires();
      this.engine.components.forEach((comp) => {
        const name = comp.metadata.name;
        if (name === "LED") {
          const bulb = document.getElementById(`led-bulb-${comp.id}`);
          if (bulb) {
            const color = comp.color || "#f00";
            bulb.style.opacity = comp.isOn ? "1" : "0.3";
            bulb.style.background = comp.isOn ? color : `radial-gradient(circle at 30% 30%, ${color}, #000)`;
            bulb.style.boxShadow = comp.isOn ? `0 0 15px ${color}, 0 0 5px ${color}` : "none";
          }
        } else if (name === "7-Segment") {
          const segs = ["a", "b", "c", "d", "e", "f", "g", "dp"];
          segs.forEach((s) => {
            const segEl = document.getElementById(`seg-${comp.id}-${s}`);
            if (segEl) {
              const on = comp.states[s];
              segEl.style.background = on ? "#ff0000" : "#220000";
              segEl.style.boxShadow = on ? "0 0 8px #ff0000" : "none";
            }
          });
        } else if (name === "Voltimetro" || name === "Amperimetro") {
          comp.update();
        }
      });
      requestAnimationFrame(this.loop);
    }
  }
  window.app = new App();
})();
