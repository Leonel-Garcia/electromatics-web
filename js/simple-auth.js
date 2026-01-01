/**
 * simple-auth.js
 * Sistema de Autenticación Conectado al Backend (FastAPI)
 */

// Usar configuración global de js/config.js con resolución dinámica
const API_URL = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.API_BASE_URL || 'https://electromatics-api.onrender.com');

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
            console.log('✅ LocalStorage available');
        } catch (e) {
            console.warn('⚠️ LocalStorage restricted, using memory/cookie store');
            SafeStorage.storage = null;
        }
    },

    // Aux para cookies (redundancia móvil)
    setCookie: (name, value, days = 7) => {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + d.toUTCString();
        // Añadir Secure si es HTTPS
        const secure = window.location.protocol === 'https:' ? ";Secure" : "";
        document.cookie = name + "=" + (value || "") + ";" + expires + ";path=/;SameSite=Lax" + secure;
    },

    getCookie: (name) => {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },

    getItem: (key) => {
        // 1. Intentar LocalStorage
        let val = null;
        if (SafeStorage.storage) {
            val = SafeStorage.storage.getItem(key);
        }
        // 2. Intentar SessionStorage (redundancia de pestaña)
        if (!val) {
            try { val = sessionStorage.getItem(key); } catch(e) {}
        }
        // 3. Intentar Cookies (Fallback/Redundancia)
        if (!val) {
            val = SafeStorage.getCookie(key);
            // Re-poblar storage para consistencia
            if (val && SafeStorage.storage) SafeStorage.storage.setItem(key, val);
            if (val) try { sessionStorage.setItem(key, val); } catch(e) {}
        }
        // 4. Memoria
        return val || SafeStorage.inMemoryStore[key] || null;
    },

    setItem: (key, value) => {
        // Guardar en todas partes para máxima persistencia
        if (SafeStorage.storage) {
            try { SafeStorage.storage.setItem(key, value); } catch(e) {}
        }
        try { sessionStorage.setItem(key, value); } catch(e) {}
        SafeStorage.setCookie(key, value);
        SafeStorage.inMemoryStore[key] = value;
    },

    removeItem: (key) => {
        if (SafeStorage.storage) {
            try { SafeStorage.storage.removeItem(key); } catch(e) {}
        }
        try { sessionStorage.removeItem(key); } catch(e) {}
        SafeStorage.setCookie(key, "", -1); // Expira cookie
        delete SafeStorage.inMemoryStore[key];
    }
};

// Inicializar inmediatamente
SafeStorage.init();

