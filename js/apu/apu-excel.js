/**
 * APU Excel Exporter
 * Generates an .xlsx file using manual AOA construction for maximum reliability.
 */

const apuExcel = {
    exportToExcel() {
        const model = window.apuSystem;
        const wb = XLSX.utils.book_new();
        
        // Prepare Data Array
        const wsData = [];
        
        // --- 1. HEADER SECTIONS ---
        wsData.push(["ANÁLISIS DE PRECIOS UNITARIOS"]); // A1
        wsData.push([""]); // Spacer
        
        // Project Info (Simulate the Header Table)
        // Row: Obra | [Value] | Partida N | [Value]
        wsData.push(["Obra:", "Proyecto Eléctrico Residencial", "Partida Nº:", "1"]);
        // Row: Desc | [Value]
        wsData.push(["Descripción:", model.description]);
        wsData.push([""]); 
        
        // Codes Section
        wsData.push(["Código COVENIN", "Unidad", "Cantidad", "Rendimiento"]);
        wsData.push(["E.1234", model.unit, "1.00", model.yield]);
        wsData.push([""]);

        // --- 2. MATERIALS ---
        wsData.push(["1. MATERIALES"]);
        wsData.push(["Descripción", "Unidad", "Cantidad", "% Desp.", "Costo", "Total"]);
        
        if (model.materials && model.materials.length > 0) {
            model.materials.forEach(m => {
                wsData.push([
                    m.description, 
                    m.unit, 
                    m.quantity, 
                    m.wastePercent + '%', 
                    m.price, 
                    m.Total.toFixed(2)
                ]);
            });
        }
        // Material Footers
        wsData.push(["", "", "", "", "Total Materiales:", model.MaterialCostTotal.toFixed(2)]);
        wsData.push(["", "", "", "", "Unitario Materiales:", model.MaterialCostUnit.toFixed(2)]);
        wsData.push([""]);

        // --- 3. EQUIPMENT ---
        wsData.push(["2. EQUIPOS"]);
        wsData.push(["Descripción", "Cantidad", "Costo (Valor)", "Factor", "Total"]); 
        if (model.equipment && model.equipment.length > 0) {
            model.equipment.forEach(e => {
                wsData.push([
                    e.description, 
                    e.quantity, 
                    e.price, 
                    e.factor, 
                    e.Total.toFixed(2)
                ]);
            });
        }
        wsData.push(["", "", "", "Total Equipos:", model.EquipmentCostTotal.toFixed(2)]);
        wsData.push(["", "", "", "Unitario Equipos:", model.EquipmentCostUnit.toFixed(2)]);
        wsData.push([""]);

        // --- 4. LABOR ---
        wsData.push(["3. MANO DE OBRA"]);
        wsData.push(["Descripción", "Cantidad", "Jornal", "Total"]);
        if (model.labor && model.labor.length > 0) {
            model.labor.forEach(l => {
                wsData.push([
                    l.description, 
                    l.quantity, 
                    l.price, 
                    l.TotalDaily.toFixed(2)
                ]);
            });
        }
        // Labor Detailed Summary
        wsData.push(["", "", "Total Mano de Obra (Base):", model.LaborBaseDaily.toFixed(2)]);
        wsData.push(["", "", `% Prestaciones (${model.fcasPercent}%):`, model.FCASAmount.toFixed(2)]);
        wsData.push(["", "", "Bono Alimentación:", model.FoodBonusTotal.toFixed(2)]);
        wsData.push(["", "", "Total Diario M.O.:", model.LaborDailyTotal.toFixed(2)]);
        wsData.push(["", "", "Unitario M.O.:", model.LaborCostUnit.toFixed(2)]);
        wsData.push([""]);

        // --- 5. GLOBAL SUMMARY ---
        wsData.push(["RESUMEN DE COSTOS"]);
        wsData.push(["", "Costo Directo:", model.DirectCost.toFixed(2)]);
        wsData.push(["", `% Admin (${model.adminPercent}%):`, model.AdminAmount.toFixed(2)]);
        wsData.push(["", "Sub-Total A:", (model.DirectCost + model.AdminAmount).toFixed(2)]);
        wsData.push(["", `% Utilidad (${model.utilityPercent}%):`, model.UtilityAmount.toFixed(2)]);
        wsData.push(["", "Sub-Total U:", (model.DirectCost + model.AdminAmount + model.UtilityAmount).toFixed(2)]);
        wsData.push([""]);
        
        // Final Price
        wsData.push(["", "PRECIO UNITARIO:", model.TotalUnitCost.toFixed(2)]);

        // Create Worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Simple Layout Polishing (Column Widths)
        ws['!cols'] = [
            { wch: 40 }, // A: Desc
            { wch: 10 }, // B: Unit
            { wch: 15 }, // C: Qty/Val
            { wch: 15 }, // D: Factor/Rate
            { wch: 15 }, // E: Total
            { wch: 15 }  // F: Total2
        ];

        // Append and Download
        XLSX.utils.book_append_sheet(wb, ws, "APU");
        XLSX.writeFile(wb, "APU_Electromatics.xlsx");
    }
};
