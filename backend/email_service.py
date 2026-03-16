"""
Email Service Module
Handles email sending for verification and notifications
"""
import secrets
import smtplib
from datetime import datetime, timedelta
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending verification and notification emails"""
    
    def __init__(self):
        # Environment configuration
        self.sender_email = os.getenv("SMTP_EMAIL", "electromatics.info@gmail.com")
        self.sender_password = os.getenv("SMTP_PASSWORD")
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.sender_name = "ElectrIA (Electromatics)"
        
        # If no password is provided, we stay in simulation mode
        self.development_mode = not bool(self.sender_password)
        
        if self.development_mode:
            logger.warning("⚠️ MODO SIMULACIÓN: SMTP_PASSWORD no configurado. Los correos se loguearán en consola.")
        else:
            logger.info(f"✅ SMTP configurado para: {self.sender_email}")
        
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
                        
                        <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #2d3a49; display: flex; align-items: center;">
                            <img src="https://electromatics-web.onrender.com/images/electria-avatar.png" alt="ElectrIA" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #ff6d00; margin-right: 15px;">
                            <div>
                                <strong style="color: #ff6d00; font-size: 16px;">ElectrIA</strong><br>
                                <span style="font-size: 13px; color: #7a869a;">Agente de Inteligencia Artificial de Electromatics</span>
                            </div>
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

    def send_email(self, recipient: str, subject: str, html_content: str) -> bool:
        """Core method to send real email using SMTP"""
        if self.development_mode:
            logger.info(f"📧 [SIMULADO] Para: {recipient} | Asunto: {subject}")
            return True

        try:
            msg = MIMEMultipart()
            msg['From'] = f"{self.sender_name} <{self.sender_email}>"
            msg['To'] = recipient
            msg['Subject'] = subject
            
            msg.attach(MIMEText(html_content, 'html'))
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
            
            return True
        except Exception as e:
            logger.error(f"❌ Error enviando email a {recipient}: {str(e)}")
            return False

    def send_verification_email(self, email: str, token: str, user_name: Optional[str] = None) -> bool:
        title = "Verificación de Cuenta"
        content = f"""
            ¡Bienvenido a la comunidad de Electromatics! Estoy aquí para asistirte en tus cálculos y validaciones eléctricas.
            <br><br>
            Para comenzar a utilizar todas mis funciones, por favor verifica tu cuenta haciendo clic en el siguiente enlace:
            <br><br>
            <a href="http://localhost:8000/verify?token={token}" style="display: inline-block; background: #00e5ff; color: #000; padding: 12px 25px; border-radius: 10px; text-decoration: none; font-weight: bold;">Verificar mi Cuenta</a>
        """
        html_content = self.get_electria_template(title, content, user_name)
        return self.send_email(email, title, html_content)

    def send_broadcast_email(self, email: str, subject: str, message: str, user_name: Optional[str] = None) -> bool:
        # Convert simple line breaks to <br> if needed
        formatted_message = message.replace('\n', '<br>')
        html_content = self.get_electria_template(subject, formatted_message, user_name)
        return self.send_email(email, subject, html_content)


# Global email service instance
email_service = EmailService()
