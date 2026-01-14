/**
 * APU Data Source
 * Contains default prices, labor rates, and database items.
 */

const APU_DATA = {
    laborRates: {
        construction: {
            'Electricista': 25.00,
            'Ayudante': 15.00,
            'Capataz': 35.00,
            'Ingeniero': 60.00,
            // Benefits Config
            _config: {
                fcas: 250, // %
                bonus: 40.00 // $ Monthly Cestaticket
            }
        },
        oil: { // Petrolero
            'Electricista': 45.00,
            'Ayudante': 30.00,
            'Capataz': 65.00,
            'Ingeniero': 120.00,
            // Benefits Config (TEA is much higher)
            _config: {
                fcas: 190, // % Usually lower % applied to higher base, but total is higher
                bonus: 150.00 // $ Monthly TEA (Tarjeta Electronica Alimentacion) approx
            }
        }
    },
    
    // ... Materials and Equipment remain the same ...
    materials: [
        { id: 'm1', desc: 'Tubería EMT 1/2"', unit: 'pza', price: 4.50 },
        { id: 'm2', desc: 'Tubería EMT 3/4"', unit: 'pza', price: 6.20 },
        { id: 'm3', desc: 'Conector EMT 1/2"', unit: 'pza', price: 0.80 },
        { id: 'm4', desc: 'Conector EMT 3/4"', unit: 'pza', price: 1.20 },
        { id: 'm5', desc: 'Cable THHN #12', unit: 'm', price: 0.65 },
        { id: 'm6', desc: 'Cable THHN #10', unit: 'm', price: 0.95 },
        { id: 'm7', desc: 'Tomacorriente Doble 110V', unit: 'pza', price: 3.50 },
        { id: 'm8', desc: 'Cajetín Metálico 2x4', unit: 'pza', price: 1.10 }
    ],

    equipment: [
        { id: 'e1', desc: 'Herramientas Menores (%M.O.)', rate: 5.00 },
        { id: 'e2', desc: 'Taladro Percutor', rate: 15.00 },
        { id: 'e3', desc: 'Andamio (Cuerpo)', rate: 2.00 },
        { id: 'e4', desc: 'Camioneta Pick-Up', rate: 60.00 }
    ]
};

// Current Configuration
const APU_CONFIG = {
    currentSector: 'construction', // or 'oil'
    currency: 'USD',
    exchangeRate: 50.0 // Default Bs/$
};
