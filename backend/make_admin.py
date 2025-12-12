import sqlite3
conn = sqlite3.connect('sql_app.db')
conn.execute("UPDATE users SET is_admin = 1 WHERE email = 'lhomir14@gmail.com'")
conn.commit()
print('Usuario Leonel Garcia ahora es ADMINISTRADOR')
conn.close()
