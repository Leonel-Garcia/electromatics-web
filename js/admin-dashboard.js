/**
 * Admin Dashboard Controller
 * Handles user management, analytics, and administrative functions
 */

// ============================================================================
// CONFIGURATION & STATE
// ============================================================================

const AdminDashboard = {
    state: {
        currentPage: 0,
        pageSize: 20,
        currentSearch: '',
        allUsersData: [],
        searchTimeout: null
    },

    config: {
        apiUrl: window.API_BASE_URL || 'http://localhost:8001',
        searchDebounceMs: 500
    },

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    helpers: {
        /**
         * Get authentication token from localStorage
         */
        getToken() {
            return localStorage.getItem('access_token');
        },

        /**
         * Format date to Venezuela timezone
         */
        formatVenezuelaDate(rawDate) {
            if (!rawDate) return 'No disponible';

            try {
                // Ensure the browser understands the date comes in UTC (Z)
                const dateStr = (typeof rawDate === 'string' && !rawDate.includes('Z') && !rawDate.includes('+'))
                    ? rawDate.replace(' ', 'T') + 'Z'
                    : rawDate;

                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return 'Fecha inválida';

                // Force display in Venezuela timezone
                return d.toLocaleString('es-VE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Caracas'
                });
            } catch (error) {
                console.error('Date formatting error:', error);
                return 'Error en fecha';
            }
        },

        /**
         * Show toast notification
         */
        showToast(message, type = 'success') {
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            alert(`${icons[type] || ''} ${message}`);
        },

        /**
         * Make API request with error handling
         */
        async apiRequest(endpoint, options = {}) {
            const token = this.getToken();
            const url = `${AdminDashboard.config.apiUrl}${endpoint}`;

            const defaultOptions = {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            };

            try {
                const response = await fetch(url, { ...defaultOptions, ...options });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error(`API Request failed (${endpoint}):`, error);
                throw error;
            }
        }
    },

    // ========================================================================
    // AUTHENTICATION
    // ========================================================================

    auth: {
        checkAuth() {
            const token = AdminDashboard.helpers.getToken();
            if (!token) {
                window.location.href = 'index.html';
                return false;
            }
            return true;
        }
    },

    // ========================================================================
    // STATISTICS MANAGEMENT
    // ========================================================================

    stats: {
        async load() {
            try {
                const data = await AdminDashboard.helpers.apiRequest('/admin/stats');

                // Update user statistics
                document.getElementById('total-users').textContent = data.total_users || 0;
                document.getElementById('premium-users').textContent = data.premium_users || 0;
                document.getElementById('verified-users').textContent = data.verified_users || 0;

                // Update analytics statistics
                if (data.analytics) {
                    document.getElementById('total-visits').textContent = data.analytics.total_visits || 0;
                    document.getElementById('avg-duration').textContent = data.analytics.total_duration_minutes || 0;
                    document.getElementById('active-users').textContent = data.analytics.active_users || 0;

                    // Render top pages
                    this.renderTopPages(data.analytics.top_pages || []);
                }

                // Render recent users
                this.renderRecentUsers(data.recent_users || []);

                return data;
            } catch (error) {
                AdminDashboard.helpers.showToast('Error al cargar estadísticas', 'error');
                throw error;
            }
        },

        renderTopPages(pages) {
            const tbody = document.querySelector('#pages-table tbody');
            tbody.innerHTML = '';

            if (pages.length === 0) {
                tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-secondary);">No hay datos disponibles</td></tr>';
                return;
            }

            pages.forEach(page => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="color: var(--electric-blue);">${page.path}</td>
                    <td>${page.views}</td>
                `;
                tbody.appendChild(tr);
            });
        },

        renderRecentUsers(users) {
            const tbody = document.querySelector('#users-table tbody');
            tbody.innerHTML = '';

            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">No hay usuarios recientes</td></tr>';
                return;
            }

            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#${user.id}</td>
                    <td class="text-truncate" style="max-width: 150px;" title="${user.email}">${user.email}</td>
                    <td style="color: ${user.is_admin ? '#FFD700' : '#fff'}">${user.is_admin ? 'Admin' : 'User'}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    },

    // ========================================================================
    // USER MANAGEMENT
    // ========================================================================

    users: {
        async loadAll(page = 0, search = '') {
            try {
                const skip = page * AdminDashboard.state.pageSize;
                let endpoint = `/admin/users?skip=${skip}&limit=${AdminDashboard.state.pageSize}`;
                if (search) {
                    endpoint += `&search=${encodeURIComponent(search)}`;
                }

                const data = await AdminDashboard.helpers.apiRequest(endpoint);
                AdminDashboard.state.allUsersData = data.users || [];

                this.renderTable(data);
                this.updatePagination(data, page, skip);

                AdminDashboard.state.currentPage = page;
                AdminDashboard.state.currentSearch = search;
            } catch (error) {
                AdminDashboard.helpers.showToast('Error al cargar usuarios', 'error');
                console.error('Load users error:', error);
            }
        },

        renderTable(data) {
            const tbody = document.getElementById('all-users-tbody');
            tbody.innerHTML = '';

            if (!data.users || data.users.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                            <i class="fa-solid fa-inbox" style="font-size: 48px; margin-bottom: 10px; display: block;"></i>
                            No se encontraron usuarios
                        </td>
                    </tr>
                `;
                return;
            }

            data.users.forEach(user => {
                const tr = document.createElement('tr');
                const regDate = AdminDashboard.helpers.formatVenezuelaDate(user.created_at || user.createdAt);

                tr.innerHTML = `
                    <td>#${user.id}</td>
                    <td style="color: var(--electric-blue);">${user.email}</td>
                    <td>${user.full_name || 'N/A'}</td>
                    <td>${regDate}</td>
                    <td><span class="status-badge ${user.is_premium ? 'status-verified' : 'status-pending'}">${user.is_premium ? 'Sí' : 'No'}</span></td>
                    <td>
                        <span class="status-badge ${user.email_verified ? 'status-verified' : 'status-pending'}">
                            ${user.email_verified ? 'Sí' : 'No'}
                        </span>
                        <div style="font-size: 11px; margin-top: 5px; color: var(--text-secondary);" title="Total de interacciones/visitas">
                            <i class="fa-solid fa-chart-line" style="font-size: 10px;"></i> ${user.visit_count || 0} vis.
                        </div>
                    </td>
                    <td style="color: ${user.is_admin ? '#FFD700' : '#fff'}; font-weight: ${user.is_admin ? 'bold' : 'normal'};">${user.is_admin ? 'Admin' : 'User'}</td>
                    <td>
                        <button onclick="AdminDashboard.modal.openEdit(${user.id})" class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;" title="Editar">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="AdminDashboard.users.confirmDelete(${user.id})" class="btn" style="background: rgba(244, 67, 54, 0.2); color: #F44336; padding: 5px 10px; font-size: 12px;" title="Eliminar">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        },

        updatePagination(data, page, skip) {
            const start = skip + 1;
            const end = Math.min(skip + (data.users?.length || 0), data.total || 0);

            document.getElementById('showing-range').textContent = `${start}-${end}`;
            document.getElementById('total-count').textContent = data.total || 0;
            document.getElementById('page-info').textContent = `Página ${page + 1}`;

            document.getElementById('btn-prev-page').disabled = page === 0;
            document.getElementById('btn-next-page').disabled = end >= (data.total || 0);
        },

        async update(userId, updateData) {
            try {
                await AdminDashboard.helpers.apiRequest(`/admin/users/${userId}`, {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                });

                AdminDashboard.helpers.showToast('Usuario actualizado exitosamente', 'success');
                AdminDashboard.modal.close();
                this.loadAll(AdminDashboard.state.currentPage, AdminDashboard.state.currentSearch);
            } catch (error) {
                AdminDashboard.helpers.showToast(`Error al actualizar: ${error.message}`, 'error');
            }
        },

        async confirmDelete(userId) {
            if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
                return;
            }

            try {
                await AdminDashboard.helpers.apiRequest(`/admin/users/${userId}`, {
                    method: 'DELETE'
                });

                AdminDashboard.helpers.showToast('Usuario eliminado exitosamente', 'success');
                this.loadAll(AdminDashboard.state.currentPage, AdminDashboard.state.currentSearch);
            } catch (error) {
                AdminDashboard.helpers.showToast(`Error al eliminar: ${error.message}`, 'error');
            }
        }
    },

    // ========================================================================
    // EXPORT FUNCTIONALITY
    // ========================================================================

    export: {
        async downloadCSV() {
            const token = AdminDashboard.helpers.getToken();
            const url = `${AdminDashboard.config.apiUrl}/admin/users/export`;

            try {
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Export failed');

                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `usuarios_electromatics_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);

                AdminDashboard.helpers.showToast('CSV exportado exitosamente', 'success');
            } catch (error) {
                AdminDashboard.helpers.showToast('Error al exportar CSV', 'error');
                console.error('Export error:', error);
            }
        },

        async copyEmails() {
            try {
                const data = await AdminDashboard.helpers.apiRequest('/admin/users?skip=0&limit=10000');
                const emails = data.users.map(u => u.email).join(', ');

                await navigator.clipboard.writeText(emails);

                // Visual feedback
                const btn = document.getElementById('btn-copy-emails');
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado!';
                btn.style.background = '#22c55e';

                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.background = '';
                }, 2000);
            } catch (error) {
                AdminDashboard.helpers.showToast('Error al copiar emails', 'error');
                console.error('Copy emails error:', error);
            }
        }
    },

    // ========================================================================
    // MESSAGING CENTER
    // ========================================================================
    messaging: {
        templates: {
            welcome: {
                subject: "¡Bienvenido a Electromatics! La ingeniería eléctrica del futuro ya está aquí.",
                body: `¡Es un placer saludarte! Soy <b>ElectrIA</b>, el agente de inteligencia artificial de <b>Electromatics</b>, y desde este momento seré tu mano derecha en cada proyecto.<br><br>Mi misión es potenciar tu productividad mediante cálculos precisos y validaciones técnicas automatizadas. A partir de ahora, tienes acceso a herramientas diseñadas para ingenieros que no se conforman con lo convencional:<br><br><ul><li><b>Cálculos Inteligentes:</b> Resultados instantáneos bajo normas internacionales.</li><li><b>Gestión de Proyectos:</b> Organiza tus cuadros de carga y análisis de forma centralizada.</li><li><b>Asistencia 24/7:</b> Estoy aquí para resolver dudas técnicas y optimizar tus diseños en tiempo real.</li></ul><br>Estoy lista para comenzar a trabajar contigo. ¿Qué proyecto tenemos hoy en la mesa?`
            },
            features: {
                subject: "¡Nuevas Capacidades! He actualizado mis algoritmos para servirte mejor.",
                body: `¡Hola! Como tu asistente IA, mi aprendizaje nunca se detiene. Hoy quiero compartir contigo las nuevas herramientas que he implementado para llevar la calidad de tus entregas a un nivel superior:<br><br>1. <b>Exportación Excel Avanzada:</b> Combinación inteligente de celdas para circuitos multi-polares, asegurando una lectura técnica impecable.<br>2. <b>Reportes PDF Profesionales:</b> Encabezados repetitivos automáticos para conservar la identidad de tu proyecto en cada página.<br>3. <b>Optimización de Jerarquía:</b> Reposicionamiento de interruptores principales para facilitar la revisión técnica.<br><br>Estas mejoras ya están disponibles en tu panel de control. Te invito a probar la nueva precisión de mis cálculos hoy mismo.`
            }
        },

        loadTemplate(type) {
            const template = this.templates[type];
            if (template) {
                document.getElementById('broadcast-subject').value = template.subject;
                document.getElementById('broadcast-message').value = template.body;
                AdminDashboard.helpers.showToast(`Plantilla de ${type} cargada`, 'info');
            }
        },

        getRenderedTemplate(title, message) {
            // Frontend replica of the backend template for preview
            return `
                <div style="font-family: 'Inter', Arial, sans-serif; background-color: #0b1116; color: #ffffff; padding: 40px; margin: 0; min-height: 100%;">
                    <div style="max-width: 600px; margin: 0 auto; background: #161f29; border: 1px solid #00e5ff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                        <div style="background: linear-gradient(135deg, #00e5ff, #0066ff); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #000; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Electromatics</h1>
                            <p style="margin: 5px 0 0 0; color: #000; font-weight: bold; opacity: 0.8;">Potenciado por ElectrIA</p>
                        </div>
                        <div style="padding: 40px; line-height: 1.6;">
                            <div style="display: flex; align-items: center; margin-bottom: 25px;">
                                <img src="https://electromatics-web.onrender.com/images/electria-avatar.png" alt="ElectrIA" style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #ff6d00; margin-right: 15px; background: #0b1116;">
                                <h2 style="margin: 0; color: #00e5ff;">${title}</h2>
                            </div>
                            <p style="font-size: 16px; color: #b0b8c1;">Hola, [Nombre del Usuario],</p>
                            <div style="color: #ffffff; font-size: 16px;">
                                ${message.replace(/\n/g, '<br>')}
                            </div>
                            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #2d3a49; display: flex; align-items: center;">
                                <img src="https://electromatics-web.onrender.com/images/electria-avatar.png" alt="ElectrIA" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #ff6d00; margin-right: 15px;">
                                <div>
                                    <strong style="color: #ff6d00; font-size: 16px;">ElectrIA</strong><br>
                                    <span style="font-size: 13px; color: #7a869a;">Agente de Inteligencia Artificial de Electromatics</span>
                                </div>
                            </div>
                        </div>
                        <div style="background: #0b1116; padding: 20px; text-align: center; font-size: 12px; color: #5a667a;">
                            &copy; 2026 Electromatics. Todos los derechos reservados.<br>
                            Innovación Eléctrica bajo Norma Fondonorma 200-2009.
                        </div>
                    </div>
                </div>
            `;
        },

        showPreview() {
            const subject = document.getElementById('broadcast-subject').value;
            const message = document.getElementById('broadcast-message').value;

            if (!subject || !message) {
                AdminDashboard.helpers.showToast('Escribe algo para previsualizar', 'warning');
                return;
            }

            const container = document.getElementById('email-preview-container');
            const htmlContent = this.getRenderedTemplate(subject, message);
            container.innerHTML = htmlContent;
            
            // Configurar botón de copiar
            const copyBtn = document.getElementById('btn-copy-html');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(htmlContent).then(() => {
                        const originalText = copyBtn.innerHTML;
                        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado!';
                        copyBtn.style.background = "rgba(76, 175, 80, 0.2)";
                        setTimeout(() => {
                            copyBtn.innerHTML = originalText;
                            copyBtn.style.background = "";
                        }, 2000);
                    });
                };
            }
            
            const modal = document.getElementById('previewEmailModal');
            modal.classList.add('active');
        },

        closePreview() {
            document.getElementById('previewEmailModal').classList.remove('active');
        },

        async sendBroadcast() {
            this.closePreview(); // Close preview if open
            const subject = document.getElementById('broadcast-subject').value;
            const message = document.getElementById('broadcast-message').value;
            const target = document.getElementById('broadcast-target').value;

            if (!subject || !message) {
                AdminDashboard.helpers.showToast('Por favor completa el asunto y el mensaje', 'warning');
                return;
            }

            try {
                const btn = document.getElementById('btn-broadcast-app');
                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

                const response = await AdminDashboard.helpers.apiRequest('/admin/broadcast', {
                    method: 'POST',
                    body: JSON.stringify({ subject, message, target })
                });

                AdminDashboard.helpers.showToast(response.message, 'success');
                
                // Reset form
                document.getElementById('broadcast-subject').value = '';
                document.getElementById('broadcast-message').value = '';
                
                btn.disabled = false;
                btn.innerHTML = originalText;
            } catch (error) {
                AdminDashboard.helpers.showToast(`Error al enviar: ${error.message}`, 'error');
                document.getElementById('btn-broadcast-app').disabled = false;
                document.getElementById('btn-broadcast-app').innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Emitir vía ElectrIA';
            }
        },

        async openExternal(provider) {
            try {
                const target = document.getElementById('broadcast-target').value;
                const subject = encodeURIComponent(document.getElementById('broadcast-subject').value || 'Comunicado de Electromatics');
                const body = encodeURIComponent(document.getElementById('broadcast-message').value || '');
                
                // Get emails based on target
                let endpoint = '/admin/users?skip=0&limit=10000';
                const data = await AdminDashboard.helpers.apiRequest(endpoint);
                
                let users = data.users;
                if (target === 'premium') users = users.filter(u => u.is_premium);
                if (target === 'admin') users = users.filter(u => u.is_admin);

                const bccList = users.map(u => u.email).join(',');

                if (provider === 'gmail') {
                    window.open(`https://mail.google.com/mail/?view=cm&fs=1&bcc=${bccList}&su=${subject}&body=${body}`, '_blank');
                } else if (provider === 'outlook') {
                    window.open(`https://outlook.live.com/owa/?path=/mail/action/compose&bcc=${bccList}&subject=${subject}&body=${body}`, '_blank');
                } else {
                    window.location.href = `mailto:?bcc=${bccList}&subject=${subject}&body=${body}`;
                }
            } catch (error) {
                AdminDashboard.helpers.showToast('Error al preparar correos', 'error');
            }
        },

        async copyBCC() {
            try {
                const target = document.getElementById('broadcast-target').value;
                const data = await AdminDashboard.helpers.apiRequest('/admin/users?skip=0&limit=10000');
                
                let users = data.users;
                if (target === 'premium') users = users.filter(u => u.is_premium);
                if (target === 'admin') users = users.filter(u => u.is_admin);

                const bccList = users.map(u => u.email).join('; ');
                await navigator.clipboard.writeText(bccList);
                
                AdminDashboard.helpers.showToast(`Copiados ${users.length} emails para BCC`, 'success');
            } catch (error) {
                AdminDashboard.helpers.showToast('Error al copiar lista', 'error');
            }
        }
    },

    // ========================================================================
    // MODAL MANAGEMENT
    // ========================================================================

    modal: {
        openEdit(userId) {
            const user = AdminDashboard.state.allUsersData.find(u => u.id === userId);
            if (!user) {
                console.error('User not found:', userId);
                return;
            }

            document.getElementById('edit-user-id').value = user.id;
            document.getElementById('edit-fullname').value = user.full_name || '';
            document.getElementById('edit-is-premium').checked = user.is_premium;
            document.getElementById('edit-is-admin').checked = user.is_admin;
            document.getElementById('edit-is-active').checked = user.is_active !== false;

            document.getElementById('editUserModal').style.display = 'flex';
        },

        close() {
            document.getElementById('editUserModal').style.display = 'none';
        },

        async handleSubmit(e) {
            e.preventDefault();

            const userId = document.getElementById('edit-user-id').value;
            const updateData = {
                full_name: document.getElementById('edit-fullname').value,
                is_premium: document.getElementById('edit-is-premium').checked,
                is_admin: document.getElementById('edit-is-admin').checked,
                is_active: document.getElementById('edit-is-active').checked
            };

            await AdminDashboard.users.update(userId, updateData);
        }
    },

    // ========================================================================
    // PAGINATION
    // ========================================================================

    pagination: {
        goToPrevious() {
            if (AdminDashboard.state.currentPage > 0) {
                AdminDashboard.users.loadAll(
                    AdminDashboard.state.currentPage - 1,
                    AdminDashboard.state.currentSearch
                );
            }
        },

        goToNext() {
            AdminDashboard.users.loadAll(
                AdminDashboard.state.currentPage + 1,
                AdminDashboard.state.currentSearch
            );
        }
    },

    // ========================================================================
    // SEARCH
    // ========================================================================

    search: {
        handleInput(e) {
            clearTimeout(AdminDashboard.state.searchTimeout);
            AdminDashboard.state.searchTimeout = setTimeout(() => {
                AdminDashboard.users.loadAll(0, e.target.value);
            }, AdminDashboard.config.searchDebounceMs);
        }
    },

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    async init() {
        // Check authentication
        if (!this.auth.checkAuth()) return;

        try {
            // Load statistics and analytics
            await this.stats.load();

            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            document.getElementById('dashboard-content').style.display = 'block';

            // Load all users
            await this.users.loadAll();

            // Status indication for ElectrIA messaging
            const messageHeader = document.querySelector('h2 > .fa-paper-plane').parentElement;
            if (messageHeader) {
                const badge = document.createElement('span');
                badge.className = 'status-badge status-verified';
                badge.style.marginLeft = '15px';
                badge.style.fontSize = '10px';
                badge.innerHTML = '<i class="fa-solid fa-bolt"></i> ElectrIA Activa';
                messageHeader.appendChild(badge);
            }

            // Setup event listeners
            this.setupEventListeners();
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.helpers.showToast('No se pudo conectar con el servidor', 'error');
        }
    },

    setupEventListeners() {
        // Search
        document.getElementById('search-users').addEventListener('input', this.search.handleInput);

        // Pagination
        document.getElementById('btn-prev-page').addEventListener('click', this.pagination.goToPrevious);
        document.getElementById('btn-next-page').addEventListener('click', this.pagination.goToNext);

        // Export
        document.getElementById('btn-export-csv').addEventListener('click', this.export.downloadCSV);
        document.getElementById('btn-copy-emails').addEventListener('click', this.export.copyEmails);

        // Messaging
        document.getElementById('btn-broadcast-app').addEventListener('click', () => this.messaging.sendBroadcast());
        document.getElementById('btn-preview-broadcast').addEventListener('click', () => this.messaging.showPreview());
        document.getElementById('btn-copy-bcc').addEventListener('click', () => this.messaging.copyBCC());

        // Modal
        document.getElementById('editUserForm').addEventListener('submit', this.modal.handleSubmit);

        // Close modal on outside click
        window.onclick = (event) => {
            const modal = document.getElementById('editUserModal');
            const previewModal = document.getElementById('previewEmailModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
            if (event.target === previewModal) {
                previewModal.style.display = 'none';
            }
        };
    }
};

// ============================================================================
// GLOBAL FUNCTIONS (for onclick handlers in HTML)
// ============================================================================

function openEditModal(userId) {
    AdminDashboard.modal.openEdit(userId);
}

function closeEditModal() {
    AdminDashboard.modal.close();
}

function confirmDeleteUser(userId) {
    AdminDashboard.users.confirmDelete(userId);
}

// ============================================================================
// AUTO-INITIALIZE ON DOM READY
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    AdminDashboard.init();
});
