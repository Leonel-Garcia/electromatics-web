/**
 * APU PDF Exporter (High-Fidelity Engineering Version)
 * Generates professional engineering reports using Times New Roman and strict margins.
 */

const apuPDF = {
    /**
     * Creates a report-ready clone of an element with high-fidelity styling
     */
    getCleanClone(source) {
        const clone = source.cloneNode(true);
        clone.id = 'apu-pdf-render-' + Math.random().toString(36).substr(2, 9);
        
        // 1. GLOBAL STYLING (Engineering Standard)
        const fontStack = "'Times New Roman', Times, serif";
        clone.style.fontFamily = fontStack;
        clone.style.fontSize = '12pt';
        clone.style.color = '#000';
        clone.style.background = '#fff';
        clone.style.padding = '0';
        clone.style.margin = '0';
        clone.style.width = '100%';
        
        // 2. TRANSFORM INPUTS TO CLEAN TEXT
        const inputs = clone.querySelectorAll('input, select');
        inputs.forEach(input => {
            const span = document.createElement('span');
            span.innerText = input.value || '';
            span.style.fontWeight = 'bold';
            span.style.fontFamily = fontStack;
            span.style.fontSize = '12pt';
            input.parentNode.replaceChild(span, input);
        });

        // 3. REMOVE INTERACTIVE ELEMENTS
        clone.querySelectorAll('.fa-xmark, .btn-add-row, .controls-overlay, .mat-suggestions, .eq-suggestions, .smart-suggestions').forEach(el => el.remove());
        
        // 4. TABLE STYLING (Sharp Lines & Perfect Alignment)
        clone.querySelectorAll('table').forEach(table => {
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginBottom = '10pt';
            table.style.tableLayout = 'fixed';
            table.style.border = '1.5pt solid #000'; // Thicker outer border
        });

        clone.querySelectorAll('th').forEach(th => {
            th.style.border = '1pt solid #000';
            th.style.padding = '4pt';
            th.style.backgroundColor = '#f2f2f2';
            th.style.fontSize = '11pt';
            th.style.textTransform = 'uppercase';
            th.style.fontFamily = fontStack;
        });

        clone.querySelectorAll('td').forEach(td => {
            td.style.border = '0.5pt solid #000'; // Thin but sharp inner lines
            td.style.padding = '4pt';
            td.style.fontSize = '11pt';
            td.style.fontFamily = fontStack;
            td.style.wordWrap = 'break-word';
        });

        // 5. HEADER & TITLES
        const headerTitle = clone.querySelector('.header-title');
        if (headerTitle) {
            headerTitle.style.fontSize = '16pt';
            headerTitle.style.fontWeight = 'bold';
            headerTitle.style.textAlign = 'center';
            headerTitle.style.marginBottom = '15pt';
            headerTitle.style.textDecoration = 'underline';
        }

        const sectionHeaders = clone.querySelectorAll('.apu-section-header');
        sectionHeaders.forEach(sh => {
            sh.style.fontSize = '13pt';
            sh.style.fontWeight = 'bold';
            sh.style.backgroundColor = '#000';
            sh.style.color = '#fff';
            sh.style.padding = '4pt';
            sh.style.marginTop = '10pt';
        });

        return clone;
    },

    /**
     * Export a single APU sheet
     */
    exportToPDF() {
        const source = document.getElementById('apu-sheet');
        if (!source) return;

        const clone = this.getCleanClone(source);
        
        const wrapper = document.createElement('div');
        wrapper.style.padding = '20mm'; // Letter Margins
        wrapper.style.backgroundColor = 'white';
        wrapper.appendChild(clone);

        const partidaNo = document.getElementById('apu-partida-no').value || '0';
        const partidaDesc = document.getElementById('partida-desc').value || 'Analisis';
        const cleanDesc = partidaDesc.replace(/[^a-z0-pA-Z0-9]/gi, '_').substring(0, 30);
        
        const opt = {
            margin:       [15, 15, 15, 15], // mm
            filename:     `APU_Partida_${partidaNo}_${cleanDesc}.pdf`,
            image:        { type: 'jpeg', quality: 1.0 },
            html2canvas:  { scale: 3, useCORS: true, letterRendering: true }, // High DPI
            jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(wrapper).save();
    }
};
