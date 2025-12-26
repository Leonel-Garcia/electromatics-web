/**
 * simple-auth.js
 * Sistema de Autenticación Conectado al Backend (FastAPI)
 */

// Usar configuración global de js/config.js
const API_URL = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://127.0.0.1:8001';

/**
 * SafeStorage
 * Wrapper para manejar localStorage de forma segura en móviles/incógnito
 */
const SafeStorage = {
    storage: null,
    inMemoryStore: {},
    
    init: () => {
        try {
            const testKey = '__test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            SafeStorage.storage = localStorage;
        } catch (e) {
            console.warn('LocalStorage restricted, using memory store');
            SafeStorage.storage = null;
        }
    },

    getItem: (key) => {
        if (SafeStorage.storage) {
            return SafeStorage.storage.getItem(key);
        }
        return SafeStorage.inMemoryStore[key] || null;
    },

    setItem: (key, value) => {
        if (SafeStorage.storage) {
            SafeStorage.storage.setItem(key, value);
        } else {
            SafeStorage.inMemoryStore[key] = value;
        }
    },

    removeItem: (key) => {
        if (SafeStorage.storage) {
            SafeStorage.storage.removeItem(key);
        } else {
            delete SafeStorage.inMemoryStore[key];
        }
    }
};

// Inicializar inmediatamente
SafeStorage.init();

