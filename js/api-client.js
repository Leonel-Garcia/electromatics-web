/**
 * api-client.js
 * API Client for communicating with FastAPI backend
 */

const API_BASE_URL = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') 
    ? 'http://127.0.0.1:8001' 
    : 'https://electromatics-api.onrender.com';

const ApiClient = {
    /**
     * Make an API request
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = localStorage.getItem('auth_token');
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * Register a new user
     */
    async register(fullName, email, password) {
        try {
            const user = await this.request('/register', {
                method: 'POST',
                body: JSON.stringify({
                    full_name: fullName,
                    email: email,
                    password: password
                })
            });
            return { success: true, user };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    /**
     * Login user
     */
    async login(email, password) {
        try {
            // FastAPI OAuth2 expects form data
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);
            
            const response = await fetch(`${API_BASE_URL}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Check for specific error messages
                if (response.status === 403) {
                    return { success: false, message: 'Por favor verifica tu email antes de iniciar sesión', needsVerification: true };
                }
                throw new Error(data.detail || 'Login failed');
            }
            
            // Store token
            localStorage.setItem('auth_token', data.access_token);
            
            // Get user info
            const user = await this.getCurrentUser();
            
            return { success: true, user };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    /**
     * Get current user info
     */
    async getCurrentUser() {
        try {
            const user = await this.request('/users/me');
            return user;
        } catch (error) {
            // If unauthorized, clear token
            localStorage.removeItem('auth_token');
            throw error;
        }
    },

    /**
     * Verify email with token
     */
    async verifyEmail(token) {
        try {
            const result = await this.request('/verify-email', {
                method: 'POST',
                body: JSON.stringify({ token })
            });
            return { success: true, message: result.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    /**
     * Resend verification email
     */
    async resendVerification(email) {
        try {
            const result = await this.request('/resend-verification', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            return { success: true, message: result.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem('auth_token');
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!localStorage.getItem('auth_token');
    }
};
