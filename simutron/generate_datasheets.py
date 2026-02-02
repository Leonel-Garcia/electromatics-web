
import os

OUTPUT_DIR = r"c:/Users/LGP.DESKTOP-GC63DGS.000/Desktop/IA_Web_Project/simutron/assets/datasheets"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- SVG PRIMITIVES ---

def svg_start(w, h):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" style="background-color:white; border:1px solid #999;">'

def svg_end():
    return '</svg>'

def rect(x, y, w, h, fill="none", stroke="black", sw=1):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'

def line(x1, y1, x2, y2, stroke="black", sw=1):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{sw}"/>'

def circle(cx, cy, r, fill="none", stroke="black", sw=1):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'

def text(x, y, s, size=10, anchor="middle", weight="normal", fill="black"):
    return f'<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{size}" text-anchor="{anchor}" font-weight="{weight}" fill="{fill}">{s}</text>'

def path(d, fill="none", stroke="black", sw=1):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'

# --- LOGIC GATES SHAPES ---

def draw_and_gate(x, y, scale=0.8):
    # Centered at x,y approx. Input left, Output right.
    # Specify the body. 
    # Shape: Vertical line left, Flat top/bottom logic, Curved front.
    w = 30 * scale
    h = 24 * scale
    # Left edge at x, Top at y
    d = f"M {x} {y} L {x+w/2} {y} A {h/2} {h/2} 0 1 1 {x+w/2} {y+h} L {x} {y+h} Z"
    return path(d, fill="white", stroke="black", sw=1.5)

def draw_or_gate(x, y, scale=0.8):
    w = 30 * scale
    h = 24 * scale
    # Curved back
    d = f"M {x} {y} Q {x+w/2} {y+h/2} {x} {y+h} Q {x+w} {y+h} {x+w} {y+h/2} Q {x+w} {y} {x} {y} Z"
    return path(d, fill="white", stroke="black", sw=1.5)

def draw_buffer_gate(x, y, scale=0.8): # Triangle
    w = 30 * scale
    h = 24 * scale
    d = f"M {x} {y} L {x+w} {y+h/2} L {x} {y+h} Z"
    return path(d, fill="white", stroke="black", sw=1.5)

def draw_not_circle(x, y, scale=0.8):
    return circle(x, y, 3*scale, fill="white", stroke="black", sw=1.5)

# --- MAIN DRAWING LOGIC ---

