# Electromatics Backend

## Cómo Iniciar el Backend

### 1. Asegúrate de que las dependencias estén instaladas

```bash
pip install -r backend/requirements.txt
```

### 2. Inicia el servidor FastAPI

Desde la raíz del proyecto, ejecuta:

```bash
uvicorn backend.main:app --reload
```

El servidor estará corriendo en: `http://localhost:8000`

### 3. Verifica que funciona

Abre tu navegador y ve a:

- `http://localhost:8000` - Debería mostrar: `{"message": "Electromatics API is running"}`
- `http://localhost:8000/docs` - Documentación interactiva de la API (Swagger UI)

### 4. Abre tu frontend

Abre cualquiera de los archivos HTML (index.html, etc.) con Live Server o simplemente abriendo el archivo en el navegador.

## Endpoints Disponibles

- `POST /register` - Registrar un nuevo usuario
- `POST /token` - Iniciar sesión (obtener token JWT)
- `GET /users/me` - Obtener información del usuario actual (requiere autenticación)

## Base de Datos

La base de datos SQLite se creará automáticamente en `sql_app.db` cuando inicies el servidor por primera vez.
