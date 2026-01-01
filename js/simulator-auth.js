/**
 * simulator-auth.js
 * Shared authentication module for all simulators
 * Ensures users are logged in before accessing simulators
 */

const SimulatorAuth = {
    /**
     * Check if user has access to simulator
     * @returns {Promise<boolean>} True if user is authenticated
     */
    checkAccess: async function() {
        // 1. Esperar a que SimpleAuth termine de cargar
        if (window.SimpleAuth) {
            if (window.SimpleAuth.state.isLoading) {
                await new Promise(resolve => {
                    const check = () => {
                        if (!window.SimpleAuth.state.isLoading) resolve();
                        else setTimeout(check, 100);
                    };
                    check();
                });
            }
            
            // Si SimpleAuth dice que estamos logueados, tenemos acceso
            if (window.SimpleAuth.state.isLoggedIn) return true;
        }

        // 2. Fallback redundante para móviles (Cookies/Storage)
        const token = (typeof SafeStorage !== 'undefined') 
            ? SafeStorage.getItem('access_token') 
            : localStorage.getItem('access_token');
            
        return !!token;
    },

    /**
     * Show login prompt overlay
     */
    showLoginPrompt: function() {
        // Si SimpleAuth está presente, no mostramos el overlay de este script
        // SimpleAuth.checkGuard() ya se encargará de mostrar el modal global
        if (window.SimpleAuth) {
            console.log('🛡️ SimulatorAuth: Delegating login prompt to SimpleAuth');
            window.SimpleAuth.checkGuard();
            return;
        }

        // Si por alguna razón no hay SimpleAuth, mostrar un mensaje simple
        if (document.getElementById('simulator-auth-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'simulator-auth-overlay';
        overlay.innerHTML = `
            <div style="background:#1a2733; padding:40px; border-radius:12px; text-align:center; color:white; max-width:500px; border:2px solid #FF9800;">
                <i class="fa-solid fa-lock" style="font-size:48px; color:#FF9800; margin-bottom:20px;"></i>
                <h2>Área Restringida</h2>
                <p>Por favor, inicia sesión para acceder a este simulador.</p>
                <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top:20px;">Recargar Página</button>
            </div>
        `;
        overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center;";
        document.body.appendChild(overlay);
    },

    /**
     * Deprecated: Use window.openAuthModal directly
     */
    openRegister: function() { if (window.openAuthModal) window.openAuthModal('register'); },
    openLogin: function() { if (window.openAuthModal) window.openAuthModal('login'); },

    /**
     * Initialize simulator with authentication check
     */
    init: async function(initCallback) {
        console.log('🛡️ SimulatorAuth: Syncing with SimpleAuth...');
        const hasAccess = await this.checkAccess();
        
        if (!hasAccess) {
            this.showLoginPrompt();
            return false;
        }

        // Hide overlay if it exists
        const overlay = document.getElementById('simulator-auth-overlay');
        if (overlay) overlay.style.display = 'none';

        if (typeof initCallback === 'function') initCallback();
        return true;
    }
};

// Make it globally available
window.SimulatorAuth = SimulatorAuth;
