/**
 * APU PDF Exporter (Professional Version)
 * Generates a high-quality PDF by creating a "Clean Report" version of the DOM.
 */

const apuPDF = {
    exportToPDF() {
        const source = document.getElementById('apu-sheet');
        
        // 1. Create a deep clone to manipulate without affecting the UI
        const clone = source.cloneNode(true);
        clone.id = 'apu-pdf-render';
        
        // 2. TRANSFORM INPUTS TO TEXT
        // This is crucial for the "Professional Report" look vs "Screenshot of Form"
        const inputs = clone.querySelectorAll('input, select');
        inputs.forEach(input => {
            const span = document.createElement('span');
            span.innerText = input.value;
            span.style.fontWeight = 'bold'; // Keep values bold
            // Use inline-block to prevent line breaks (fixing percentage fields)
            span.style.display = 'inline-block';
            span.style.width = 'auto';
            // We can inherit alignment from parent or just let inline flow handle it
            // span.style.textAlign = input.style.textAlign || 'left';
            
            // Replace input with span
            input.parentNode.replaceChild(span, input);
        });

        // 3. Remove Interactive Elements
        clone.querySelectorAll('.fa-xmark, .btn-add-row, .controls-overlay').forEach(el => el.remove());
        
        // 4. Apply specific Print Styling to the clone
        // Calculate strict printable width: 21.59cm (Letter) - 4cm (margins) = 17.59cm.
        // User requested reducing further by 1cm -> 16.5cm.
        const printWidth = '16.5cm';
        
        clone.style.width = printWidth; 
        clone.style.maxWidth = printWidth;
        clone.style.padding = '0'; 
        clone.style.minHeight = 'auto'; 
        clone.style.height = 'auto';
        clone.style.fontSize = '9px'; // Reduced font size
        clone.style.border = 'none';
        clone.style.boxShadow = 'none';
        clone.style.margin = '0'; 
        clone.style.background = 'white';
        // Enforce word wrapping
        clone.style.whiteSpace = 'normal'; 
        
        // Compact rows and ensure tables respect width
        clone.querySelectorAll('table').forEach(table => {
            table.style.width = '100%';
            table.style.tableLayout = 'fixed'; // CRITICAL: Prevents columns from expanding beyond width
        });

        clone.querySelectorAll('td, th').forEach(cell => {
             cell.style.padding = '1px'; // Tight padding
             cell.style.fontSize = '9px'; // Reduced font size
             cell.style.wordWrap = 'break-word'; 
             cell.style.wordBreak = 'break-word'; // Stronger wrap
             cell.style.overflow = 'hidden'; 
        });
        
        // ...

        // 5. Append to body temporarily
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '0';
        wrapper.style.width = printWidth; // Ensure wrapper constrains the clone
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        // 6. Generate PDF
        const opt = {
            margin:       [10, 20, 10, 20], // mm - Increased side margins to 20mm (2cm) as requested
            filename:     'APU_Reporte_Profesional.pdf',
            image:        { type: 'jpeg', quality: 1.0 }, // Max quality
            html2canvas:  { scale: 2, useCORS: true, scrollX:0, scrollY:0 }, // High Res
            jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(clone).save().then(() => {
            // Cleanup
            document.body.removeChild(wrapper);
        });
    }
};
