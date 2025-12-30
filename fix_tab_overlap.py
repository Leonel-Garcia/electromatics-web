#!/usr/bin/env python3
# Script to remove misplaced book cards from tab-guias section

file_path = r"c:\Users\LGP.DESKTOP-GC63DGS.000\Desktop\IA_Web_Project\electro-info.html"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines 0-665 (inclusive, 0-indexed so line 666 in editor)
# This includes the closing </div> for books-grid
# Skip lines 666-904 (0-indexed, so lines 667-905 in editor) - all the misplaced books
# Keep the rest from line 905 onwards (0-indexed, so line 906 in editor)

new_lines = lines[:666] + lines[905:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully removed misplaced book cards from tab-guias section")
print(f"Removed {len(lines) - len(new_lines)} lines")
