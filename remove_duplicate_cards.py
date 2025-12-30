#!/usr/bin/env python3
# Script to remove duplicate Fondonorma cards from electro-info.html

file_path = r"c:\Users\LGP.DESKTOP-GC63DGS.000\Desktop\IA_Web_Project\electro-info.html"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines 0-664 (inclusive, 0-indexed so line 665 in editor)
# Skip lines 665-692 (0-indexed, so lines 666-693 in editor)
# Keep the rest

new_lines = lines[:665] + lines[693:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully removed duplicate cards from electro-info.html")
