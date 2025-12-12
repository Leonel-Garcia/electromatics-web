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
    
    def send_verification_email(self, email: str, token: str, user_name: Optional[str] = None) -> bool:
        """
        Send verification email to user
        In development mode, prints token to console
        In production mode, would send actual email via SMTP
        """
        if self.development_mode:
            logger.info("=" * 80)
            logger.info("📧 EMAIL VERIFICATION TOKEN (DEVELOPMENT MODE)")
            logger.info("=" * 80)
            logger.info(f"To: {email}")
            logger.info(f"Name: {user_name or 'User'}")
            logger.info(f"Token: {token}")
            logger.info(f"Verification URL: http://localhost:8000/verify?token={token}")
            logger.info("=" * 80)
            logger.info("Copy the token above to verify the email")
            logger.info("=" * 80)
            return True
        else:
            # TODO: Implement actual SMTP email sending
            # This would use smtplib or a service like SendGrid
            logger.warning("Production email sending not yet implemented")
            return False
    
    def send_password_reset_email(self, email: str, token: str) -> bool:
        """Send password reset email (for future implementation)"""
        if self.development_mode:
            logger.info(f"Password Reset Token for {email}: {token}")
            return True
        return False


# Global email service instance
email_service = EmailService(development_mode=True)
