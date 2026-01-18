from sqlalchemy import text, inspect
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations(engine):
    """
    Checks for missing columns in the 'users' table and adds them if necessary.
    This is a lightweight migration system for SQLite and PostgreSQL.
    """
    try:
        inspector = inspect(engine)
        
        # Check if users table exists
        if not inspector.has_table("users"):
            logger.info("Users table does not exist. Skipping migrations (create_all will handle it).")
            return

        columns = [c['name'] for c in inspector.get_columns("users")]
        logger.info(f"Existing columns in 'users': {columns}")
        
        with engine.begin() as conn:
            # 1. is_admin
            if "is_admin" not in columns:
                try:
                    logger.info("Migrating: Adding is_admin column")
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))
                except Exception as e:
                    logger.error(f"Failed to add is_admin: {e}")
            
            # 2. is_premium
            if "is_premium" not in columns:
                try:
                    logger.info("Migrating: Adding is_premium column")
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE"))
                except Exception as e:
                    logger.error(f"Failed to add is_premium: {e}")
                
            # 3. email_verified
            if "email_verified" not in columns:
                try:
                    logger.info("Migrating: Adding email_verified column")
                    conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE"))
                except Exception as e:
                    logger.error(f"Failed to add email_verified: {e}")
                
            # 4. verification_token
            if "verification_token" not in columns:
                try:
                    logger.info("Migrating: Adding verification_token column")
                    conn.execute(text("ALTER TABLE users ADD COLUMN verification_token VARCHAR"))
                except Exception as e:
                    logger.error(f"Failed to add verification_token: {e}")

            # 5. verification_token_expires
            if "verification_token_expires" not in columns:
                try:
                    logger.info("Migrating: Adding verification_token_expires column")
                    conn.execute(text("ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP"))
                except Exception as e:
                    logger.error(f"Failed to add verification_token_expires: {e}")

            # 6. created_at
            if "created_at" not in columns:
                try:
                    logger.info("Migrating: Adding created_at column")
                    conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP"))
                except Exception as e:
                    logger.error(f"Failed to add created_at: {e}")
            
            # Ensure no NULL created_at
            try:
                # Use COALESCE or simple UPDATE depending on DB support, 
                # but plain UPDATE where NULL is safe for both SQLite and Postgres
                conn.execute(text("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
                logger.info("Migrating: Populated NULL created_at values.")
            except Exception as e:
                logger.error(f"Failed to populate created_at: {e}")
                
            logger.info("Migrations check completed.")
            
    except Exception as e:
        logger.error(f"Migration Error: {e}")
        # Don't raise, so app can try to start anyway
