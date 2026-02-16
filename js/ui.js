/**
 * UI Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const desktopNav = document.querySelector('.desktop-nav');

    if (mobileNavToggle && desktopNav) {
        mobileNavToggle.addEventListener('click', () => {
            desktopNav.classList.toggle('active');
            
            // Toggle icon between bars and times (X)
            const icon = mobileNavToggle.querySelector('i');
            if (icon) {
                if (desktopNav.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-xmark');
                } else {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!desktopNav.contains(e.target) && !mobileNavToggle.contains(e.target) && desktopNav.classList.contains('active')) {
                desktopNav.classList.remove('active');
                const icon = mobileNavToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }
});

/**
 * Analytics System
 * Tracks visits and time on page
 */
const Analytics = {
    visitId: null,
    sessionId: null,
    heartbeatInterval: null,

    init: async () => {
        // Get or Create Session ID
        let sessionId = sessionStorage.getItem('analytics_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('analytics_session_id', sessionId);
        }
        Analytics.sessionId = sessionId;

        // Register Visit
        await Analytics.registerVisit();

        // Start Heartbeat (every 10 seconds)
        Analytics.startHeartbeat();

        // Handle visibility change to stop/start heartbeat
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                Analytics.stopHeartbeat();
            } else {
                Analytics.startHeartbeat();
            }
        });
    },

    registerVisit: async () => {
        // Skip analytics in local environment to prevent console noise
        if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') return;

        try {
            // Check if API_BASE_URL is defined (from config.js), else use default
            const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:8001';
            
            const token = localStorage.getItem('access_token');
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${apiUrl}/analytics/visit`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    path: window.location.pathname,
                    session_id: Analytics.sessionId
                })
            });

            if (response.ok) {
                const data = await response.json();
                Analytics.visitId = data.visit_id;
                console.log('Analytics: Visit recorded', Analytics.visitId);
            }
        } catch (error) {
            // Silently fail for analytics
            console.debug('Analytics skipped:', error);
        }
    },

    startHeartbeat: () => {
        if (Analytics.heartbeatInterval) return; // Already running
        
        Analytics.heartbeatInterval = setInterval(async () => {
            if (!Analytics.visitId) return;

            try {
                const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:8001';
                await fetch(`${apiUrl}/analytics/heartbeat/${Analytics.visitId}`, {
                    method: 'POST'
                });
            } catch (e) {
                // Silent fail for heartbeat
            }
        }, 10000); // 10 seconds
    },

    stopHeartbeat: () => {
        if (Analytics.heartbeatInterval) {
            clearInterval(Analytics.heartbeatInterval);
            Analytics.heartbeatInterval = null;
        }
    }
};

// Initialize Analytics
Analytics.init();
