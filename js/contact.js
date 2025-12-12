/**
 * contact.js
 * EmailJS Integration for Contact Form
 * 
 * CONFIGURACIÓN REQUERIDA:
 * 1. Crear cuenta en https://www.emailjs.com/
 * 2. Crear un Email Service (Gmail, Outlook, etc.)
 * 3. Crear un Email Template con variables: {{from_name}}, {{from_email}}, {{message}}
 * 4. Copiar los IDs debajo
 */

// EmailJS Configuration - CONFIGURADO ✅
const EMAILJS_CONFIG = {
    publicKey: 'lrtrWQgLBj3n1I0--',       // Tu Public Key
    serviceId: 'service_7stzifo',          // Tu Service ID
    templateId: 'template_jme5olh'         // Tu Template ID
};

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const successMessage = document.getElementById('success-message');
    const submitBtn = document.getElementById('submit-btn');
    
    if (!submitBtn) return;
    
    const btnText = submitBtn.querySelector('span');
    const btnIcon = submitBtn.querySelector('i');

    // Initialize EmailJS
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_CONFIG.publicKey);
        console.log('✅ EmailJS inicializado correctamente');
    } else {
        console.warn('⚠️ EmailJS no está cargado. Los mensajes se simularán.');
    }

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Basic Validation
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !email || !message) {
                showError('Por favor complete todos los campos.');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showError('Por favor ingrese un email válido.');
                return;
            }

            setLoading(true);

            // Check if EmailJS is configured
            if (EMAILJS_CONFIG.publicKey === 'YOUR_PUBLIC_KEY') {
                // Simulation mode - EmailJS not configured
                console.log('📧 [SIMULACIÓN] Mensaje de contacto:', { name, email, message });
                console.log('⚠️ Para enviar emails reales, configura EmailJS en contact.js');
                
                setTimeout(() => {
                    setLoading(false);
                    contactForm.reset();
                    showSuccess();
                }, 1500);
                return;
            }

            // Send email via EmailJS
            try {
                const templateParams = {
                    from_name: name,
                    from_email: email,
                    message: message,
                    to_email: 'electromatics.info@gmail.com' // Email destino
                };

                const response = await emailjs.send(
                    EMAILJS_CONFIG.serviceId,
                    EMAILJS_CONFIG.templateId,
                    templateParams
                );

                console.log('✅ Email enviado:', response);
                setLoading(false);
                contactForm.reset();
                showSuccess();

            } catch (error) {
                console.error('❌ Error enviando email:', error);
                console.error('❌ Error text:', error.text || error.message || JSON.stringify(error));
                setLoading(false);
                showError(`Error: ${error.text || error.message || 'Verifica la configuración del template en EmailJS'}`);
            }
        });
    }

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.textContent = 'Enviando...';
            btnIcon.className = 'fa-solid fa-spinner fa-spin';
        } else {
            submitBtn.disabled = false;
            btnText.textContent = 'Enviar';
            btnIcon.className = 'fa-solid fa-paper-plane';
        }
    }

    function showSuccess() {
        contactForm.style.display = 'none';
        successMessage.style.display = 'block';
    }

    function showError(message) {
        // Remove existing error
        const existingError = document.querySelector('.contact-error');
        if (existingError) existingError.remove();

        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'contact-error';
        errorDiv.style.cssText = 'margin-bottom: 15px; padding: 12px; background: rgba(244, 67, 54, 0.1); border: 1px solid #f44336; border-radius: 8px; color: #f44336; text-align: center;';
        errorDiv.innerHTML = `<i class="fa-solid fa-exclamation-circle" style="margin-right: 8px;"></i>${message}`;
        
        contactForm.insertBefore(errorDiv, contactForm.firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => errorDiv.remove(), 5000);
    }
});
