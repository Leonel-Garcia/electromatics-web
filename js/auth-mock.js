/**
 * auth-mock.js
 * Simulated Authentication & Subscription System with LocalStorage
 */

const AuthMock = {
    state: {
        isLoggedIn: false,
        isSubscribed: false,
        user: null
    },

    init: () => {
        AuthMock.loadSession();
        AuthMock.setupUI();
        AuthMock.updateUI();
    },

    loadSession: () => {
        const storedUser = localStorage.getItem('electromatics_user');
        if (storedUser) {
            AuthMock.state.user = JSON.parse(storedUser);
            AuthMock.state.isLoggedIn = true;
            // Check subscription status (mock logic: if they have 'premium' role or flag)
            AuthMock.state.isSubscribed = AuthMock.state.user.isSubscribed || false;
        }
    },

    saveSession: (user) => {
        localStorage.setItem('electromatics_user', JSON.stringify(user));
        AuthMock.state.user = user;
        AuthMock.state.isLoggedIn = true;
        AuthMock.state.isSubscribed = user.isSubscribed || false;
        AuthMock.updateUI();
    },

    logout: () => {
        localStorage.removeItem('electromatics_user');
        AuthMock.state = { isLoggedIn: false, isSubscribed: false, user: null };
        AuthMock.updateUI();
        window.location.reload();
    },

    login: (email, password) => {
        // Mock Validation
        // In a real app, this would hit an API.
        // Here we just simulate success if fields are filled.
        
        // Check if user exists in "database" (localStorage for registered users)
        const dbUsers = JSON.parse(localStorage.getItem('electromatics_db_users') || '[]');
        const user = dbUsers.find(u => u.email === email && u.password === password);

        if (user) {
            AuthMock.saveSession(user);
            return { success: true };
        } else {
            // Dev backdoor
            if (email === 'admin@test.com' && password === 'admin') {
                AuthMock.saveSession({ name: 'Admin User', email: email, isSubscribed: true });
                return { success: true };
            }
            return { success: false, message: 'Credenciales inválidas.' };
        }
    },

    register: (name, email, password) => {
        const dbUsers = JSON.parse(localStorage.getItem('electromatics_db_users') || '[]');
        
        if (dbUsers.find(u => u.email === email)) {
            return { success: false, message: 'El usuario ya existe.' };
        }

        // Validate password strength
        const validation = AuthMock.validatePassword(password);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }

        const newUser = { name, email, password, isSubscribed: false };
        dbUsers.push(newUser);
        localStorage.setItem('electromatics_db_users', JSON.stringify(dbUsers));
        
        AuthMock.saveSession(newUser);
        return { success: true };
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

    subscribe: () => {
        if (!AuthMock.state.isLoggedIn) {
            AuthMock.openModal('login');
            return;
        }

        const confirm = window.confirm("¿Desea suscribirse al Plan Profesional ($29/mes)?\n\nIncluye:\n- Reportes PDF\n- Exportación Excel\n- Historial Ilimitado");
        if (confirm) {
            const updatedUser = { ...AuthMock.state.user, isSubscribed: true };
            
            // Update in DB
            const dbUsers = JSON.parse(localStorage.getItem('electromatics_db_users') || '[]');
            const index = dbUsers.findIndex(u => u.email === updatedUser.email);
            if (index !== -1) {
                dbUsers[index] = updatedUser;
                localStorage.setItem('electromatics_db_users', JSON.stringify(dbUsers));
            }
            
            AuthMock.saveSession(updatedUser);
            alert("¡Suscripción Exitosa! Ahora tiene acceso a todas las funciones premium.");
        }
    },

    // UI Handling
    setupUI: () => {
        const modal = document.getElementById('auth-modal');
        if (!modal) return; // Only on pages with the modal (index.html for now, or all if we add it)

        const closeBtn = document.getElementById('close-auth');
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form-container');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const switchToRegister = document.getElementById('switch-to-register');
        const switchToLogin = document.getElementById('switch-to-login');

        // Open Modal Logic (Global)
        window.openAuthModal = (tab = 'login') => {
            modal.classList.add('active');
            AuthMock.switchTab(tab);
        };

        // Close Modal
        closeBtn.onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

        // Tabs
        tabs.forEach(tab => {
            tab.onclick = () => AuthMock.switchTab(tab.dataset.tab);
        });

        // Switch Links
        if(switchToRegister) switchToRegister.onclick = (e) => { e.preventDefault(); AuthMock.switchTab('register'); };
        if(switchToLogin) switchToLogin.onclick = (e) => { e.preventDefault(); AuthMock.switchTab('login'); };

        // Forms
        if(loginForm) loginForm.onsubmit = (e) => {
            e.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            
            // Add loading state
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            // Simulate async (for consistency with real auth)
            setTimeout(() => {
                const result = AuthMock.login(email, pass);
                
                // Remove loading state
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;

                if (result.success) {
                    AuthMock.showMessage('login-form-container', '¡Bienvenido!', 'success');
                    setTimeout(() => modal.classList.remove('active'), 1000);
                } else {
                    AuthMock.showMessage('login-form-container', result.message, 'error');
                }
            }, 500);
        };

        if(registerForm) registerForm.onsubmit = (e) => {
            e.preventDefault();
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;

            // Add loading state
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            // Simulate async (for consistency with real auth)
            setTimeout(() => {
                const result = AuthMock.register(name, email, pass);
                
                // Remove loading state
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;

                if (result.success) {
                    AuthMock.showMessage('register-form-container', '¡Cuenta creada exitosamente!', 'success');
                    setTimeout(() => modal.classList.remove('active'), 1500);
                } else {
                    AuthMock.showMessage('register-form-container', result.message, 'error');
                }
            }, 500);
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

    openModal: (tab = 'login') => {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.add('active');
            AuthMock.switchTab(tab);
        } else {
            // Fallback for pages without modal
            const email = prompt("Ingrese su correo (Simulación):", "usuario@electromatics.com");
            if (email) {
                AuthMock.saveSession({ email, name: "Usuario Invitado" });
            }
        }
    },

    updateUI: () => {
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            if (AuthMock.state.isLoggedIn) {
                loginBtn.textContent = AuthMock.state.user.name.split(' ')[0]; // First name
                loginBtn.href = "#";
                loginBtn.onclick = (e) => {
                    e.preventDefault();
                    const action = confirm(`Hola ${AuthMock.state.user.name}\n\n¿Desea cerrar sesión?`);
                    if (action) AuthMock.logout();
                };
            } else {
                loginBtn.textContent = "Acceder";
                loginBtn.onclick = (e) => {
                    e.preventDefault();
                    AuthMock.openModal();
                };
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', AuthMock.init);