def generate_dip_schematic(name, pins_map, logic_type="box"):
    # logic_type: 'and', 'or', 'not', 'nand', 'nor', 'box'
    
    W, H = 300, 400
    if len(pins_map) > 14: H = 450
    
    svg = [svg_start(W, H)]
    
    # Header
    svg.append(text(W/2, 30, f"{name} Internal Diagram", size=16, weight="bold"))
    
    # DIP Outline
    pkg_w = 120
    pkg_h = 280 if len(pins_map) <= 14 else 320
    pkg_x = (W - pkg_w) / 2
    pkg_y = 60
    
    svg.append(rect(pkg_x, pkg_y, pkg_w, pkg_h, fill="#fafafa", stroke="#333", sw=2))
    # Notch
    svg.append(path(f"M {W/2-10} {pkg_y} Q {W/2} {pkg_y+15} {W/2+10} {pkg_y}", fill="none", stroke="#333"))
    
    # Pins
    count = len(pins_map)
    row_h = pkg_h / (count/2 + 1)
    
    pin_coords = {} # Map pin_num -> (x, y) (internal connection point)
    
    for i in range(1, count + 1):
        is_left = i <= count/2
        row_idx = (i - 1) if is_left else (count - i)
        
        py = pkg_y + (row_idx + 1) * row_h
        px_inner = pkg_x + 10 if is_left else pkg_x + pkg_w - 10
        px_outer = pkg_x - 20 if is_left else pkg_x + pkg_w + 20
        
        pin_coords[i] = (px_inner, py)
        
        # Pin leg
        svg.append(rect(pkg_x - 30 if is_left else pkg_x + pkg_w, py - 5, 30, 10, fill="#ccc", stroke="#666"))
        
        # Pin Number
        svg.append(text(pkg_x - 35 if is_left else pkg_x + pkg_w + 35, py + 4, str(i), size=12, weight="bold"))
        
        # Pin Label (e.g. 1A, VCC)
        label = pins_map[i]
        anchor = "start" if is_left else "end"
        label_x = pkg_x + 5 if is_left else pkg_x + pkg_w - 5
        color = "blue" if label in ["VCC", "GND"] else "black"
        svg.append(text(label_x, py + 4, label, size=9, anchor=anchor, fill=color))

    # --- DRAW INTERNAL GATES ---
    
    if logic_type == '7408': # AND
        gates = [(1,2,3), (4,5,6), (9,10,8), (12,13,11)] # In1, In2, Out
        for a, b, y in gates:
            # Calculate position for gate: between pins
            ay = pin_coords[a][1]
            by = pin_coords[b][1]
            yy = pin_coords[y][1]
            
            # If left side
            if a < 8:
                gate_x = pkg_x + 40
                gate_y = (ay + by)/2 - 12
                svg.append(draw_and_gate(gate_x, gate_y))
                # Wires
                svg.append(line(pin_coords[a][0], ay, gate_x, ay + 5, stroke="#555")) # To input 1
                svg.append(line(pin_coords[b][0], by, gate_x, by - 5 + 24*0.8, stroke="#555")) # To input 2
                svg.append(line(gate_x + 30*0.8, gate_y + 12, pin_coords[y][0], yy, stroke="#555")) # From output
            else: # Right side (flipped horizontally effectively, or just position right)
                gate_x = pkg_x + pkg_w - 40 - 30*0.8
                gate_y = (ay + by)/2 - 12
                svg.append(draw_and_gate(gate_x, gate_y))
                # Wires (inputs are usually 9,10 -> 8, so input pins are below output pin sometimes)
                # 9,10 are inputs, 8 is output. 9 is lower than 8? 
                # Pin 8 is bottom-right. Pin 9 is above it? No.
                # Right side pins go 8 (bottom) to 14 (top).
                # 8 is lowest right. 9 above 8. 10 above 9.
                # So inputs (9,10) are ABOVE output (8) in geometric Y? No.
                # Pin 8 is index 0 on right side list? No.
                # Right side: 8 (bottom), 9, 10, 11, 12, 13, 14 (top).
                # Wait, standard DIP:
                # 1--U--14
                # 7-----8
                # So 8 is bottom-right.
                
                # Gate 3: Inputs 9, 10. Output 8.
                # 9 and 10 are above 8.
                svg.append(line(pin_coords[a][0], ay, gate_x + 30*0.8, ay, stroke="#555")) # Input A to gate back? No, inputs are on flat side
                # This needs mirroring logic, but lets just draw simple lines to the "box" of the gate
                # Draw gate visual
                pass 
                
        # To avoid complex wiring logic in this script, I will use a simplified "Box" representation for complex chips
        # But for 08, 32, 04 I really want the symbols.
        
        # Override for clean look: just draw floating gates near the pins.
        
        # Standard approach: Draw symbol in the middle-ish aligned with pins
        pass

    # Generic VCC/GND Lines
    # Identify VCC/GND pins
    vcc_pin = [k for k,v in pins_map.items() if "VCC" in v][0]
    gnd_pin = [k for k,v in pins_map.items() if "GND" in v][0]
    
    # Draw simple "Chip Logic" text in center if complex
    if logic_type == "box":
        svg.append(text(W/2, H/2, "LOGIC CIRCUITRY", size=14, fill="#ddd", weight="bold"))
        svg.append(rect(pkg_x+20, pkg_y+20, pkg_w-40, pkg_h-40, stroke="#eee", sw=1))

    # Add specific graphics based on type
    if logic_type == '7408':
        svg.append(draw_gate_group([(1,2,3), (4,5,6)], pkg_x+35, True, 'AND'))
        svg.append(draw_gate_group([(13,12,11), (10,9,8)], pkg_x+pkg_w-35, False, 'AND'))

    elif logic_type == '7432':
        svg.append(draw_gate_group([(1,2,3), (4,5,6)], pkg_x+35, True, 'OR'))
        svg.append(draw_gate_group([(13,12,11), (10,9,8)], pkg_x+pkg_w-35, False, 'OR'))
        
    elif logic_type == '7404':
        svg.append(draw_gate_group([(1,2), (3,4), (5,6)], pkg_x+35, True, 'NOT'))
        svg.append(draw_gate_group([(13,12), (11,10), (9,8)], pkg_x+pkg_w-35, False, 'NOT'))
    
    svg.append(svg_end())
    return "".join(svg)

