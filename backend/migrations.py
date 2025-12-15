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
        
        with engine.connect() as conn:
            # 1. is_admin
            if "is_admin" not in columns:
                logger.info("Migrating: Adding is_admin column")
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))
            
            # 2. is_premium
            if "is_premium" not in columns:
                logger.info("Migrating: Adding is_premium column")
                conn.execute(text("ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE"))
                
            # 3. email_verified
            if "email_verified" not in columns:
                logger.info("Migrating: Adding email_verified column")
                conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE"))
                
            # 4. verification_token
            if "verification_token" not in columns:
                logger.info("Migrating: Adding verification_token column")
                # PostgreSQL uses VARCHAR, SQLite matches text
                conn.execute(text("ALTER TABLE users ADD COLUMN verification_token VARCHAR"))

            # 5. verification_token_expires
            if "verification_token_expires" not in columns:
                logger.info("Migrating: Adding verification_token_expires column")
                conn.execute(text("ALTER TABLE users ADD COLUMN verification_token_expires TIMESTAMP"))
                
            conn.commit()
            logger.info("Migrations completed successfully.")
            
    except Exception as e:
        logger.error(f"Migration Error: {e}")
        # Don't raise, so app can try to start anyway
