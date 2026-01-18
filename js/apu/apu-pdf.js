/**
 * APU PDF Exporter (Vectorized Engineering Version)
 * Uses jsPDF and AutoTable for high-clarity, structure-safe reports.
 */

const apuPDF = {
    /**
     * Export a single APU sheet using vectorized drawing
     */
    async exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'letter'
        });

        const state = window.apuUI ? apuUI.getState() : null;
        if (!state) return;

        this.drawFullAPUPage(doc, state);

        // Save file
        const partidaNo = state.metadata.partidaNo || '0';
        const cleanDesc = (state.metadata.description || 'Analisis').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        doc.save(`APU_Partida_${partidaNo}_${cleanDesc}.pdf`);
    },

    /**
     * Draws a complete APU page onto the provided jsPDF document.
     * Useful for multi-page reports.
     */
    drawFullAPUPage(doc, state) {
        const margin = 15;
        let currentY = margin;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);

        // --- 1. HEADER & PROJECT INFO ---
        this.drawHeader(doc, state, margin, currentY, contentWidth);
        currentY += 45; 

        // --- 2. TABLES SECTION ---
        currentY = this.drawMaterialsTable(doc, state, margin, currentY);
        currentY = this.drawEquipmentTable(doc, state, margin, currentY + 5);
        currentY = this.drawLaborTable(doc, state, margin, currentY + 5);

        // --- 3. SUMMARY FOOTER ---
        this.drawSummary(doc, state, margin, currentY + 10, contentWidth);
    },

    drawHeader(doc, state, x, y, width) {
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text("ANÁLISIS DE PRECIOS UNITARIOS", x + (width / 2), y, { align: "center" });
        
        y += 8;
        doc.setFontSize(10);
        doc.setFont("times", "normal");
        const dateStr = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.text(`Fecha: ${dateStr}`, x + width, y, { align: "right" });

        y += 5;
        // Main Box
        doc.setLineWidth(0.5);
        doc.rect(x, y, width, 20); // Info Box
        
        doc.setFont("times", "bold");
        doc.text("OBRA:", x + 2, y + 6);
        doc.setFont("times", "normal");
        doc.text(state.metadata.obra || "N/A", x + 20, y + 6);

        doc.line(x, y + 10, x + width, y + 10); // Middle Line

        doc.setFont("times", "bold");
        doc.text("PARTIDA:", x + 2, y + 16);
        doc.setFont("times", "normal");
        doc.text(`${state.metadata.partidaNo} - ${state.metadata.description}`, x + 20, y + 16);

        y += 25;
        // Sub Box for Codes/Unit/Yield
        doc.rect(x, y, width, 12);
        
        const colW = width / 4;
        doc.setFont("times", "bold");
        doc.text("CÓDIGO", x + (colW * 0.5), y + 4, { align: "center" });
        doc.text("UNIDAD", x + (colW * 1.5), y + 4, { align: "center" });
        doc.text("CANTIDAD", x + (colW * 2.5), y + 4, { align: "center" });
        doc.text("RENDIMIENTO", x + (colW * 3.5), y + 4, { align: "center" });

        doc.setFont("times", "normal");
        doc.text(state.metadata.code || "-", x + (colW * 0.5), y + 9, { align: "center" });
        doc.text(state.metadata.unit || "-", x + (colW * 1.5), y + 9, { align: "center" });
        doc.text(state.metadata.qty.toString() || "0", x + (colW * 2.5), y + 9, { align: "center" });
        doc.text(`${state.metadata.yield} ${state.metadata.unit || 'und'}/día`, x + (colW * 3.5), y + 9, { align: "center" });

        doc.line(x + colW, y, x + colW, y + 12);
        doc.line(x + (colW * 2), y, x + (colW * 2), y + 12);
        doc.line(x + (colW * 3), y, x + (colW * 3), y + 12);
    },

    drawMaterialsTable(doc, state, x, y) {
        doc.setFont("times", "bold");
        doc.setFillColor(22, 31, 41); // Electromatics Dark Navy
        doc.rect(x, y, doc.internal.pageSize.getWidth() - (x * 2), 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text("1. MATERIALES", x + 2, y + 5);
        doc.setTextColor(0, 0, 0);

        const rows = state.materials.map(m => [
            m.desc,
            m.unit,
            m.qty,
            `${m.waste}%`,
            this.formatCurrency(m.price),
            this.formatCurrency(m.qty * m.price * (1 + m.waste / 100))
        ]);

        doc.autoTable({
            startY: y + 7,
            head: [['Descripción', 'Und', 'Cant', '% Desp', 'Precio', 'Total']],
            body: rows,
            margin: { left: x },
            styles: { font: "times", fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: [240, 245, 250], textColor: [22, 31, 41], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 15, halign: 'center' },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 25, halign: 'right' },
                5: { cellWidth: 30, halign: 'right' }
            },
            theme: 'grid'
        });

        const finalY = doc.lastAutoTable.finalY;
        const totalMat = state.materials.reduce((sum, m) => sum + (m.qty * m.price * (1 + m.waste / 100)), 0);
        
        doc.setFontSize(10);
        doc.setFont("times", "bold");
        doc.text(`Total Materiales: ${this.formatCurrency(totalMat)}`, x + (doc.internal.pageSize.getWidth() - (x * 2)), finalY + 5, { align: "right" });

        return finalY + 8;
    },

    drawEquipmentTable(doc, state, x, y) {
        doc.setFont("times", "bold");
        doc.setFillColor(22, 31, 41);
        doc.rect(x, y, doc.internal.pageSize.getWidth() - (x * 2), 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text("2. EQUIPOS", x + 2, y + 5);
        doc.setTextColor(0, 0, 0);

        const rows = state.equipment.map(e => [
            e.desc,
            e.qty,
            this.formatCurrency(e.val),
            e.fac,
            this.formatCurrency(e.qty * e.val * e.fac)
        ]);

        doc.autoTable({
            startY: y + 7,
            head: [['Descripción', 'Cant', 'Costo (Valor)', 'Dep / Alq', 'Total']],
            body: rows,
            margin: { left: x },
            styles: { font: "times", fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: [240, 245, 250], textColor: [22, 31, 41], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 30, halign: 'right' }
            },
            theme: 'grid'
        });

        const finalY = doc.lastAutoTable.finalY;
        const totalEq = state.equipment.reduce((sum, e) => sum + (e.qty * e.val * e.fac), 0);
        const unitEq = totalEq / (parseFloat(state.metadata.yield) || 1);

        doc.setFontSize(10);
        doc.setFont("times", "bold");
        doc.text(`Total Equipos: ${this.formatCurrency(totalEq)}`, x + (doc.internal.pageSize.getWidth() - (x * 2)), finalY + 5, { align: "right" });
        doc.setFont("times", "normal");
        doc.text(`Unitario Equipos: ${this.formatCurrency(unitEq)}`, x + (doc.internal.pageSize.getWidth() - (x * 2)), finalY + 9, { align: "right" });

        return finalY + 12;
    },

    drawLaborTable(doc, state, x, y) {
        doc.setFont("times", "bold");
        doc.setFillColor(22, 31, 41);
        doc.rect(x, y, doc.internal.pageSize.getWidth() - (x * 2), 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text("3. MANO DE OBRA", x + 2, y + 5);
        doc.setTextColor(0, 0, 0);

        const rows = state.labor.map(l => [
            l.role,
            l.count,
            this.formatCurrency(l.rate),
            this.formatCurrency(l.count * l.rate)
        ]);

        doc.autoTable({
            startY: y + 7,
            head: [['Descripción / Cargo', 'Cant', 'Salario Jornal', 'Total']],
            body: rows,
            margin: { left: x },
            styles: { font: "times", fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: [240, 245, 250], textColor: [22, 31, 41], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 35, halign: 'right' }
            },
            theme: 'grid'
        });

        const finalY = doc.lastAutoTable.finalY;
        this.addBrandedFooter(doc); // Add footer to the current page
        return finalY + 5;
    },

    addBrandedFooter(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        doc.setFont("times", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100);
        
        const footerText = "Electromatics.com.ve - Ingeniería Eléctrica con Inteligencia Artificial";
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: "center" });
        doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 15, pageHeight - 10, { align: "right" });

        // Small branding line
        doc.setDrawColor(22, 31, 41);
        doc.setLineWidth(0.5);
        doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    },

    drawSummary(doc, state, x, y, width) {
        const model = window.apuSystem;
        if (!model) return;

        const isBs = (window.apuUI && window.apuUI.currentCurrency === 'BS');
        const symbol = isBs ? 'Bs' : '$';
        const exchangeRate = document.getElementById('exchange-rate') ? parseFloat(document.getElementById('exchange-rate').value) : 1;
        const mult = isBs ? exchangeRate : 1;

        const rightColX = x + width - 40;
        const labelColX = x + width - 45;

        const drawRow = (label, value, isBold = false, isSubtotal = false) => {
            doc.setFont("times", isBold ? "bold" : "normal");
            doc.text(label, labelColX, y, { align: "right" });
            doc.text(this.formatCurrency(value * mult), x + width, y, { align: "right" });
            if (isSubtotal) {
                doc.setLineWidth(0.2);
                doc.line(labelColX - 20, y + 1, x + width, y + 1);
            }
            y += 5;
        };

        drawRow("Total Mano de Obra:", model.LaborBaseDaily);
        drawRow(`% Prestaciones (${state.params.fcas}%):`, model.FCASAmount);
        drawRow("Bono Alimentación (Ley):", model.FoodBonusTotal, false, true);
        
        y += 2;
        drawRow("Total Mano de Obra Diario:", model.LaborDailyTotal, true);
        drawRow("Unitario Mano de Obra:", model.LaborCostUnit);
        
        y += 5;
        doc.setLineWidth(0.5);
        doc.line(x + width - 100, y - 4, x + width, y - 4);
        
        drawRow("COSTO DIRECTO POR UNIDAD:", model.DirectCost, true);
        drawRow(`Gastos Administración (${state.params.admin}%):`, model.AdminAmount);
        drawRow("Utilidad e Imprevistos (10%):", model.UtilityAmount);
        
        y += 2;
        doc.setFillColor(230, 230, 230);
        doc.rect(x + width - 100, y - 4, 100, 10, 'F');
        doc.setLineWidth(0.8);
        doc.rect(x + width - 100, y - 4, 100, 10);
        
        doc.setFontSize(12);
        doc.setFont("times", "bold");
        doc.text(`PRECIO UNITARIO (${symbol}):`, x + width - 95, y + 2.5);
        doc.text(this.formatCurrency(model.TotalUnitCost * mult), x + width - 5, y + 2.5, { align: "right" });
    },

    formatCurrency(val) {
        return (val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    /**
     * CLEAN CLONE (Kept for compatibility with project exports, but optimized)
     */
    getCleanClone(source) {
        // This is now less critical as exportToPDF uses direct drawing,
        // but we keep it highly compatible for multi-page project reports.
        const clone = source.cloneNode(true);
        // ... (we might not even need this if project export is also refactored)
        return clone;
    }
};

window.apuPDF = apuPDF;
