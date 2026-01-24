// --- GESTIÓN DE LA CLAVE DE API ---
// Para mantener tu clave segura, se ha movido a este archivo.
// NUNCA compartas este archivo ni lo subas a repositorios públicos como GitHub.
// Si usas Git, asegúrate de que el archivo "js/config.js" esté en tu .gitignore

// La clave de API ahora se maneja en el Backend por seguridad.
// const apiKey = "..."; // REMOVED

// Configuración Centralizada de la API
// Detecta automáticamente si estamos en local (PC/Móvil) o en producción
const getApiUrl = () => {
    const hostname = window.location.hostname;
    
    // Lista de dominios de producción
    if (hostname.includes('electromatics.com.ve') || hostname.includes('onrender.com') || hostname.includes('github.io')) {
        return 'https://electromatics-api.onrender.com';
    }
    
    // Para desarrollo local (localhost, 127.0.0.1, o IPs de red local como 192.168.x.x)
    // Asumimos que el backend corre en el puerto 8001
    const host = hostname || '127.0.0.1';
    return `http://${host}:8001`;
};

const API_BASE_URL = getApiUrl();
window.API_BASE_URL = API_BASE_URL; // Asegurar visibilidad global
console.log('🔌 API URL Configured:', API_BASE_URL); // Debug log

/**
 * Formatea un número al estilo venezolano: coma para decimales, punto para miles.
 * @param {number} value - El número a formatear
 * @param {number} decimals - Cantidad de decimales (por defecto 2)
 * @returns {string} - El número formateado
 */
function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    
    // Handle very large or very small numbers with exponential notation
    if (Math.abs(value) > 1e9 || (Math.abs(value) < 0.0001 && value !== 0)) {
        return value.toExponential(4).replace('.', ',');
    }
    
    // Use Venezuelan locale for standard numbers
    return parseFloat(value).toLocaleString('es-VE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
    });
}

// Make it globally available
window.formatNumber = formatNumber;

