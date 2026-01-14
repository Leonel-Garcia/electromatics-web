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
            span.style.display = 'block';
            span.style.width = '100%';
            span.style.textAlign = input.style.textAlign || 'left';
            
            // Replace input with span
            input.parentNode.replaceChild(span, input);
        });

        // 3. Remove Interactive Elements
        clone.querySelectorAll('.fa-xmark, .btn-add-row, .controls-overlay').forEach(el => el.remove());
        
        // 4. Apply specific Print Styling to the clone
        clone.style.width = '21.59cm'; // Letter Width
        clone.style.maxWidth = '21.59cm';
        clone.style.padding = '10mm'; // Standard print padding
        clone.style.minHeight = 'auto'; // Allow shrinking
        clone.style.height = 'auto';
        clone.style.fontSize = '10px'; // Slightly smaller font to insure fit
        clone.style.border = 'none';
        clone.style.boxShadow = 'none';
        clone.style.margin = '0 auto';
        clone.style.background = 'white';
        
        // Compact rows for PDF
        clone.querySelectorAll('td, th').forEach(cell => {
             cell.style.padding = '2px';
             cell.style.fontSize = '10px';
        });
        
        // Hide empty space or specific spacers if any
        // ...

        // 5. Append to body temporarily (hidden from view but visible to renderer)
        // We use a wrapper to ensure layout context
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '0';
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        // 6. Generate PDF
        const opt = {
            margin:       [10, 10, 10, 10], // mm
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