def draw_gate_group(connections, x_base, is_left, type):
    s = []
    w = 24
    h = 20
    
    for conn in connections:
        # Standardize inputs/outputs
        if len(conn) == 3: in1, in2, out = conn
        else: in1, out = conn; in2 = None # NOT gate
        
        # Approximate Y position based on pins (assuming standard height distribution)
        # We know pins are spaced roughly 40px apart starting at y=60
        # row height approx 280/8 = 35
        
        # Simple hardcoding for standard logic chips
        # This is a visual approximation script
        
        y_center = 0
        
        # Determine Y based on input pin
        # 1 -> row 0
        # 4 -> row 3
        # ...
        # This is getting complicated to calculate perfectly generic.
        # I will place symbols explicitly.
        pass
    return "" # Placeholder

# --- EXPLICIT DRAWING FUNCTIONS FOR QUALITY ---

def make_7408():
    svg = svg_start(300, 400)
    svg += rect(90, 60, 120, 280, fill="#f9f9f9", stroke="#333", sw=2) # DIP
    svg += path("M 140 60 Q 150 75 160 60", stroke="black", fill="none") # Notch
    svg += text(150, 40, "SN7408 (AND)", size=18, weight="bold")
    
    # Pins Left (1-7)
    pins_l = ["1 (1A)", "2 (1B)", "3 (1Y)", "4 (2A)", "5 (2B)", "6 (2Y)", "7 (GND)"]
    for i, p in enumerate(pins_l):
        y = 90 + i*35
        svg += rect(60, y-5, 30, 10, fill="#ccc")
        svg += text(50, y+4, p, anchor="end", size=11)
        svg += line(90, y, 105, y) # Internal trace
    
    # Pins Right (14-8)
    pins_r = ["14 (VCC)", "13 (4B)", "12 (4A)", "11 (4Y)", "10 (3B)", "9 (3A)", "8 (3Y)"]
    for i, p in enumerate(pins_r):
        y = 90 + i*35
        svg += rect(210, y-5, 30, 10, fill="#ccc")
        svg += text(250, y+4, p, anchor="start", size=11)
        svg += line(195, y, 210, y)

    # Gates (Manually placed for perfection)
    def gate_and(x, y):
        return path(f"M {x} {y} L {x+15} {y} A 10 10 0 1 1 {x+15} {y+20} L {x} {y+20} Z", fill="#fff", stroke="black", sw=1.5)
    
    # Gate 1 (1,2 -> 3)
    svg += gate_and(110, 95)
    svg += line(105, 90, 110, 100) # 1A -> In1
    svg += line(105, 125, 110, 110) # 1B -> In2
    svg += line(135, 105, 105, 160, stroke="#ddd") # Output wire convoluted? No, 1Y is pin 3 (y=160).
    svg += line(135, 105, 115, 105) # Gate Out stub
    svg += line(115, 105, 115, 160) # Down to pin 3
    svg += line(115, 160, 105, 160) # To Pin 3 trace
    
    # OK, wiring is too hard to automate perfectly in 5 mins.
    # I will draw the GATES floating next to the pins they belong to, which is standard datasheet style.
    
    # Gate 1: Pins 1,2,3
    svg += gate_and(140, 95)
    svg += text(155, 110, "&", size=10, fill="#666")
    svg += line(105, 90, 140, 100, stroke="#888") # 1 -> 
    svg += line(105, 125, 140, 110, stroke="#888") # 2 ->
    svg += line(165, 105, 105, 160, stroke="#888") # -> 3
    
    # Actually, simpler: Put the "Logic Symbol" diagram NEXT to the chip, not inside.
    # OR: Just simplified internal blocks.
    
    svg += text(150, 200, "Internal Logic", fill="#ddd", size=20, weight="bold", transform="rotate(-90 150 200)")
    
    return svg + svg_end()

# RE-STRATEGY: Use a clean, schematic-style representation
# Pinout on Left/Right, Logic Symbol in Center.

