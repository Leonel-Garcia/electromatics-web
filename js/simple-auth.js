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
const isMobile = () => {
    return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           (window.innerWidth <= 850) || 
           (navigator.maxTouchPoints > 0);
};

// --- GLOBAL ACCESS HOOK (v8.0) ---
// Returns true immediately if ANY session evidence exists in storage
window.hasActiveSession = () => {
    const token = localStorage.getItem('access_token') || 
                  sessionStorage.getItem('access_token') || 
                  document.cookie.includes('access_token');
    
    // --- SEGURIDAD ESTRICTA (v8.3) ---
    // Solo un token real cuenta como sesión activa para el Guard.
    // El 'insurance' (seguro) queda relegado a parches de UI internos.
    return !!token; 
};

const SafeStorage = {
    storage: null,
    inMemoryStore: {},
    
    init: () => {
        // --- 0. INYECTAR KILL SWITCH CSS INMEDIATAMENTE ---
        if (!document.getElementById('auth-kill-switch')) {
            const style = document.createElement('style');
            style.id = 'auth-kill-switch';
            style.textContent = `
                body.is-authenticated .auth-modal,
                body.is-authenticated #simulator-auth-overlay { 
                    display: none !important; 
                    visibility: hidden !important;
                    pointer-events: none !important;
                    opacity: 0 !important;
                    z-index: -100 !important;
                }
            `;
            document.head.appendChild(style);
        }

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

        // --- 1. DETECCIÓN ULTRA-TEMPRANA DE SESIÓN ---
        const token = SafeStorage.getItem('access_token');
        const insurance = SafeStorage.getItem('auth_loop_insurance');
        const isInsured = insurance && (Date.now() - parseInt(insurance) < 120000);

        if (token || isInsured || SafeStorage.getCookie('auth_sync_insurance')) {
            document.body.classList.add('is-authenticated');
            console.log('🛡️ SafeStorage: Session detected, armor activated.');
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
        }

        // 4. Memoria
        if (!val) val = SafeStorage.inMemoryStore[key] || null;

        // --- AUTOSYNC: Si lo encontramos en un sitio pero falta en otros, sincronizar ---
        if (val && key === 'access_token') {
            if (SafeStorage.storage && !SafeStorage.storage.getItem(key)) {
                try { SafeStorage.storage.setItem(key, val); } catch(e) {}
            }
            try {
                if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, val);
            } catch(e) {}
            if (!SafeStorage.getCookie(key)) {
                SafeStorage.setCookie(key, val);
            }
        }

        return val;
    },

    setItem: (key, value) => {
        // Soporte para objetos (identidad del usuario)
        const stringValue = (typeof value === 'object') ? JSON.stringify(value) : value;

        // Guardar en todas partes para máxima persistencia
        if (SafeStorage.storage) {
            try { SafeStorage.storage.setItem(key, stringValue); } catch(e) {}
        }
        try { sessionStorage.setItem(key, stringValue); } catch(e) {}
        SafeStorage.setCookie(key, stringValue);
        SafeStorage.inMemoryStore[key] = stringValue;
    },

    removeItem: (key) => {
        if (SafeStorage.storage) {
            try { SafeStorage.storage.removeItem(key); } catch(e) {}
        }
        try { sessionStorage.removeItem(key); } catch(e) {}
        SafeStorage.setCookie(key, "", -1); // Expira cookie
        delete SafeStorage.inMemoryStore[key];
    },

    // Auxiliar para leer JSON de forma segura
    getJSON: (key) => {
        const val = SafeStorage.getItem(key);
        if (!val) return null;
        try { return JSON.parse(val); } catch(e) { return null; }
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

        console.log('🚀 SimpleAuth: Initializing [v7.0 - CSS Shield]...');
        
        // REINICIO DE ESTADO CRÍTICO
        SimpleAuth.state.isLoading = true;
        SimpleAuth.state.isRestricted = false;

        // Asegurar que el body refleje el estado detectado por SafeStorage
        if (SafeStorage.getItem('access_token')) {
            document.body.classList.add('is-authenticated');
        }
        
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
            // 1. Inicializar almacenamiento persistente IMMEDIATAMENTE (Safe wrapper)
            SafeStorage.init();

            // 2. Inyectar UI para que el botón funcione
            SimpleAuth.injectModal();
            SimpleAuth.setupUI(); 
            SimpleAuth.setupPasswordToggle();
            
            // 3. Primer intento de actualización UI
            SimpleAuth.updateUI();

            // 4. Retraso de asentamiento solo para carga de sesión en móviles
            if (isMobile()) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // SEGURO DE PERSISTENCIA (Bypass inmediato usando el wrapper seguro)
            const insurance = SafeStorage.getItem('auth_loop_insurance');
            // Seguro ampliado a 2 minutos para estabilidad en redes móviles
            const isInsured = insurance && (Date.now() - parseInt(insurance) < 120000); 
            
            if (SafeStorage.getItem('access_token') || isInsured || SafeStorage.getCookie('auth_sync_insurance')) {
                console.log('🎫 SimpleAuth: Shield Active (Insured or Token)');
                SimpleAuth.state.isLoggedIn = true;
                SimpleAuth.state.isRestricted = false;
                SimpleAuth.updateUI(); 
            }
            
            // 5. Cargar sesión (Intento de recuperación inmediata desde cache)
            console.log('📡 SimpleAuth: Validating session...');
            await SimpleAuth.loadSession();
            
            // 6. Actualización final con datos frescos
            SimpleAuth.updateUI();
            
            // 7. Ejecutar guardia de seguridad global (AHORA ESPERAMOS A QUE TERMINE)
            await SimpleAuth.checkGuard();
            
            console.log('✅ SimpleAuth: Initialized successfully');
        } catch (error) {
            console.error('❌ SimpleAuth: Critical error during initialization:', error);
        }
    },

    // Verificar si el usuario puede estar en la página actual
    checkGuard: async () => {
        // --- AUTORIDAD ABSOLUTA (v8.1) ---
        // Si tenemos sesión activa real (token presente), dejamos pasar.
        const token = SafeStorage.getItem('access_token');
        if (token) {
            console.log('🛡️ Auth Guard: Direct access granted (Token found)');
            SimpleAuth.state.isLoggedIn = true;
            SimpleAuth.state.isRestricted = false;
            document.body.classList.add('is-authenticated');
            return;
        }

        // --- ESCUDO DE PERSISTENCIA MÓVIL (Nuclear Shield) ---
        // IMPORTANTE (v8.2): El seguro NO debe permitir el bypass total de checkGuard.
        // Solo sirve para evitar el refresco agresivo de la UI, pero el guard DEBE seguir su curso
        // a menos que queramos silenciar el modal en cargas ultrarrápidas de sesión válida.
        // Lo desactivamos como bypass directo para forzar la validación de ruta.
        const insurance = SafeStorage.getItem('auth_loop_insurance');
        const isInsured = insurance && (Date.now() - parseInt(insurance) < 120000);

        if (isInsured || SafeStorage.getCookie('auth_sync_insurance')) {
            console.log('🛡️ Auth Guard: Shield is active (UI-only bypass skipped)');
            // Solo marcamos como logueado si ya hay evidencia previa, pero NO retornamos
            // permitimos que el flujo llegue a la validación de 'isProtected'.
        }

        // Solo aplicamos retrasos si NO hay sesión y es móvil, para evitar falsos positivos de red
        if (isMobile() && !SimpleAuth.state.isLoggedIn) {
            console.log('📱 Mobile Shield: Verification delay...');
            await new Promise(resolve => setTimeout(resolve, 800));
            // No retornamos aquí prematuramente para obligar a pasar por la protección
        }

        // Normalizar URL: quitar parámetros de búsqueda y fragmentos
        const path = window.location.pathname;
        
        // --- NORMALIZACIÓN DE RUTA MEJORADA (v8.2) ---
        // 1. Quitar slash final si existe (ej: /simuladores/ -> /simuladores)
        let normalizedPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
        
        // 2. Obtener el nombre del archivo o segmento final
        // Si normalizedPath es "/" o vacío, tratamos como index.html
        let pageName = normalizedPath.split("/").pop();
        if (!pageName || pageName === "") pageName = "index.html";
        
        // 3. Quitar query params y fragmentos (redundancia)
        const cleanPage = pageName.split('?')[0].split('#')[0];
        
        console.log('🛡️ Auth Guard checking path:', cleanPage, '(Original path:', path, ')');

        // Whitelist de páginas públicas (Páginas de información y aterrizaje)
        const publicPages = [
            'index.html', '', '/',
            'que-es-electromatics.html', 'que-es-electromatics',
            'para-quien-es.html', 'para-quien-es',
            'nosotros.html', 'nosotros',
            'servicios.html', 'servicios',
            'proyectos.html', 'proyectos',
            'contacto.html', 'contacto',
            'museo.html', 'museo',
            'uso-responsable-ia.html', 'uso-responsable-ia',
            'faq.html', 'faq'
        ];

        const isProtected = !publicPages.includes(cleanPage);
        
        // Si el usuario ya está logueado o está cargando, no hacer nada todavía
        if (SimpleAuth.state.isLoading) {
            console.log('⏳ Auth Guard waiting for session load...');
            return;
        }

        // Si ya está logueado, asegurarse de que el modal esté cerrado (especialmente útil en móviles si hubo delay)
        if (SimpleAuth.state.isLoggedIn) {
            console.log('🛡️ Auth Guard [PASS]: User is confirmed. Force closing modal.');
            SimpleAuth.state.isRestricted = false; // Liberar restricción
            const modal = document.getElementById('auth-modal');
            if (modal) {
                modal.classList.remove('active', 'restricted');
                modal.style.display = 'none';
                modal.style.zIndex = '-1';
                modal.style.opacity = '0';
                modal.style.pointerEvents = 'none';
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
                    background: rgba(0,0,0,0.95);
                    z-index: -1;
                    justify-content: center;
                    align-items: center;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                }
                .auth-modal.active { 
                    display: flex !important; 
                    opacity: 1;
                    z-index: 90000;
                    pointer-events: all;
                }
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
        SimpleAuth.state.isRestricted = false;
        
        // 1. INTENTO DE RECUPERACIÓN DESDE CACHE LOCAL (Persistencia Inmediata Global)
        const cachedUser = SafeStorage.getJSON('user_data');
        const token = SafeStorage.getItem('access_token');

        if (token && cachedUser) {
            console.log('💎 loadSession: Identity restored from cache');
            SimpleAuth.state.user = cachedUser;
            SimpleAuth.state.isLoggedIn = true;
            SimpleAuth.state.token = token;
            document.body.classList.add('is-authenticated');
            SimpleAuth.updateUI(); 
        }

        if (token || window.hasActiveSession()) {
            SimpleAuth.state.isLoggedIn = true;
            document.body.classList.add('is-authenticated');
            SimpleAuth.state.token = token || SafeStorage.getItem('access_token');

            // Validar token y obtener datos FRESCOS del usuario
            try {
                const response = await fetch(`${API_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${SimpleAuth.state.token}` }
                });
                
                if (response.ok) {
                    const user = await response.json();
                    const userData = {
                        name: user.full_name,
                        email: user.email,
                        isPremium: user.is_premium,
                        isAdmin: user.is_admin
                    };
                    
                    // Actualizar estado y CACHE GLOBAL
                    SimpleAuth.state.user = userData;
                    SimpleAuth.state.isLoggedIn = true;
                    SimpleAuth.state.isPremium = user.is_premium;
                    SafeStorage.setItem('user_data', userData);
                    
                    console.log('✅ Session validated and cached for:', user.email);
                } else if (response.status === 401 || response.status === 403) {
                    console.warn('❌ Session expired or invalid');
                    SimpleAuth.clearSession();
                } else {
                    // Si el servidor falla pero tenemos cache, mantenemos optimismo
                    if (SimpleAuth.state.user) {
                        console.warn('⚠️ Server validation failed (Status: ' + response.status + '), keeping cached identity');
                        SimpleAuth.state.isLoggedIn = true;
                    }
                }
            } catch (error) {
                console.error("🌐 Network error, relying on cache/token persistence");
                if (token) SimpleAuth.state.isLoggedIn = true;
            }
        }
        
        SimpleAuth.state.isLoading = false;
    },

    // Limpia localmente sin recargar si no es necesario
    clearSession: () => {
        SafeStorage.removeItem('access_token');
        SafeStorage.removeItem('auth_token');
        SafeStorage.removeItem('user_data');
        SafeStorage.removeItem('auth_loop_insurance');
        
        // Borrar cookie de seguro también
        document.cookie = "auth_sync_insurance=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
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
        document.body.classList.remove('is-authenticated');
        SimpleAuth.clearSession();
        SimpleAuth.state.isLoading = false;
        SimpleAuth.state.isRestricted = false;
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

        // Limpieza preventiva: si ya estamos logueados, el modal debe estar oculto
        if (SimpleAuth.state.isLoggedIn && !SimpleAuth.state.isRestricted) {
            modal.style.display = 'none';
        }

        const closeBtn = document.getElementById('close-auth');
        const tabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const switchToRegister = document.getElementById('switch-to-register');
        const switchToLogin = document.getElementById('switch-to-login');
        const subscribeBtn = document.getElementById('subscribe-btn');

        window.openAuthModal = (tab = 'login') => {
            // BLOQUEO ABSOLUTO (Mejorado v9.1): Solo bloqueamos si hay un TOKEN real.
            // El seguro (insurance) solo sirve para no MOSTRAR el modal automáticamente, 
            // pero si se solicita explícitamente o el Guard lo requiere, permitimos apertura si falta el token.
            const hasToken = !!SafeStorage.getItem('access_token');
            const insurance = SafeStorage.getItem('auth_loop_insurance');
            const isInsured = insurance && (Date.now() - parseInt(insurance) < 120000);

            if (SimpleAuth.state.isLoggedIn && hasToken && !SimpleAuth.state.isRestricted) {
                console.log('🚫 openAuthModal: Blocked - session confirmed with token.');
                return;
            }

            modal.style.display = 'flex';
            modal.style.zIndex = '90000';
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
                // Sincronizar y actualizar estado inmediatamente
                SimpleAuth.state.isLoggedIn = true;
                SimpleAuth.state.isRestricted = false; // Quitar modo restringido para permitir cerrar
                
                // Actualizar UI sin esperar al reload
                SimpleAuth.updateUI();
                
                // Cerrar modal inmediatamente
                if (modal) {
                    modal.classList.remove('active');
                    modal.classList.remove('restricted');
                }
                
                // 1. Sincronizar persistencia HARDWARE inmediatamente
                console.log('🔐 Synchronizing session across all storage layers...');
                const token = SimpleAuth.state.token;
                SafeStorage.setItem('access_token', token);
                
                // 2. ACTIVAR ESCUDO NUCLEAR contra bucles de recarga (2 MINUTOS)
                const now = Date.now().toString();
                SafeStorage.setItem('auth_loop_insurance', now);
                SafeStorage.setCookie('auth_sync_insurance', 'true', 0.0015); // ~2 minutos

                // Notificar éxito
                SimpleAuth.showMessage('login-form-container', '¡Sesión Iniciada! Refrescando...', 'success');
                
                // Reload demorado para persistencia física en móviles
                const delay = isMobile() ? 1500 : 800;
                setTimeout(() => {
                    // Force refresh bypass cache
                    window.location.href = window.location.pathname + (window.location.search || '') + (window.location.search ? '&' : '?') + 'auth_upd=' + Date.now();
                }, delay); 
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
                // Sincronizar y actualizar estado inmediatamente
                SimpleAuth.state.isLoggedIn = true;
                SimpleAuth.state.isRestricted = false;
                
                // Actualizar UI sin esperar al reload
                SimpleAuth.updateUI();
                
                // Cerrar modal inmediatamente
                if (modal) {
                    modal.classList.remove('active');
                    modal.classList.remove('restricted');
                }

                // Sincronizar persistencia HARDWARE antes de recargar
                console.log('🔐 Synchronizing register session...');
                SafeStorage.setItem('access_token', SimpleAuth.state.token);
                
                // Nuclear Shield (2 minutes)
                const now = Date.now().toString();
                SafeStorage.setItem('auth_loop_insurance', now);
                SafeStorage.setCookie('auth_sync_insurance', 'true', 0.0015);
                
                SimpleAuth.showMessage('register-form-container', '¡Cuenta Creada! Refrescando...', 'success');
                
                const delay = isMobile() ? 1500 : 800;
                setTimeout(() => {
                    window.location.href = window.location.pathname + (window.location.search || '') + (window.location.search ? '&' : '?') + 'auth_reg=' + Date.now();
                }, delay);
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

    // --- PROTECCIÓN DE NAVEGACIÓN (v9.1) ---
    handleProtectedClick: (e) => {
        const hasToken = !!SafeStorage.getItem('access_token');
        
        if (!SimpleAuth.state.isLoggedIn || !hasToken) {
            e.preventDefault();
            console.warn('🚫 Navigation Guard: Access restricted (No Token). Opening modal.');
            
            // Forzar actualización de estado si por alguna razón perdimos el token
            if (!hasToken) SimpleAuth.state.isLoggedIn = false;
            
            // Cerrar menú móvil si está abierto (Interoperabilidad con ui.js)
            const desktopNav = document.querySelector('.desktop-nav');
            if (desktopNav && desktopNav.classList.contains('active')) {
                desktopNav.classList.remove('active');
                const icon = document.querySelector('.mobile-nav-toggle i');
                if (icon) {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }

            // Forzar modo restringido especialmente en móviles para estas secciones
            if (isMobile()) {
                SimpleAuth.state.isRestricted = true;
                const modal = document.getElementById('auth-modal');
                if (modal) modal.classList.add('restricted');
                
                const closeBtn = document.getElementById('close-auth');
                if (closeBtn) closeBtn.style.display = 'none';
                
                const restrictedFooter = document.getElementById('auth-restricted-footer');
                if (restrictedFooter) restrictedFooter.style.display = 'block';
            }

            window.openAuthModal('login');
        }
    },

    setupNavigationGuards: () => {
        // Lista de páginas que requieren registro obligatorio
        const protectedPages = [
            'normativa-electrica.html',
            'simuladores.html',
            'formacion.html',
            'electro-info.html',
            'calculadora.html',
            'simuladores-rlc.html',
            'simulador-tablero.html',
            'motoranalitics.html',
            'curso-ia.html'
        ];

        // Seleccionar enlaces en navegación principal, footer y botones de acción
        const selectors = '.desktop-nav a, .footer-links a, .hero-content a.btn, .services-grid a, .cta-section a';
        const navLinks = document.querySelectorAll(selectors);
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href === '#' || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) return;

            // Extraer nombre de página para comparar
            const pageName = href.split('/').pop().split('?')[0].split('#')[0];
            const isProtected = protectedPages.some(page => pageName === page || pageName === page.replace('.html', ''));
            
            if (isProtected) {
                // Limpiar listener previo
                link.removeEventListener('click', SimpleAuth.handleProtectedClick);
                
                // Interceptar si NO hay sesión confirmada o falta el token físico
                const hasToken = !!SafeStorage.getItem('access_token');
                if (!SimpleAuth.state.isLoggedIn || !hasToken) {
                    link.addEventListener('click', SimpleAuth.handleProtectedClick);
                }
            }
        });
    },

    updateUI: () => {
        const loginBtn = document.getElementById('login-btn');
        const modal = document.getElementById('auth-modal');
        
        if (SimpleAuth.state.isLoggedIn) {
            document.body.classList.add('is-authenticated');
        }

        if (loginBtn) {
            if (SimpleAuth.state.isLoggedIn) {
                // SI ESTAMOS LOGUEADOS: EL MODAL DEBE MORIR DEFINITIVAMENTE (Fuerza Bruta CSS)
                if (modal && !SimpleAuth.state.isRestricted) {
                    modal.classList.remove('active', 'restricted');
                }
                // Fallback de nombre para móviles/sesiones lentas
                const userName = (SimpleAuth.state.user && SimpleAuth.state.user.name) 
                                ? SimpleAuth.state.user.name.split(' ')[0] 
                                : 'Usuario';
                                
                loginBtn.textContent = userName;
                loginBtn.href = "#";
                loginBtn.onclick = (e) => {
                    e.preventDefault();
                    const greeting = (SimpleAuth.state.user && SimpleAuth.state.user.name) 
                                    ? `Hola ${SimpleAuth.state.user.name}` 
                                    : 'Hola';
                    const action = confirm(`${greeting}\n\n¿Desea cerrar sesión?`);
                    if (action) SimpleAuth.logout();
                };

                // Mostrar link de admin si es admin
                if (SimpleAuth.state.user && SimpleAuth.state.user.isAdmin) {
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

        // --- ACTIVAR GUARDIAS DE NAVEGACIÓN ---
        SimpleAuth.setupNavigationGuards();
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', SimpleAuth.init);
