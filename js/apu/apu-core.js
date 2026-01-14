/**
 * APU Core Logic
 * Handles all mathematical calculations for the Unit Price Analysis.
 * Updated for Venezuelan Standard Format (Waste, Depreciation, FCAS).
 */

class APUItem {
    constructor(description = '', unit = 'pza', quantity = 1, price = 0) {
        this.description = description;
        this.unit = unit;
        this.quantity = parseFloat(quantity) || 0;
        this.price = parseFloat(price) || 0;
    }
}

class MaterialItem extends APUItem {
    constructor(description, unit, quantity, price, wastePercent = 0) {
        super(description, unit, quantity, price);
        this.wastePercent = parseFloat(wastePercent) || 0;
    }

    get Total() {
        // Standard Lulo/Covenin: Total = (Qty * Price) ... but if Waste exists?
        // Usually: Total Cost = Quantity * UnitPrice.
        // Waste increases the QUANTITY needed.
        // Example in Image: Qty=1, %Desp=0, Cost=130.05, Total=130.05
        // Example 2: Transp (5%), Qty=0.025?? 
        // Let's implement: Total = Qty * Price * (1 + Waste/100)
        return this.quantity * this.price * (1 + (this.wastePercent / 100));
    }
}

class EquipmentItem extends APUItem {
    constructor(description, quantity, value, factor = 1) { // value = "Costo", factor = "Dep. o Alq"
        super(description, 'und', quantity, value);
        this.factor = parseFloat(factor) || 0; 
    }

    get Total() {
        // Equipment Cost = Amt * Value * Factor
        // Example: Andamio Qty=1, Value=79.7, Factor=1.00 -> Total=79.7
        return this.quantity * this.price * this.factor;
    }
}

class LaborItem extends APUItem {
    constructor(role, count, dailyRate) {
        super(role, 'día', count, dailyRate);
    }
    
    get TotalDaily() {
        return this.quantity * this.price;
    }
}

class PriceAnalysis {
    constructor() {
        this.description = '';
        this.unit = 'und';
        this.yield = 1; // Unidades por día
        
        this.materials = [];
        this.equipment = [];
        this.labor = [];
        
        // Footers
        this.adminPercent = 15;
        this.utilityPercent = 10;
        
        // Labor Factors
        this.fcasPercent = 250; // Prestaciones Sociales
        this.bonoAlimentacionMonthly = 40; // $$ or Bs per month depending on currency? usually fix in currency
        this.daysPerMonth = 30; // standard
    }

    // --- Adders ---
    addMaterial(desc, unit, qty, price, waste = 0) {
        this.materials.push(new MaterialItem(desc, unit, qty, price, waste));
    }

    addEquipment(desc, qty, value, factor) {
        this.equipment.push(new EquipmentItem(desc, qty, value, factor));
    }

    addLabor(role, count, rate) {
        this.labor.push(new LaborItem(role, count, rate));
    }
    
    // --- Calculations ---

    get MaterialCostTotal() {
        return this.materials.reduce((sum, item) => sum + item.Total, 0);
    }
    
    get MaterialCostUnit() {
        // Materials are usually per unit of the item (e.g., per m2)
        // So Total is already Unit Cost.
        // Image says: "Total Materiales: 166.27", "Unitario Materiales: 166.27"
        return this.MaterialCostTotal; 
    }

    get EquipmentCostTotal() {
        return this.equipment.reduce((sum, item) => sum + item.Total, 0);
    }

    get EquipmentCostUnit() {
        // Equipment is calculated per Day or per Unit?
        // Image: "Total Equipos: 108.73". "Unitario Equipos: 0.72".
        // Yield = 150 m2/day.
        // 108.73 / 150 = 0.7248 -> 0.72.
        // SO: Equipment Total is DAILY cost (Team/Machinery per day).
        // Unit Cost = Daily Cost / Yield.
        if (this.yield === 0) return 0;
        return this.EquipmentCostTotal / this.yield;
    }

    // LABOR COMPLEX
    get LaborBaseDaily() {
        return this.labor.reduce((sum, item) => sum + item.TotalDaily, 0);
    }
    
    get FCASAmount() {
        return this.LaborBaseDaily * (this.fcasPercent / 100);
    }
    
    get FoodBonusTotal() {
        // Total People * (Monthly / 30)
        // Actually often calculated as: (Bono / 30) * Total People
        const totalPeople = this.labor.reduce((sum, item) => sum + item.quantity, 0);
        const dailyBono = (this.bonoAlimentacionMonthly / this.daysPerMonth);
        return dailyBono * totalPeople;
    }
    
    get LaborDailyTotal() {
        return this.LaborBaseDaily + this.FCASAmount + this.FoodBonusTotal;
    }

    get LaborCostUnit() {
        if (this.yield === 0) return 0;
        return this.LaborDailyTotal / this.yield;
    }

    // FINAL SUMMARY
    get DirectCost() {
        return this.MaterialCostUnit + this.EquipmentCostUnit + this.LaborCostUnit;
    }

    get AdminAmount() {
        return this.DirectCost * (this.adminPercent / 100);
    }

    get UtilityAmount() {
        // "Subtotal Utilidad = Utilidad + Admin + Costo Directo"
        // This implies Utility is calculated on (Direct + Admin)?
        // Re-reading Image:
        // 15% Admin: 25.80 (171.97 * 0.15 = 25.795) -> Correct. Base is Direct Cost.
        // Sub-total: 197.76 (171.97 + 25.80)
        // 10% Utility: 19.78 (197.76 * 0.10) --> YES, Utility is on (Direct + Admin).
        return (this.DirectCost + this.AdminAmount) * (this.utilityPercent / 100);
    }

    get TotalUnitCost() {
        return this.DirectCost + this.AdminAmount + this.UtilityAmount;
    }
}

window.apuSystem = new PriceAnalysis();