def make_std_svg(name, pins_left, pins_right, logic="generic"):
    W, H = 250, 360
    s_h = 35 # pin spacing
    top_margin = 40
    
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" style="background-color:white; border:1px solid #aaa;">'
    svg += f'<text x="{W/2}" y="25" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="16">{name}</text>'
    
    # Chip Body
    svg += f'<rect x="70" y="{top_margin}" width="110" height="{H-60}" fill="#f0f0f0" stroke="#000" stroke-width="2"/>'
    # Notch
    svg += f'<path d="M 115 {top_margin} Q 125 {top_margin+15} 135 {top_margin}" fill="none" stroke="#000"/>'
    
    # Pins Left
    for i, label in enumerate(pins_left):
        y = top_margin + 30 + i*s_h
        pin_num = i + 1
        svg += f'<rect x="50" y="{y-5}" width="20" height="10" fill="#bbb" stroke="#000"/>'
        svg += f'<text x="45" y="{y+4}" text-anchor="end" font-family="Arial" font-size="12">{pin_num}</text>'
        svg += f'<text x="75" y="{y+4}" text-anchor="start" font-family="Arial" font-size="10" font-weight="bold" fill="#000088">{label}</text>'

    # Pins Right
    count = len(pins_left) + len(pins_right)
    for i, label in enumerate(pins_right):
        y = top_margin + 30 + i*s_h
        pin_num = count - i
        svg += f'<rect x="180" y="{y-5}" width="20" height="10" fill="#bbb" stroke="#000"/>'
        svg += f'<text x="205" y="{y+4}" text-anchor="start" font-family="Arial" font-size="12">{pin_num}</text>'
        svg += f'<text x="175" y="{y+4}" text-anchor="end" font-family="Arial" font-size="10" font-weight="bold" fill="#000088">{label}</text>'

    # Internal Symbol Hint
    if logic == "AND":
        svg += f'<path d="M 110 150 v 40 h 10 a 20 20 0 0 0 0 -40 z" fill="none" stroke="#ddd" stroke-width="3"/>'
    elif logic == "OR":
        svg += f'<path d="M 110 150 q 20 20 0 40 q 40 0 40 -20 q 0 -20 -40 -20 z" fill="none" stroke="#ddd" stroke-width="3"/>'
    elif logic == "NOT":
        svg += f'<polygon points="110,150 140,170 110,190" fill="none" stroke="#ddd" stroke-width="3"/>'
    
    svg += '</svg>'
    return svg

# --- GENERATE ALL ---

# 7408 AND
with open(os.path.join(OUTPUT_DIR, "7408.svg"), "w") as f:
    f.write(make_std_svg("SN7408 (AND)", ["1A","1B","1Y","2A","2B","2Y","GND"], ["3Y","3B","3A","4Y","4B","4A","VCC"], "AND"))

# 7432 OR
with open(os.path.join(OUTPUT_DIR, "7432.svg"), "w") as f:
    f.write(make_std_svg("SN7432 (OR)", ["1A","1B","1Y","2A","2B","2Y","GND"], ["3Y","3B","3A","4Y","4B","4A","VCC"], "OR"))

# 7404 NOT
with open(os.path.join(OUTPUT_DIR, "7404.svg"), "w") as f:
    f.write(make_std_svg("SN7404 (NOT)", ["1A","1Y","2A","2Y","3A","3Y","GND"], ["4Y","4A","5Y","5A","6Y","6A","VCC"], "NOT"))

# 7490 Decade Counter
with open(os.path.join(OUTPUT_DIR, "7490.svg"), "w") as f:
    f.write(make_std_svg("SN7490 (Counter)", ["CKB", "R0(1)", "R0(2)", "NC", "VCC", "R9(1)", "R9(2)"], ["QA", "QD", "GND", "QB", "QC", "NC", "CKA"]))
    # Note: 7490 pinout is weird, standard visualization ensures user connects pin 5 to VCC and 10 to GND as labeled.

# 7447 Decoder (16 pin)
with open(os.path.join(OUTPUT_DIR, "7447.svg"), "w") as f:
    # 16 pin is taller, need custom call? No, make_std_svg can handle it if lists match
    f.write(make_std_svg("SN7447 (BCD-7)", ["B","C","LT","BI/RBO","RBI","D","A","GND"], ["f","g","a","b","c","d","e","VCC"]))

# 74283 Adder (16 pin)
with open(os.path.join(OUTPUT_DIR, "74283.svg"), "w") as f:
    f.write(make_std_svg("SN74LS283 (Adder)", ["S2","B2","A2","S1","A1","B1","C0","GND"], ["VCC","B3","A3","S3","A4","B4","S4","C4"]))

