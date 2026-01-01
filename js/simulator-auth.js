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
        // 1. Preferir el estado de SimpleAuth si está disponible
        if (window.SimpleAuth && window.SimpleAuth.state) {
            if (window.SimpleAuth.state.isLoading) {
                // Esperar un poco si SimpleAuth está cargando
                await new Promise(resolve => {
                    const check = () => {
                        if (!window.SimpleAuth.state.isLoading) resolve();
                        else setTimeout(check, 50);
                    };
                    check();
                });
            }
            if (window.SimpleAuth.state.isLoggedIn) {
                return true;
            }
        }

        // 2. Fallback al token estándar en localStorage (múltiples keys por compatibilidad)
        const token = localStorage.getItem('access_token') || 
                      sessionStorage.getItem('access_token') ||
                      localStorage.getItem('auth_token') ||
                      SafeStorage.getCookie('access_token');
        
        if (!token) {
            console.log('ℹ️ SimulatorAuth: No token found in any storage');
            return false;
        }

        // 3. Validar token con backend (solo si SimpleAuth falló o no está presente)
        try {
            const apiUrl = window.API_BASE_URL || 'https://electromatics-api.onrender.com';
            const response = await fetch(`${apiUrl}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Auth check failed:', error);
            // Si hay error de red pero tenemos token, permitimos acceso temporal
            return !!token;
        }
    },

    /**
     * Show login prompt overlay
     */
    showLoginPrompt: function() {
        // Create overlay if it doesn't exist
        if (document.getElementById('simulator-auth-overlay')) {
            document.getElementById('simulator-auth-overlay').style.display = 'flex';
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'simulator-auth-overlay';
        overlay.innerHTML = `
            <div class="auth-overlay-content">
                <div class="auth-overlay-icon">
                    <i class="fa-solid fa-lock"></i>
                </div>
                <h2>¡Acceso Exclusivo para Usuarios Registrados!</h2>
                <p class="auth-overlay-subtitle">
                    Regístrate gratis para acceder a todos nuestros simuladores interactivos
                </p>
                
                <div class="auth-benefits">
                    <div class="benefit-item">
                        <i class="fa-solid fa-check-circle"></i>
                        <span>Acceso ilimitado a todos los simuladores</span>
                    </div>
                    <div class="benefit-item">
                        <i class="fa-solid fa-check-circle"></i>
                        <span>Guarda tu progreso y configuraciones</span>
                    </div>
                    <div class="benefit-item">
                        <i class="fa-solid fa-check-circle"></i>
                        <span>Sin anuncios ni restricciones</span>
                    </div>
                    <div class="benefit-item">
                        <i class="fa-solid fa-check-circle"></i>
                        <span>Acceso a contenido educativo premium</span>
                    </div>
                </div>

                <div class="auth-buttons">
                    <button class="btn btn-primary btn-large" onclick="SimulatorAuth.openRegister()">
                        <i class="fa-solid fa-user-plus"></i> Registrarse Gratis
                    </button>
                    <button class="btn btn-secondary btn-large" onclick="SimulatorAuth.openLogin()">
                        <i class="fa-solid fa-sign-in-alt"></i> Ya tengo cuenta
                    </button>
                </div>

                <p class="auth-footer-text">
                    ¿Tienes problemas? <a href="contacto.html">Contáctanos</a>
                </p>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #simulator-auth-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(10, 12, 18, 0.95);
                backdrop-filter: blur(10px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .auth-overlay-content {
                background: linear-gradient(135deg, #1a2733 0%, #0f172a 100%);
                border: 2px solid #2c3e50;
                border-radius: 20px;
                padding: 50px 40px;
                max-width: 600px;
                width: 100%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }

            .auth-overlay-icon {
                font-size: 64px;
                color: var(--safety-orange, #FF9800);
                margin-bottom: 20px;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            .auth-overlay-content h2 {
                font-size: 28px;
                margin-bottom: 15px;
                color: #fff;
            }

            .auth-overlay-subtitle {
                font-size: 16px;
                color: #8899a6;
                margin-bottom: 30px;
            }

            .auth-benefits {
                text-align: left;
                margin: 30px 0;
                display: grid;
                gap: 15px;
            }

            .benefit-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                transition: all 0.3s ease;
            }

            .benefit-item:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: translateX(5px);
            }

            .benefit-item i {
                color: var(--safety-orange, #FF9800);
                font-size: 20px;
                flex-shrink: 0;
            }

            .benefit-item span {
                color: #fff;
                font-size: 15px;
            }

            .auth-buttons {
                display: flex;
                gap: 15px;
                margin-top: 30px;
                flex-wrap: wrap;
                justify-content: center;
            }

            .btn-large {
                padding: 15px 30px;
                font-size: 16px;
                font-weight: 600;
                flex: 1;
                min-width: 200px;
            }

            .auth-footer-text {
                margin-top: 25px;
                font-size: 14px;
                color: #8899a6;
            }

            .auth-footer-text a {
                color: var(--electric-blue, #00B4D8);
                text-decoration: none;
            }

            .auth-footer-text a:hover {
                text-decoration: underline;
            }

            @media (max-width: 600px) {
                .auth-overlay-content {
                    padding: 30px 20px;
                }

                .auth-overlay-content h2 {
                    font-size: 22px;
                }

                .btn-large {
                    min-width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(overlay);
    },

    /**
     * Open registration modal
     */
    openRegister: function() {
        if (window.openAuthModal) {
            window.openAuthModal('register');
        } else {
            alert('Sistema de autenticación no disponible. Por favor recarga la página.');
        }
    },

    /**
     * Open login modal
     */
    openLogin: function() {
        if (window.openAuthModal) {
            window.openAuthModal('login');
        } else {
            alert('Sistema de autenticación no disponible. Por favor recarga la página.');
        }
    },

    /**
     * Initialize simulator with authentication check
     * @param {Function} initCallback - Function to call if user is authenticated
     */
    init: async function(initCallback) {
        console.log('🛡️ SimulatorAuth: Initializing simulator guard...');
        const hasAccess = await this.checkAccess();
        
        if (!hasAccess) {
            console.warn('🚫 SimulatorAuth: Access denied, showing overlay');
            this.showLoginPrompt();
            return false;
        }

        console.log('✅ SimulatorAuth: Access granted');
        // Hide overlay if it was shown (rare case on quick login)
        const overlay = document.getElementById('simulator-auth-overlay');
        if (overlay) overlay.style.display = 'none';

        // User is authenticated, initialize simulator
        if (typeof initCallback === 'function') {
            initCallback();
        }

        return true;
    }
};

// Make it globally available
window.SimulatorAuth = SimulatorAuth;
