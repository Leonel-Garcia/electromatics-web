---
name: UI-UX-Refinement
description: Enhances the visual aesthetics and user experience of web applications with a focus on premium designs, micro-animations, and responsive layouts.
---

# UI-UX Refinement Skill

## Core Principles

1. **Premium Aesthetics**: Use curated color palettes (not defaults), glassmorphism, and subtle gradients.
2. **Micro-animations**: Implement hover effects, transitions, and state changes to make the interface feel alive.
3. **Responsive Excellence**: Ensure all components adapt seamlessly to different screen sizes.
4. **Visual Hierarchy**: Use typography and spacing to guide the user's attention.

## Design Tokens (Preferred)

- **Glassmorphism**: `backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);`
- **Glow Effects**: `box-shadow: 0 0 15px var(--glow-color);`
- **Transitions**: `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);`

## Workflow

- Before implementing a UI change, identify the state (hover, active, focus) and define its transition.
- Use SVG filters for organic effects like shadows or glows in complex components (like the simulator wires).