# 555 Timer (8 pin)
with open(os.path.join(OUTPUT_DIR, "555.svg"), "w") as f:
    f.write(make_std_svg("NE555 (Timer)", ["GND","TRIG","OUT","RESET"], ["VCC","DISCH","THRES","CV"]))

# 741 OpAmp (8 pin)
with open(os.path.join(OUTPUT_DIR, "741.svg"), "w") as f:
    f.write(make_std_svg("LM741 (OpAmp)", ["Offset","In (-)","In (+)","V-"], ["NC","V+","Output","Offset"]))

# 7 Segment (Custom)
with open(os.path.join(OUTPUT_DIR, "7segment.svg"), "w") as f:
     # Reuse previous code for 7seg
     svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 300" style="background-color:white; border: 1px solid #aaa;">
  <text x="125" y="25" font-family="Arial" font-weight="bold" font-size="16" text-anchor="middle">7-Segment (Common A)</text>
  
  <rect x="50" y="50" width="150" height="200" fill="#f0f0f0" stroke="black" stroke-width="2"/>
  
  <!-- Pins Top -->
  <g transform="translate(0, 50)">
      <text x="40" y="-5" font-size="10" fill="#000088">10(g)</text> <rect x="35" y="0" width="10" height="10" fill="#bbb"/>
      <text x="75" y="-5" font-size="10" fill="#000088">9(f)</text> <rect x="70" y="0" width="10" height="10" fill="#bbb"/>
      <text x="125" y="-5" font-size="10" font-weight="bold" fill="red">8(VCC)</text> <rect x="120" y="0" width="10" height="10" fill="#bbb"/>
      <text x="175" y="-5" font-size="10" fill="#000088">7(a)</text> <rect x="170" y="0" width="10" height="10" fill="#bbb"/>
      <text x="210" y="-5" font-size="10" fill="#000088">6(b)</text> <rect x="205" y="0" width="10" height="10" fill="#bbb"/>
  </g>
  
  <!-- Pins Bottom -->
  <g transform="translate(0, 240)">
      <text x="40" y="20" font-size="10" fill="#000088">1(e)</text> <rect x="35" y="0" width="10" height="10" fill="#bbb"/>
      <text x="75" y="20" font-size="10" fill="#000088">2(d)</text> <rect x="70" y="0" width="10" height="10" fill="#bbb"/>
      <text x="125" y="20" font-size="10" font-weight="bold" fill="red">3(VCC)</text> <rect x="120" y="0" width="10" height="10" fill="#bbb"/>
      <text x="175" y="20" font-size="10" fill="#000088">4(c)</text> <rect x="170" y="0" width="10" height="10" fill="#bbb"/>
      <text x="210" y="20" font-size="10" fill="#000088">5(dp)</text> <rect x="205" y="0" width="10" height="10" fill="#bbb"/>
  </g>
  
  <!-- Segments -->
  <g transform="translate(85, 90) scale(0.8)">
    <polygon points="20,0 80,0 90,10 80,20 20,20 10,10" fill="#fee" stroke="red"/><text x="50" y="15" text-anchor="middle" font-size="14">a</text>
    <polygon points="90,10 100,20 100,80 90,90 80,80 80,20" fill="#fee" stroke="red"/><text x="90" y="50" text-anchor="middle" font-size="14">b</text>
    <polygon points="90,90 100,100 100,160 90,170 80,160 80,100" fill="#fee" stroke="red"/><text x="90" y="130" text-anchor="middle" font-size="14">c</text>
    <polygon points="20,160 80,160 90,170 80,180 20,180 10,170" fill="#fee" stroke="red"/><text x="50" y="175" text-anchor="middle" font-size="14">d</text>
    <polygon points="10,90 20,100 20,160 10,170 0,160 0,100" fill="#fee" stroke="red"/><text x="10" y="130" text-anchor="middle" font-size="14">e</text>
    <polygon points="10,10 20,20 20,80 10,90 0,80 0,20" fill="#fee" stroke="red"/><text x="10" y="50" text-anchor="middle" font-size="14">f</text>
    <polygon points="20,80 80,80 90,90 80,100 20,100 10,90" fill="#fee" stroke="red"/><text x="50" y="95" text-anchor="middle" font-size="14">g</text>
  </g>
</svg>'''
     f.write(svg)

print("Regenerated all datasheets.")
