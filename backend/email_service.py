"""
Email Service Module
Handles email sending for verification and notifications
Currently in DEVELOPMENT MODE - tokens are logged to console instead of sent via email
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending verification and notification emails"""
    
    def __init__(self, development_mode: bool = True):
        self.development_mode = development_mode
        
    def generate_verification_token(self) -> str:
        """Generate a secure random verification token"""
        return secrets.token_urlsafe(32)
    
    def get_token_expiry(self) -> datetime:
        """Get expiry time for verification token (24 hours from now)"""
        return datetime.utcnow() + timedelta(hours=24)

    def get_electria_template(self, title: str, content: str, user_name: Optional[str] = None) -> str:
        """
        Returns a premium HTML template with ElectrIA branding
        """
        greeting = f"Hola, {user_name}" if user_name else "Estimado usuario"
        
        return f"""
        <html>
            <body style="font-family: 'Inter', Arial, sans-serif; background-color: #0b1116; color: #ffffff; padding: 40px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: #161f29; border: 1px solid #00e5ff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #00e5ff, #0066ff); padding: 30px; text-align: center;">
                        <h1 style="margin: 0; color: #000; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Electromatics</h1>
                        <p style="margin: 5px 0 0 0; color: #000; font-weight: bold; opacity: 0.8;">Potenciado por ElectrIA</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px; line-height: 1.6;">
                        <div style="display: flex; align-items: center; margin-bottom: 25px;">
                            <img src="https://electromatics-web.onrender.com/images/electria-avatar.png" alt="ElectrIA" style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #ff6d00; margin-right: 15px; background: #0b1116;">
                            <h2 style="margin: 0; color: #00e5ff;">{title}</h2>
                        </div>
                        
                        <p style="font-size: 16px; color: #b0b8c1;">{greeting},</p>
                        
                        <div style="color: #ffffff; font-size: 16px;">
                            {content}
                        </div>
                        
                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #2d3a49; font-size: 14px; color: #7a869a;">
                            Atentamente,<br>
                            <strong style="color: #ff6d00;">ElectrIA</strong><br>
                            Agente de Inteligencia Artificial de Electromatics
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #0b1116; padding: 20px; text-align: center; font-size: 12px; color: #5a667a;">
                        &copy; 2026 Electromatics. Todos los derechos reservados.<br>
                        Innovación Eléctrica bajo Norma Fondonorma 200-2009.
                    </div>
                </div>
            </body>
        </html>
        """

    def send_verification_email(self, email: str, token: str, user_name: Optional[str] = None) -> bool:
        """
        Send verification email using ElectrIA template
        """
        title = "Verificación de Cuenta"
        content = f"""
            ¡Bienvenido a la comunidad de Electromatics! Estoy aquí para asistirte en tus cálculos y validaciones eléctricas.
            <br><br>
            Para comenzar a utilizar todas mis funciones, por favor verifica tu cuenta haciendo clic en el siguiente enlace:
            <br><br>
            <a href="http://localhost:8000/verify?token={token}" style="display: inline-block; background: #00e5ff; color: #000; padding: 12px 25px; border-radius: 10px; text-decoration: none; font-weight: bold;">Verificar mi Cuenta</a>
            <br><br>
            Si el botón no funciona, copia y pega este enlace: <br>
            <span style="color: #00e5ff;">http://localhost:8000/verify?token={token}</span>
        """
        
        html_content = self.get_electria_template(title, content, user_name)
        
        if self.development_mode:
            logger.info("=" * 80)
            logger.info(f"📧 EMAIL BROADCAST (ElectrIA): {title} to {email}")
            logger.info("-" * 80)
            logger.info(f"Preview (HTML snippet): {html_content[:200]}...")
            logger.info("=" * 80)
            return True
        return False

    def send_broadcast_email(self, email: str, subject: str, message: str, user_name: Optional[str] = None) -> bool:
        """
        Send a general broadcast or notification email from ElectrIA
        """
        html_content = self.get_electria_template(subject, message, user_name)
        
        if self.development_mode:
            logger.info(f"📢 BROADCAST (ElectrIA) to {email}: {subject}")
            logger.info(f"Message preview: {message[:100]}...")
            return True
        return False

    def send_password_reset_email(self, email: str, token: str) -> bool:
        """Send password reset email (for future implementation)"""
        if self.development_mode:
            logger.info(f"Password Reset Token for {email}: {token}")
            return True
        return False


# Global email service instance
email_service = EmailService(development_mode=True)
