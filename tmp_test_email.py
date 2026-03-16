
import os
import sys
from dotenv import load_dotenv

# Add the backend directory to sys.path to import email_service
sys.path.append(r'c:\Users\LGP.DESKTOP-GC63DGS.000\Desktop\IA_Web_Project\backend')

from email_service import EmailService

def test_send():
    # Force reload of .env
    load_dotenv(r'c:\Users\LGP.DESKTOP-GC63DGS.000\Desktop\IA_Web_Project\.env')
    
    service = EmailService()
    
    # Ensure development_mode is False for the test if possible, 
    # but the service class depends on SMTP_PASSWORD being set.
    # Our new constructor does this.
    
    recipient = "pnfe.anaco@gmail.com"
    subject = "¡Prueba de Transmisión Premium - ElectrIA!"
    message = "Esta es una prueba de envío real para verificar el diseño de la planilla, el logo y la firma de ElectrIA. Si estás leyendo esto, la conexión SMTP con electromatics.info@gmail.com es exitosa y el diseño premium está activo."
    
    print(f"Intentando enviar a {recipient}...")
    success = service.send_broadcast_email(recipient, subject, message, "Leonel")
    
    if success:
        print("✅ ¡Correo de prueba enviado exitosamente!")
    else:
        print("❌ Falló el envío del correo de prueba. Revisa los logs.")

if __name__ == "__main__":
    test_send()
