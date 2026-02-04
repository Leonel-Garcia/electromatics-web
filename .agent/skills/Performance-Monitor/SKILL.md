---
name: Performance-Monitor
description: Analyzes and optimizes the runtime performance of applications, specifically for real-time simulations.
---

# Performance Monitor Skill

## Core Principles

1. **FPS Efficiency**: Maintain a steady 60 FPS in the simulation loop.
2. **Memory Leak Detection**: Monitor the allocation of DOM elements and event listeners, especially during component deletion/creation.
3. **Execution Profiling**: Identify bottlenecks in the `Engine.solveNetwork()` and `Renderer.loop()` methods.
4. **Debouncing & Throttling**: Use optimization techniques for events that fire rapidly (like mousemove during wiring).

## Performance Guidelines

- **SVG Minimization**: Reuse SVG elements instead of recreating them when possible.
- **RequestAnimationFrame**: Always use standard loop timing for UI updates.
- **Detached Logic**: Separate mathematical calculations from DOM updates.