const SimpleAuth = {
    state: {
        isLoggedIn: false,
        isPremium: false,
        user: null,
        token: null,
        isLoading: true, // Estado de carga inicial
        isInitialized: false // Evitar doble inicialización
    },

    // Inicializar
    init: async () => {
        if (SimpleAuth.state.isInitialized) return;
        SimpleAuth.state.isInitialized = true;

        console.log('🚀 SimpleAuth: Initializing...');
        
        // 0. Hook inmediato para el botón de login para evitar 'undefined'
        window.openAuthModal = (tab = 'login') => {
            const modal = document.getElementById('auth-modal');
            if (modal) {
                modal.classList.add('active');
                SimpleAuth.switchTab(tab);
            } else {
                console.error('❌ SimpleAuth: Modal not injected yet!');
            }
        };

        try {
            // 1. Inicializar almacenamiento persistente
            SafeStorage.init();
            
            // 2. Inyectar UI
            SimpleAuth.injectModal();
            SimpleAuth.setupUI(); // Esto sobrescribirá el hook temporal del paso 0 con la lógica real
            SimpleAuth.setupPasswordToggle();
            
            // 3. Cargar sesión y esperar validación
            console.log('📡 SimpleAuth: Loading session...');
            await SimpleAuth.loadSession();
            
            // 4. Actualizar visualmente
            SimpleAuth.updateUI();
            
            // 5. Ejecutar guardia de seguridad global
            SimpleAuth.checkGuard();
            
            console.log('✅ SimpleAuth: Initialized successfully');
        } catch (error) {
            console.error('❌ SimpleAuth: Critical error during initialization:', error);
        }
    },

    // Verificar si el usuario puede estar en la página actual
    checkGuard: async () => {
        // Detectar móvil para aplicar un pequeño retraso de "asentamiento" de sesión
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile && !SimpleAuth.state.isLoggedIn) {
            console.log('📱 Mobile detected, applying grace period for session settling...');
            await new Promise(resolve => setTimeout(resolve, 600)); // 600ms de gracia
        }

        // Normalizar URL: quitar parámetros de búsqueda y fragmentos
        const path = window.location.pathname;
        const pageName = path.split("/").pop() || "index.html";
        const cleanPage = pageName.split('?')[0].split('#')[0];
        
        console.log('🛡️ Auth Guard checking path:', cleanPage);

        // Whitelist de páginas públicas (soporta con y sin .html)
        const publicPages = [
            'index.html', 
            '', 
            '/',
            'servicios.html', 'servicios',
            'proyectos.html', 'proyectos',
            'nosotros.html', 'nosotros',
            'contacto.html', 'contacto',
            'museo.html', 'museo'
        ];

        const isProtected = !publicPages.includes(cleanPage);
        
        // Si el usuario ya está logueado o está cargando, no hacer nada todavía
        if (SimpleAuth.state.isLoading) {
            console.log('⏳ Auth Guard waiting for session load...');
            return;
        }

        // Si ya está logueado, asegurarse de que el modal esté cerrado (especialmente útil en móviles si hubo delay)
        if (SimpleAuth.state.isLoggedIn) {
            const modal = document.getElementById('auth-modal');
            if (modal && modal.classList.contains('active')) {
                console.log('✅ User is logged in, auto-closing lingering modal');
                modal.classList.remove('active');
            }
            return;
        }
        
        if (isProtected && !SimpleAuth.state.isLoggedIn) {
            console.warn('🚫 Protected page detected! Redirecting or showing modal...');
            // Activar modo restringido: no se puede cerrar el modal
            SimpleAuth.state.isRestricted = true;
            
            // Abrir modal inmediatamente si ya cargó y no hay sesión
            if (window.openAuthModal) {
                window.openAuthModal('login');
                
                // Ajustes visuales para modo restringido
                const modal = document.getElementById('auth-modal');
                const closeBtn = document.getElementById('close-auth');
                if (modal) modal.classList.add('restricted');
                if (closeBtn) {
                    closeBtn.style.display = 'none';
                }
            }
        }
    },

    // Inyectar HTML del modal
    injectModal: () => {
        // Asegurar estilos primero (siempre se inyectan)
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
                
                /* Restricted Mode Styles */
                .auth-modal.restricted {
                    cursor: not-allowed;
                }
                .auth-modal.restricted .auth-content {
                    cursor: default;
                    box-shadow: 0 0 50px rgba(0,0,0,0.5);
                    border: 2px solid #FFD700;
                }
            `;
            document.head.appendChild(style);
        }

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

                    <!-- Footer para modo restringido -->
                    <div id="auth-restricted-footer" class="auth-restricted-footer" style="display: none; margin-top: 20px; text-align: center; border-top: 1px solid #2c3e50; padding-top: 15px;">
                        <a href="index.html" class="btn btn-secondary" style="width: 100%; display: block; text-decoration: none;">
                            <i class="fa-solid fa-house"></i> Volver al Inicio
                        </a>
                        <p style="font-size: 12px; color: #8899a6; margin-top: 10px;">
                            Se requiere registro para acceder a herramientas técnicas.
                        </p>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    // Cargar sesión desde LocalStorage (Token)
    loadSession: async () => {
        SimpleAuth.state.isLoading = true;
        
        // Standardize to 'access_token' for global consistency
        let token = SafeStorage.getItem('access_token') || SafeStorage.getItem('auth_token');
        
        if (token) {
            // Migrar token si usa el nombre viejo
            if (SafeStorage.getItem('auth_token')) {
                SafeStorage.setItem('access_token', token);
                SafeStorage.removeItem('auth_token');
            }
            
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
                    console.log('✅ Session validated for:', user.email);
                } else if (response.status === 401 || response.status === 403) {
                    // Solo limpiamos si el servidor nos dice explícitamente que el token no es válido
                    console.warn('❌ Session expired or invalid (401/403)');
                    SimpleAuth.clearSession();
                } else {
                    // En caso de error de servidor (500 etc), mantenemos la sesión local 
                    // para no bloquear al usuario por un error técnico del backend
                    console.error('⚠️ Server error during validation:', response.status);
                    SimpleAuth.state.isLoggedIn = true; 
                }
            } catch (error) {
                console.error("🌐 Network error during session validation:", error);
                // Si hay error de red, asumimos que está logueado si tiene token,
                // para evitar prompts falsos en conexiones inestables
                SimpleAuth.state.isLoggedIn = true;
            }
        } else {
            console.log('ℹ️ No token found in storage');
        }
        
        SimpleAuth.state.isLoading = false;
    },

    // Limpia localmente sin recargar si no es necesario
    clearSession: () => {
        SafeStorage.removeItem('access_token');
        SafeStorage.removeItem('auth_token');
        // Mantener isInitialized y isLoading pero limpiar autenticación
        SimpleAuth.state.isLoggedIn = false;
        SimpleAuth.state.isPremium = false;
        SimpleAuth.state.user = null;
        SimpleAuth.state.token = null;
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
                
                // Guardar token estándar
                SafeStorage.setItem('access_token', token);
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
        SafeStorage.removeItem('access_token');
        SafeStorage.removeItem('auth_token');
        SimpleAuth.state = { isLoggedIn: false, isPremium: false, user: null, token: null, isLoading: false };
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
            
            // Mostrar footer de retorno si está en modo restringido
            const restrictedFooter = document.getElementById('auth-restricted-footer');
            if (restrictedFooter) {
                restrictedFooter.style.display = SimpleAuth.state.isRestricted ? 'block' : 'none';
            }
        };

        if (closeBtn) closeBtn.onclick = () => {
            if (!SimpleAuth.state.isRestricted) {
                modal.classList.remove('active');
            }
        };
        
        modal.onclick = (e) => { 
            if (e.target === modal && !SimpleAuth.state.isRestricted) {
                modal.classList.remove('active'); 
            }
        };

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
                // Verificar persistencia antes de recargar (Crucial para móviles)
                const verifyToken = SafeStorage.getItem('access_token');
                if (!verifyToken) {
                    console.error('❌ Persistence Failure: Token not saved!');
                    // Re-intentar forzado
                    SafeStorage.setItem('access_token', SimpleAuth.state.token);
                }
                
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
                // Verificar persistencia antes de recargar
                const verifyToken = SafeStorage.getItem('access_token');
                if (!verifyToken) {
                    console.error('❌ Persistence Failure after register!');
                    SafeStorage.setItem('access_token', SimpleAuth.state.token);
                }

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
