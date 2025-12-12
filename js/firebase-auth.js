/**
 * firebase-auth.js
 * Firebase Authentication System
 */

const FirebaseAuth = {
    state: {
        isLoggedIn: false,
        isPremium: false,
        user: null,
        userProfile: null
    },

    init: async () => {
        FirebaseAuth.setupUI();
        
        // Listen for auth state changes
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                FirebaseAuth.state.user = user;
                FirebaseAuth.state.isLoggedIn = true;
                
                // Get user profile from Firestore
                try {
                    const profile = await FirebaseDB.getUserProfile(user.uid);
                    FirebaseAuth.state.userProfile = profile;
                    FirebaseAuth.state.isPremium = profile?.isPremium || false;
                    
                    // Update last login
                    await FirebaseDB.updateLastLogin(user.uid);
                } catch (error) {
                    console.error('Error loading user profile:', error);
                }
            } else {
                FirebaseAuth.state = {
                    isLoggedIn: false,
                    isPremium: false,
                    user: null,
                    userProfile: null
                };
            }
            
            FirebaseAuth.updateUI();
        });
    },

    /**
     * Register new user
     */
    register: async (name, email, password) => {
        // Validate password
        const validation = FirebaseAuth.validatePassword(password);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }

        try {
            // Create user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update display name
            await user.updateProfile({
                displayName: name
            });

            // Send email verification
            await user.sendEmailVerification();

            // Check if this is the first user (admin)
            const stats = await FirebaseDB.getStats();
            const isFirstUser = stats.totalUsers === 0;

            // Create user profile in Firestore
            await FirebaseDB.createUserProfile(user.uid, {
                email: email,
                displayName: name,
                emailVerified: false,
                isAdmin: isFirstUser
            });

            return {
                success: true,
                message: '¡Cuenta creada! Por favor revisa tu email para verificar tu cuenta.'
            };
        } catch (error) {
            console.error('Registration error:', error);
            
            let message = 'Error en el registro';
            if (error.code === 'auth/email-already-in-use') {
                message = 'Este email ya está registrado';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Email inválido';
            } else if (error.code === 'auth/weak-password') {
                message = 'La contraseña es muy débil';
            }
            
            return { success: false, message };
        }
    },

    /**
     * Login user
     */
    login: async (email, password) => {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Check if email is verified
            if (!user.emailVerified) {
                return {
                    success: false,
                    message: 'Por favor verifica tu email antes de iniciar sesión',
                    needsVerification: true
                };
            }

            // Update email verified status in Firestore
            await FirebaseDB.createUserProfile(user.uid, {
                email: user.email,
                displayName: user.displayName,
                emailVerified: true
            });

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            
            let message = 'Error al iniciar sesión';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                message = 'Email o contraseña incorrectos';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Email inválido';
            }
            
            return { success: false, message };
        }
    },

    /**
     * Logout user
     */
    logout: async () => {
        try {
            await auth.signOut();
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    /**
     * Resend verification email
     */
    resendVerification: async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                await user.sendEmailVerification();
                return { success: true, message: 'Email de verificación enviado' };
            }
            return { success: false, message: 'No hay usuario autenticado' };
        } catch (error) {
            console.error('Resend verification error:', error);
            return { success: false, message: 'Error al enviar email' };
        }
    },

    /**
     * Reset password
     */
    resetPassword: async (email) => {
        try {
            await auth.sendPasswordResetEmail(email);
            return { success: true, message: 'Email de recuperación enviado' };
        } catch (error) {
            console.error('Password reset error:', error);
            
            let message = 'Error al enviar email';
            if (error.code === 'auth/user-not-found') {
                message = 'Usuario no encontrado';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Email inválido';
            }
            
            return { success: false, message };
        }
    },

    /**
     * Validate password strength
     */
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

    /**
     * Show message in UI
     */
    showMessage: (containerId, message, type = 'error') => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const existingMsg = container.querySelector('.auth-message');
        if (existingMsg) existingMsg.remove();

        const msg = document.createElement('div');
        msg.className = `auth-message ${type}`;
        msg.textContent = message;
        
        container.insertBefore(msg, container.firstChild);
        setTimeout(() => msg.remove(), 7000);
    },

    /**
     * Setup UI event listeners
     */
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
            FirebaseAuth.switchTab(tab);
        };

        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

        tabs.forEach(tab => {
            tab.onclick = () => FirebaseAuth.switchTab(tab.dataset.tab);
        });

        if (switchToRegister) switchToRegister.onclick = (e) => { e.preventDefault(); FirebaseAuth.switchTab('register'); };
        if (switchToLogin) switchToLogin.onclick = (e) => { e.preventDefault(); FirebaseAuth.switchTab('login'); };
        
        if (subscribeBtn) {
            subscribeBtn.onclick = (e) => {
                e.preventDefault();
                if (FirebaseAuth.state.isLoggedIn && FirebaseAuth.state.isPremium) {
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
            
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            const result = await FirebaseAuth.login(email, pass);
            
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;

            if (result.success) {
                FirebaseAuth.showMessage('login-form-container', '¡Bienvenido!', 'success');
                setTimeout(() => modal.classList.remove('active'), 1000);
            } else {
                FirebaseAuth.showMessage('login-form-container', result.message, 'error');
                
                if (result.needsVerification) {
                    setTimeout(() => {
                        FirebaseAuth.showMessage('login-form-container', 
                            'Revisa tu bandeja de entrada o spam para el email de verificación.', 
                            'info'
                        );
                    }, 3000);
                }
            }
        };

        // Register form
        if (registerForm) registerForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;

            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            const result = await FirebaseAuth.register(name, email, pass);
            
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;

            if (result.success) {
                FirebaseAuth.showMessage('register-form-container', result.message, 'success');
                setTimeout(() => FirebaseAuth.switchTab('login'), 5000);
            } else {
                FirebaseAuth.showMessage('register-form-container', result.message, 'error');
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
            if (FirebaseAuth.state.isLoggedIn && FirebaseAuth.state.user) {
                const displayName = FirebaseAuth.state.user.displayName || 'Usuario';
                loginBtn.textContent = displayName.split(' ')[0];
                loginBtn.href = "#";
                loginBtn.onclick = (e) => {
                    e.preventDefault();
                    const action = confirm(`Hola ${displayName}\n\n¿Desea cerrar sesión?`);
                    if (action) FirebaseAuth.logout();
                };

                // Show Admin Link if user is admin
                if (FirebaseAuth.state.userProfile?.isAdmin) {
                    const nav = document.querySelector('.desktop-nav');
                    if (nav && !document.getElementById('admin-link')) {
                        const adminLink = document.createElement('a');
                        adminLink.id = 'admin-link';
                        adminLink.href = 'admin-firebase.html';
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
    },

    /**
     * Check if user has premium/subscription
     */
    checkSubscription: () => {
        if (!FirebaseAuth.state.isLoggedIn) {
            if (window.openAuthModal) {
                window.openAuthModal('login');
            } else {
                alert("Debe iniciar sesión para acceder a esta función.");
            }
            return false;
        }
        
        // BETA: All registered users have premium access
        if (FirebaseAuth.state.userProfile?.isPremium) {
            return true;
        }
        
        alert("Esta función requiere el Plan Profesional. Contacte a soporte@electromatics.com.ve");
        return false;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', FirebaseAuth.init);