const SimpleAuth = {
    state: {
        isLoggedIn: false,
        isPremium: false,
        user: null,
        token: null
    },

    // Inicializar
    init: () => {
        SimpleAuth.loadSession();
        SimpleAuth.injectModal();
        SimpleAuth.setupUI();
        SimpleAuth.setupPasswordToggle();
        SimpleAuth.updateUI();
    },

    // Inyectar HTML del modal
    injectModal: () => {
        if (document.getElementById('auth-modal')) return;

        const modalHTML = `
            <div id="auth-modal" class="auth-modal">
                <div class="auth-content">
                    <button id="close-auth" class="close-auth"><i class="fa-solid fa-xmark"></i></button>
                    
                    <div class="auth-tabs">
                        <button class="auth-tab active" data-tab="login">Iniciar Sesión</button>
                        <button class="auth-tab" data-tab="register">Registrarse</button>
                    </div>

                    <!-- Login Form -->
                    <div id="login-form-container" class="auth-form-container active">
                        <h2>Bienvenido de nuevo</h2>
                        <form id="login-form">
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="login-email" required>
                            </div>
                            <div class="form-group">
                                <label>Contraseña</label>
                                <div class="password-input-wrapper">
                                    <input type="password" id="login-password" required>
                                    <i class="fa-solid fa-eye password-toggle" data-target="login-password"></i>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary full-width">Acceder</button>
                        </form>
                        <p class="auth-footer">¿No tienes cuenta? <a href="#" id="switch-to-register">Regístrate</a></p>
                    </div>

                    <!-- Register Form -->
                    <div id="register-form-container" class="auth-form-container">
                        <h2>Crear Cuenta</h2>
                        <form id="register-form">
                            <div class="form-group">
                                <label>Nombre Completo</label>
                                <input type="text" id="reg-name" required>
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="reg-email" required>
                            </div>
                            <div class="form-group">
                                <label>Contraseña</label>
                                <div class="password-input-wrapper">
                                    <input type="password" id="reg-password" required>
                                    <i class="fa-solid fa-eye password-toggle" data-target="reg-password"></i>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary full-width">Registrarse</button>
                        </form>
                        <p class="auth-footer">¿Ya tienes cuenta? <a href="#" id="switch-to-login">Inicia Sesión</a></p>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Agregar estilos
        if (!document.getElementById('auth-styles')) {
            const style = document.createElement('style');
            style.id = 'auth-styles';
            style.textContent = `
                .auth-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.8);
                    z-index: 20000;
                    justify-content: center;
                    align-items: center;
                }
                .auth-modal.active { display: flex; }
                .auth-content {
                    background: #1a2733;
                    padding: 30px;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 400px;
                    position: relative;
                    border: 1px solid #2c3e50;
                }
                .close-auth {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 20px;
                    cursor: pointer;
                }
                .auth-tabs {
                    display: flex;
                    margin-bottom: 20px;
                    border-bottom: 1px solid #2c3e50;
                }
                .auth-tab {
                    flex: 1;
                    background: none;
                    border: none;
                    padding: 10px;
                    color: #8899a6;
                    cursor: pointer;
                    font-weight: 600;
                }
                .auth-tab.active {
                    color: #FFD700;
                    border-bottom: 2px solid #FFD700;
                }
                .auth-form-container { display: none; }
                .auth-form-container.active { display: block; }
                .form-group { margin-bottom: 15px; }
                .form-group label { display: block; margin-bottom: 5px; color: #8899a6; }
                .form-group input {
                    width: 100%;
                    padding: 10px;
                    background: #0f172a;
                    border: 1px solid #2c3e50;
                    border-radius: 6px;
                    color: #fff;
                }
                .full-width { width: 100%; margin-top: 10px; }
                .auth-footer { text-align: center; margin-top: 15px; font-size: 14px; color: #8899a6; }
                .auth-footer a { color: #FFD700; text-decoration: none; }
                .auth-message {
                    padding: 10px;
                    border-radius: 6px;
                    margin-bottom: 15px;
                    text-align: center;
                    font-size: 14px;
                }
                .auth-message.success { background: rgba(76, 175, 80, 0.2); color: #4caf50; }
                .auth-message.error { background: rgba(244, 67, 54, 0.2); color: #f44336; }
                
                /* Password Toggle Styles */
                .password-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .password-input-wrapper input {
                    padding-right: 40px;
                }
                .password-toggle {
                    position: absolute;
                    right: 12px;
                    color: #8899a6;
                    cursor: pointer;
                    transition: color 0.2s ease;
                    font-size: 16px;
                }
                .password-toggle:hover {
                    color: #FFD700;
                }
                .password-toggle.active {
                    color: #FFD700;
                }
            `;
            document.head.appendChild(style);
        }
    },

    // Cargar sesión desde LocalStorage (Token)
    loadSession: async () => {
        const token = SafeStorage.getItem('auth_token');
        if (token) {
            SimpleAuth.state.token = token;
            // Validar token y obtener datos del usuario
            try {
                const response = await fetch(`${API_URL}/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const user = await response.json();
                    SimpleAuth.state.user = {
                        name: user.full_name,
                        email: user.email,
                        isPremium: user.is_premium,
                        isAdmin: user.is_admin
                    };
                    SimpleAuth.state.isLoggedIn = true;
                    SimpleAuth.state.isPremium = user.is_premium;
                    SimpleAuth.updateUI();
                } else {
                    // Token inválido o expirado
                    SimpleAuth.logout();
                }
            } catch (error) {
                console.error("Error validando sesión:", error);
                // Si falla validación, solo limpiamos token, no recargamos para evitar bucles
                SafeStorage.removeItem('auth_token');
                SimpleAuth.state = { isLoggedIn: false, isPremium: false, user: null, token: null };
                SimpleAuth.updateUI();
            }
        }
    },

    // Registrar usuario (POST /register)
    register: async (name, email, password) => {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    full_name: name
                })
            });

            if (response.ok) {
                // Auto-login después de registro
                return await SimpleAuth.login(email, password);
            } else {
                const data = await response.json();
                return { success: false, message: data.detail || 'Error al registrar' };
            }
            return { success: false, message: 'Error de conexión. Verifica tu red.' };
        } catch (error) {
            console.error(`Register Error trying to fetch ${API_URL}/register:`, error);
            return { success: false, message: `Error de conexión: ${error.message}` };
        }
    },

    // Login (POST /token)
    login: async (email, password) => {
        try {
            const formData = new URLSearchParams();
            formData.append('username', email); // OAuth2 usa 'username' pero enviamos email
            formData.append('password', password);

            const response = await fetch(`${API_URL}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                const token = data.access_token;
                
                // Guardar token
                // Guardar token
                SafeStorage.setItem('auth_token', token);
                SimpleAuth.state.token = token;
                
                // Cargar datos de usuario
                await SimpleAuth.loadSession();
                
                return { success: true };
            } else {
                const data = await response.json();
                return { success: false, message: data.detail || 'Credenciales incorrectas' };
            }
        } catch (error) {
            console.error('Login Error:', error);
            return { success: false, message: `Error: ${error.message}` };
        }
    },

    // Verificar suscripción para funciones premium
    checkSubscription: () => {
        if (!SimpleAuth.state.isLoggedIn) {
            if (window.openAuthModal) {
                window.openAuthModal('login');
            } else {
                alert("Debe iniciar sesión para acceder a esta función.");
            }
            return false;
        }
        
        // BETA: All registered users have premium access
        if (SimpleAuth.state.isPremium) {
            return true;
        }
        
        // Fallback check from user object
        if (SimpleAuth.state.user && SimpleAuth.state.user.isPremium) {
            return true;
        }
        
        // If not premium (shouldn't happen in beta since all users are premium)
        const confirm = window.confirm("Esta función requiere el Plan Profesional.\n\n¿Desea suscribirse ahora?");
        if (confirm) {
            alert("Para activar su suscripción, por favor contacte a soporte@electromatics.com.ve");
        }
        return false;
    },

    // Logout
    logout: () => {
        SafeStorage.removeItem('auth_token');
        SimpleAuth.state = { isLoggedIn: false, isPremium: false, user: null, token: null };
        SimpleAuth.updateUI();
        window.location.reload();
    },

    // Mostrar mensaje
    showMessage: (containerId, message, type = 'error') => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const existingMsg = container.querySelector('.auth-message');
        if (existingMsg) existingMsg.remove();

        const msg = document.createElement('div');
        msg.className = `auth-message ${type}`;
        msg.textContent = message;
        container.insertBefore(msg, container.firstChild);

        setTimeout(() => msg.remove(), 5000);
    },

    // Configurar UI
    setupUI: () => {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;

        const closeBtn = document.getElementById('close-auth');
        const tabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const switchToRegister = document.getElementById('switch-to-register');
        const switchToLogin = document.getElementById('switch-to-login');
        const subscribeBtn = document.getElementById('subscribe-btn');

        window.openAuthModal = (tab = 'login') => {
            modal.classList.add('active');
            SimpleAuth.switchTab(tab);
        };

        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

        tabs.forEach(tab => {
            tab.onclick = () => SimpleAuth.switchTab(tab.dataset.tab);
        });

        if (switchToRegister) switchToRegister.onclick = (e) => { 
            e.preventDefault(); 
            SimpleAuth.switchTab('register'); 
        };
        
        if (switchToLogin) switchToLogin.onclick = (e) => { 
            e.preventDefault(); 
            SimpleAuth.switchTab('login'); 
        };
        
        if(subscribeBtn) {
            subscribeBtn.onclick = (e) => {
                e.preventDefault();
                if (SimpleAuth.state.isLoggedIn && SimpleAuth.state.user?.isPremium) { // Fixed property access
                    alert("¡Ya tienes una suscripción activa!");
                } else {
                    window.openAuthModal('register');
                }
            };
        }

        // Login form
        if (loginForm) loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            
            submitBtn.disabled = true;
            submitBtn.textContent = "Cargando...";
            
            const result = await SimpleAuth.login(email, pass);
            
            submitBtn.disabled = false;
            submitBtn.textContent = "Acceder";

            if (result.success) {
                SimpleAuth.showMessage('login-form-container', '¡Bienvenido!', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                SimpleAuth.showMessage('login-form-container', result.message, 'error');
            }
        };

        // Register form
        if (registerForm) registerForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;

            submitBtn.disabled = true;
            submitBtn.textContent = "Creando cuenta...";

            const result = await SimpleAuth.register(name, email, pass);
            
            submitBtn.disabled = false;
            submitBtn.textContent = "Registrarse";

            if (result.success) {
                SimpleAuth.showMessage('register-form-container', '¡Cuenta creada!', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                SimpleAuth.showMessage('register-form-container', result.message, 'error');
            }
        };
    },

    // Setup password toggle functionality
    setupPasswordToggle: () => {
        const toggleIcons = document.querySelectorAll('.password-toggle');
        
        toggleIcons.forEach(icon => {
            icon.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target');
                const passwordInput = document.getElementById(targetId);
                
                if (passwordInput) {
                    // Toggle password visibility
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        this.classList.remove('fa-eye');
                        this.classList.add('fa-eye-slash', 'active');
                    } else {
                        passwordInput.type = 'password';
                        this.classList.remove('fa-eye-slash', 'active');
                        this.classList.add('fa-eye');
                    }
                }
            });
        });
    },

    switchTab: (tabName) => {
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        document.querySelectorAll('.auth-form-container').forEach(f => {
            f.classList.toggle('active', f.id.includes(tabName));
        });
    },

    updateUI: () => {
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            if (SimpleAuth.state.isLoggedIn && SimpleAuth.state.user) {
                loginBtn.textContent = SimpleAuth.state.user.name.split(' ')[0];
                loginBtn.href = "#";
                loginBtn.onclick = (e) => {
                    e.preventDefault();
                    const action = confirm(`Hola ${SimpleAuth.state.user.name}\n\n¿Desea cerrar sesión?`);
                    if (action) SimpleAuth.logout();
                };

                // Mostrar link de admin si es admin
                if (SimpleAuth.state.user.isAdmin) {
                    const nav = document.querySelector('.desktop-nav');
                    if (nav && !document.getElementById('admin-link')) {
                        const adminLink = document.createElement('a');
                        adminLink.id = 'admin-link';
                        adminLink.href = 'admin.html';
                        adminLink.textContent = 'Admin';
                        adminLink.style.color = '#FFD700';
                        nav.insertBefore(adminLink, loginBtn);
                    }
                }
            } else {
                loginBtn.textContent = "Acceder";
                loginBtn.onclick = (e) => {
                    e.preventDefault();
                    window.openAuthModal();
                };
            }
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', SimpleAuth.init);
