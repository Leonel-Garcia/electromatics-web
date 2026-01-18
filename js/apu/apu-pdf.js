/**
 * APU PDF Exporter (Professional Version)
 * Generates a high-quality PDF by creating a "Clean Report" version of the DOM.
 */

const apuPDF = {
    /**
     * Creates a report-ready clone of an element
     */
    getCleanClone(source) {
        // 1. Create a deep clone to manipulate without affecting the UI
        const clone = source.cloneNode(true);
        clone.id = 'apu-pdf-render-' + Math.random().toString(36).substr(2, 9);
        
        // 2. TRANSFORM INPUTS TO TEXT
        const inputs = clone.querySelectorAll('input, select');
        inputs.forEach(input => {
            const span = document.createElement('span');
            span.innerText = input.value;
            span.style.fontWeight = 'bold';
            span.style.display = 'inline-block';
            span.style.width = 'auto';
            input.parentNode.replaceChild(span, input);
        });

        // 3. Remove Interactive Elements
        clone.querySelectorAll('.fa-xmark, .btn-add-row, .controls-overlay').forEach(el => el.remove());
        
        // 4. Apply Print Styling
        const printWidth = '16.5cm';
        clone.style.width = printWidth; 
        clone.style.maxWidth = printWidth;
        clone.style.padding = '10px'; 
        clone.style.minHeight = 'auto'; 
        clone.style.height = 'auto';
        clone.style.fontSize = '9px'; 
        clone.style.border = '1px solid #eee';
        clone.style.boxShadow = 'none';
        clone.style.margin = '10px auto'; 
        clone.style.background = 'white';
        clone.style.whiteSpace = 'normal'; 
        
        clone.querySelectorAll('table').forEach(table => {
            table.style.width = '100%';
            table.style.tableLayout = 'fixed';
            table.style.borderCollapse = 'collapse';
        });

        clone.querySelectorAll('td, th').forEach(cell => {
             cell.style.padding = '2px';
             cell.style.fontSize = '9px';
             cell.style.wordWrap = 'break-word'; 
             cell.style.wordBreak = 'break-word';
             cell.style.overflow = 'hidden'; 
             cell.style.border = '1px solid #000';
        });

        return clone;
    },

    exportToPDF() {
        const source = document.getElementById('apu-sheet');
        const clone = this.getCleanClone(source);
        
        // Append to body temporarily
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '0';
        wrapper.style.width = '210mm'; 
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        const partidaNo = document.getElementById('apu-partida-no').value || '0';
        const partidaDesc = document.getElementById('partida-desc').value || 'Analisis';
        const cleanDesc = partidaDesc.replace(/[^a-z0-pA-Z0-9]/gi, '_').substring(0, 30);
        
        const opt = {
            margin:       [10, 10, 10, 10], 
            filename:     `APU_Partida_${partidaNo}_${cleanDesc}.pdf`,
            image:        { type: 'jpeg', quality: 1.0 }, 
            html2canvas:  { scale: 2, useCORS: true }, 
            jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(clone).save().then(() => {
            document.body.removeChild(wrapper);
        });
    }
};
