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
        // --- BYPASS ABSOLUTO (v8.0) ---
        if (typeof window.hasActiveSession === 'function' && window.hasActiveSession()) {
            console.log('🛡️ SimulatorAuth: Global session detected, direct access granted.');
            return true;
        }

        // --- ESCUDO FÍSICO PRIORITARIO (v7.0) ---
        if (document.body.classList.contains('is-authenticated')) {
            console.log('🛡️ SimulatorAuth: Global armor detected, granting access.');
            return true;
        }

        // --- ESCUDO DE PERSISTENCIA (v5.0) ---
        // Removido bypass por seguro en v8.3 para forzar validación de token.
        // El seguro solo debe usarse en SimpleAuth para suavizar la transición de UI.

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

        // 2. Fallback redundante para móviles (Cookies/Storage/Identity Cache)
        const token = (typeof SafeStorage !== 'undefined') 
            ? SafeStorage.getItem('access_token') 
            : localStorage.getItem('access_token');
            
        return !!token;
    },

    /**
     * Logs out the user by clearing authentication tokens and reloading the page.
     * Requires SimpleAuth to be present.
     */
    logout: () => {
        if (typeof SafeStorage !== 'undefined') {
            SafeStorage.removeItem('access_token');
            SafeStorage.removeItem('auth_token');
            SafeStorage.removeItem('auth_loop_insurance');
            SafeStorage.setCookie('auth_sync_insurance', '', -1);
        } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_loop_insurance');
            // No equivalent for cookie in localStorage fallback
        }

        if (window.SimpleAuth) {
            window.SimpleAuth.state = { isLoggedIn: false, isPremium: false, user: null, token: null, isLoading: false, isRestricted: false };
            window.SimpleAuth.updateUI();
        }
        window.location.reload();
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

    init: async function(initCallback) {
        console.log('🛡️ SimulatorAuth: Syncing with SimpleAuth lifecycle...');
        
        // Esperar a que SimpleAuth esté TOTALMENTE inicializado y VALIDADO
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos max
        while (attempts < maxAttempts) {
            if (window.SimpleAuth && window.SimpleAuth.state.isInitialized && !window.SimpleAuth.state.isLoading) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        const hasAccess = await this.checkAccess();
        
        if (!hasAccess) {
            console.warn('🛡️ SimulatorAuth: Access denied, showing prompt');
            this.showLoginPrompt();
            return false;
        }

        // --- SEGURO ANTI-MODAL: Si tenemos acceso, forzamos a SimpleAuth a estar en paz ---
        if (window.SimpleAuth) {
            window.SimpleAuth.state.isRestricted = false;
            window.SimpleAuth.updateUI();
            window.SimpleAuth.checkSubscription();
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
