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
        // Tuberías EMT
        { id: 'm1', desc: 'Tubería EMT 1/2" (3.05m)', unit: 'pza', price: 4.50 },
        { id: 'm2', desc: 'Tubería EMT 3/4" (3.05m)', unit: 'pza', price: 6.20 },
        { id: 'm3', desc: 'Tubería EMT 1" (3.05m)', unit: 'pza', price: 9.80 },
        { id: 'm4', desc: 'Tubería EMT 1 1/2" (3.05m)', unit: 'pza', price: 16.50 },
        { id: 'm5', desc: 'Tubería EMT 2" (3.05m)', unit: 'pza', price: 22.00 },
        
        // Tuberías PVC (Pared Delgada/Gruesa)
        { id: 'm10', desc: 'Tubería PVC Eléctrica 1/2" (3.00m)', unit: 'pza', price: 2.10 },
        { id: 'm11', desc: 'Tubería PVC Eléctrica 3/4" (3.00m)', unit: 'pza', price: 3.50 },
        { id: 'm12', desc: 'Tubería PVC Eléctrica 1" (3.00m)', unit: 'pza', price: 5.80 },
        
        // Cables THHN/THWN (Precios por metro)
        { id: 'm20', desc: 'Cable Cu THHN #14 AWG', unit: 'm', price: 0.45 },
        { id: 'm21', desc: 'Cable Cu THHN #12 AWG', unit: 'm', price: 0.65 },
        { id: 'm22', desc: 'Cable Cu THHN #10 AWG', unit: 'm', price: 0.95 },
        { id: 'm23', desc: 'Cable Cu THHN #8 AWG', unit: 'm', price: 1.60 },
        { id: 'm24', desc: 'Cable Cu THHN #6 AWG', unit: 'm', price: 2.40 },
        { id: 'm25', desc: 'Cable Cu THHN #4 AWG', unit: 'm', price: 3.80 },
        { id: 'm26', desc: 'Cable Cu THHN #2 AWG', unit: 'm', price: 5.50 },
        { id: 'm27', desc: 'Cable Cu THHN 1/0 AWG', unit: 'm', price: 8.20 },
        { id: 'm28', desc: 'Cable Cu THHN 2/0 AWG', unit: 'm', price: 10.50 },
        { id: 'm29', desc: 'Cable Cu THHN 4/0 AWG', unit: 'm', price: 16.80 },
        { id: 'm30', desc: 'Cable Cu THHN 250 MCM', unit: 'm', price: 20.50 },
        { id: 'm31', desc: 'Cable Cu THHN 350 MCM', unit: 'm', price: 28.50 },
        { id: 'm32', desc: 'Cable Cu THHN 500 MCM', unit: 'm', price: 38.00 },

        // Cajetines y Cajas
        { id: 'm40', desc: 'Cajetín Metálico 2"x4" (E531)', unit: 'pza', price: 1.10 },
        { id: 'm41', desc: 'Cajetín Metálico 4"x4" (E531)', unit: 'pza', price: 1.80 },
        { id: 'm42', desc: 'Cajetín Octogonal Metálico', unit: 'pza', price: 1.40 },
        { id: 'm43', desc: 'Caja de Paso 10x10cm (E531)', unit: 'pza', price: 4.50 },
        { id: 'm44', desc: 'Caja de Paso 15x15cm (E531)', unit: 'pza', price: 8.20 },
        { id: 'm45', desc: 'Caja de Paso 20x20cm (E531)', unit: 'pza', price: 12.50 },
        { id: 'm46', desc: 'Caja de Paso 30x30cm (E531)', unit: 'pza', price: 24.00 },

        // Dispositivos (E541)
        { id: 'm50', desc: 'Interruptor Sencillo 120V', unit: 'pza', price: 2.50 },
        { id: 'm51', desc: 'Interruptor Doble 120V', unit: 'pza', price: 4.20 },
        { id: 'm52', desc: 'Interruptor Triple 120V', unit: 'pza', price: 6.50 },
        { id: 'm53', desc: 'Interruptor 3-Way (Conmutable)', unit: 'pza', price: 3.80 },
        { id: 'm54', desc: 'Tomacorriente Doble 120V', unit: 'pza', price: 3.50 },
        { id: 'm55', desc: 'Tomacorriente GFCI 120V', unit: 'pza', price: 18.00 },
        { id: 'm56', desc: 'Tomacorriente 220V (20A/30A)', unit: 'pza', price: 8.50 },

        // Breakers (E561)
        { id: 'm60', desc: 'Breaker 1P 15A/20A Enchufable', unit: 'pza', price: 4.50 },
        { id: 'm61', desc: 'Breaker 2P 20A/30A/40A Enchufable', unit: 'pza', price: 12.00 },
        { id: 'm62', desc: 'Breaker 2P 50A/60A/70A Enchufable', unit: 'pza', price: 18.00 },
        { id: 'm63', desc: 'Breaker 3P 20A a 100A Bolt-on', unit: 'pza', price: 45.00 },

        // Tableros (E551)
        { id: 'm70', desc: 'Tablero 2-4 Ctos Monofásico Embutir', unit: 'pza', price: 22.00 },
        { id: 'm71', desc: 'Tablero 8-12 Ctos Monofásico Embutir', unit: 'pza', price: 45.00 },
        { id: 'm72', desc: 'Tablero 18-24 Ctos Trifásico Superficie', unit: 'pza', price: 120.00 },
        { id: 'm73', desc: 'Tablero 42 Ctos Trifásico NEMA 1', unit: 'pza', price: 280.00 },

        // Luminarias (E371)
        { id: 'm80', desc: 'Luminaria LED Panel 60x60 40W', unit: 'pza', price: 25.00 },
        { id: 'm81', desc: 'Luminaria LED Circular 18W Embutir', unit: 'pza', price: 8.50 },
        { id: 'm82', desc: 'Reflector LED 50W Multivoltaje', unit: 'pza', price: 18.00 },
        { id: 'm83', desc: 'Lámpara Emergencia LED 2 Faros', unit: 'pza', price: 14.00 }
    ],

    equipment: [
        { id: 'e1', desc: 'Herramientas Menores (% M.O.)', rate: 5.00 },
        { id: 'e2', desc: 'Taladro Percutor / Rotomartillo', rate: 15.00 },
        { id: 'e3', desc: 'Andamio Tubular (Cuerpo completo)', rate: 2.50 },
        { id: 'e4', desc: 'Camioneta de Servicio / Pick-Up', rate: 60.00 },
        { id: 'e5', desc: 'Megger (CBA/Aislación)', rate: 35.00 },
        { id: 'e6', desc: 'Doblador de Tubo Hidráulico', rate: 20.00 },
        { id: 'e7', desc: 'Cortadora de Concreto', rate: 45.00 },
        { id: 'e8', desc: 'Generador Eléctrico 5kVA', rate: 50.00 }
    ]

};

window.APU_DATA = APU_DATA;

// Current Configuration
var APU_CONFIG = {
    currentSector: 'construction', // or 'oil'
    currency: 'USD',
    exchangeRate: 50.0 // Default Bs/$
};
window.APU_CONFIG = APU_CONFIG;
