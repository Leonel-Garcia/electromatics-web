import os
import sys
import logging

# Configure logging to show progress in console
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Change directory to backend to find modules and .env
original_dir = os.getcwd()
backend_dir = os.path.join(original_dir, 'backend')
os.chdir(backend_dir)
sys.path.append(backend_dir)

try:
    from email_service import email_service
    from database import SessionLocal
    import models
    from sqlalchemy.orm import Session
    
    def run_broadcast():
        print("\n=== 📡 EMISOR MASIVO LOCAL - ELECTRIA ===")
        print(f"Usando cuenta: {email_service.sender_email}")
        print("=========================================\n")
        
        if email_service.development_mode:
            print("⚠️ ERROR: No se detectó SMTP_PASSWORD en backend/.env")
            print("Configura las credenciales locales para enviar de verdad.")
            return

        # 1. Configurar el Mensaje
        subject = input("Ingrese el ASUNTO del correo: ")
        print("\nIngrese el MENSAJE (usa \\n para saltos de línea):")
        message = input("> ")
        
        target = input("\n¿A quién enviar? (all/premium/admin) [all]: ") or "all"
        
        # 2. Obtener usuarios de la DB (Remota o Local según config)
        db = SessionLocal()
        query = db.query(models.User)
        
        if target == 'premium':
            query = query.filter(models.User.is_premium == True)
        elif target == 'admin':
            query = query.filter(models.User.is_admin == True)
            
        users = query.all()
        
        if not users:
            print(f"❌ No se encontraron usuarios para el segmento: {target}")
            return
            
        print(f"\n📧 Se enviarán {len(users)} correos.")
        confirm = input("¿Confirmar envío masivo? (s/n): ")
        if confirm.lower() != 's':
            print("🚫 Envío cancelado.")
            return

        # 3. Proceso de Envío
        success_count = 0
        for i, user in enumerate(users):
            print(f"\r🚀 Enviando [{i+1}/{len(users)}] a: {user.email}...", end="")
            
            if email_service.send_broadcast_email(
                email=user.email,
                subject=subject,
                message=message,
                user_name=user.full_name
            ):
                success_count += 1
            else:
                print(f"\n❌ Error fallido en: {user.email}")
                
        print(f"\n\n✅ ¡LISTO! Se enviaron {success_count} correos exitosamente.")
        db.close()

    if __name__ == "__main__":
        run_broadcast()

except Exception as e:
    print(f"❌ Error crítico inicializando el sistema: {e}")
finally:
    os.chdir(original_dir)
