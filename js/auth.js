/**
 * auth.js
 * Real Authentication System using FastAPI Backend
 */

// API_BASE_URL is now defined in config.js
const API_URL = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.API_BASE_URL || 'https://electromatics-api.onrender.com');

const Auth = {
    state: {
        isLoggedIn: false,
        isSubscribed: false,
        user: null,
        token: null
    },

    init: async () => {
        Auth.loadSession();
        Auth.setupUI();
        await Auth.verifyToken(); // Verify if token is still valid
        Auth.updateUI();
        Auth.checkUrlForVerification(); // Check if URL contains verification token
    },

    checkUrlForVerification: async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            await Auth.verifyEmailWithToken(token);
        }
    },

    verifyEmailWithToken: async (token) => {
        Auth.showMessage('login-form-container', 'Verificando email...', 'info');
        
        try {
            const response = await fetch(`${API_URL}/verify-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });

            if (response.ok) {
                const result = await response.json();
                Auth.showMessage('login-form-container', '¡Email verificado exitosamente! Ahora puedes iniciar sesión.', 'success');
                // Clear URL params
                window.history.replaceState({}, document.title, window.location.pathname);
                // Open login modal after 2 seconds
                setTimeout(() => {
                    const modal = document.getElementById('auth-modal');
                    if (modal) {
                        modal.classList.add('active');
                        Auth.switchTab('login');
                    }
                }, 2000);
            } else {
                const error = await response.json();
                Auth.showMessage('login-form-container', `Error: ${error.detail}`, 'error');
            }
        } catch (error) {
            Auth.showMessage('login-form-container', 'Error de conexión al verificar email', 'error');
        }
    },

    loadSession: () => {
        const token = localStorage.getItem('access_token');
        if (token) {
            Auth.state.token = token;
            Auth.state.isLoggedIn = true;
        } else {
            // No token found
            Auth.state.isLoggedIn = false;
        }
    },

    verifyToken: async () => {
        if (Auth.state.isMock) return; // Skip verification for mock sessions
        if (!Auth.state.token) return;

        try {
            const response = await fetch(`${API_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${Auth.state.token}`
                }
            });

            if (response.ok) {
                const user = await response.json();
                Auth.state.user = user;
                Auth.state.isSubscribed = user.is_premium;
            } else {
                // Token invalid or expired
                Auth.logout();
            }
        } catch (error) {
            console.error("API Error:", error);
            // Don't logout immediately on network error, but maybe warn
        }
    },

    login: async (email, password) => {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        try {
            const response = await fetch(`${API_URL}/token`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access_token);
                Auth.state.token = data.access_token;
                Auth.state.isLoggedIn = true;
                
                await Auth.verifyToken(); // Get user details
                Auth.updateUI();
                return { success: true };
            } else {
                const error = await response.json();
                let message = error.detail || 'Login failed';
                
                // Check for email verification required
                if (response.status === 403 && error.detail.includes('verify')) {
                    message = 'Por favor verifica tu email antes de iniciar sesión. Revisa la consola del servidor para el token de verificación.';
                }
                
                return { success: false, message: message, needsVerification: response.status === 403 };
            }
        } catch (error) {
            return { success: false, message: 'Network error' };
        }
    },

    register: async (name, email, password) => {
        // Validate password strength
        const validation = Auth.validatePassword(password);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }

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
                // Don't auto-login, user needs to verify email first
                return { 
                    success: true, 
                    message: '¡Cuenta creada! Por favor revisa la consola del servidor para obtener tu token de verificación. Luego podrás iniciar sesión.'
                };
            } else {
                const error = await response.json();
                return { success: false, message: error.detail || 'Error en el registro' };
            }
            return { success: false, message: 'Error de conexión. Verifica tu red.' };
        } catch (error) {
            console.error(`Register Error trying to fetch ${API_URL}/register:`, error);
            return { success: false, message: `Error de conexión al servidor: ${API_URL}. Verifica que el backend esté corriendo.` };
        }
    },

    validatePassword: (password) => {
        if (password.length < 8) {
            return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: 'La contraseña debe contener al menos una mayúscula' };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: 'La contraseña debe contener al menos una minúscula' };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: 'La contraseña debe contener al menos un número' };
        }
        return { valid: true };
    },

    showMessage: (containerId, message, type = 'error') => {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Remove existing messages
        const existingMsg = container.querySelector('.auth-message');
        if (existingMsg) existingMsg.remove();

        // Create new message
        const msg = document.createElement('div');
        msg.className = `auth-message ${type}`;
        msg.textContent = message;
        
        // Insert at the top of the form
        container.insertBefore(msg, container.firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => msg.remove(), 5000);
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('electromatics_user'); // Clear mock session too
        Auth.state = { isLoggedIn: false, isSubscribed: false, user: null, token: null };
        Auth.updateUI();
        window.location.reload();
    },

    checkSubscription: () => {
        if (!Auth.state.isLoggedIn) {
            if (window.openAuthModal) {
                window.openAuthModal('login');
            } else {
                alert("Debe iniciar sesión para acceder a esta función.");
            }
            return false;
        }
        
        // BETA: All registered users have premium access
        if (Auth.state.user && Auth.state.user.is_premium) {
            return true;
        }
        
        // Fallback if not premium (should not happen in beta)
        const confirm = window.confirm("Esta función requiere el Plan Profesional.\n\n¿Desea suscribirse ahora?");
        if (confirm) {
            alert("Para activar su suscripción, por favor contacte a soporte@electromatics.com.ve");
        }
        return false;
    },

    // UI Handling (Same as before, but using Auth object)
    setupUI: () => {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;

        const closeBtn = document.getElementById('close-auth');
        const tabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const switchToRegister = document.getElementById('switch-to-register');
        const switchToLogin = document.getElementById('switch-to-login');
        const subscribeBtn = document.getElementById('subscribe-cta-btn');

        window.openAuthModal = (tab = 'login') => {
            modal.classList.add('active');
            Auth.switchTab(tab);
        };

        closeBtn.onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

        tabs.forEach(tab => {
            tab.onclick = () => Auth.switchTab(tab.dataset.tab);
        });

        if(switchToRegister) switchToRegister.onclick = (e) => { e.preventDefault(); Auth.switchTab('register'); };
        if(switchToLogin) switchToLogin.onclick = (e) => { e.preventDefault(); Auth.switchTab('login'); };
        
        if(subscribeBtn) {
            subscribeBtn.onclick = (e) => {
                e.preventDefault();
                if (Auth.state.isLoggedIn && Auth.state.user?.is_premium) {
                    alert("¡Ya tienes una suscripción activa!");
                } else {
                    window.openAuthModal('register');
                }
            };
        }

        if(loginForm) loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            
            // Add loading state
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            const result = await Auth.login(email, pass);
            
            // Remove loading state
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;

            if (result.success) {
                Auth.showMessage('login-form-container', '¡Bienvenido!', 'success');
                setTimeout(() => modal.classList.remove('active'), 1000);
            } else {
                Auth.showMessage('login-form-container', result.message, 'error');
                
                // Show additional help for unverified emails
                if (result.needsVerification) {
                    setTimeout(() => {
                        Auth.showMessage('login-form-container', 
                            'Si no recibiste el token, revisa la consola del servidor donde está corriendo el backend.', 
                            'info'
                        );
                    }, 3000);
                }
            }
        };

        if(registerForm) registerForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;

            // Add loading state
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            const result = await Auth.register(name, email, pass);
            
            // Remove loading state
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;

            if (result.success) {
                Auth.showMessage('register-form-container', result.message || '¡Cuenta creada exitosamente!', 'success');
                // Don't close modal immediately, let user read the verification instructions
                setTimeout(() => {
                    Auth.switchTab('login');
                }, 5000);
            } else {
                Auth.showMessage('register-form-container', result.message, 'error');
            }
        };
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
            if (Auth.state.isLoggedIn && Auth.state.user) {
                loginBtn.textContent = Auth.state.user.full_name ? Auth.state.user.full_name.split(' ')[0] : 'Usuario';
                loginBtn.href = "#";
                loginBtn.onclick = (e) => {
                    e.preventDefault();
                    const action = confirm(`Hola ${Auth.state.user.full_name}\n\n¿Desea cerrar sesión?`);
                    if (action) Auth.logout();
                };

                // Show Admin Link if user is admin
                if (Auth.state.user.is_admin) {
                    const nav = document.querySelector('.desktop-nav');
                    if (nav && !document.getElementById('admin-link')) {
                        const adminLink = document.createElement('a');
                        adminLink.id = 'admin-link';
                        adminLink.href = 'admin.html';
                        adminLink.textContent = 'Admin';
                        adminLink.style.color = '#FFD700'; // Gold color
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

document.addEventListener('DOMContentLoaded', Auth.init);
