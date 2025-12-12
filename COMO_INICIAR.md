# 🚀 Guía de Inicio - Electromatics

## Problema Común: "El backend está corriendo pero la website no abre"

### Causa

Para que la aplicación funcione correctamente, necesitas **DOS servidores corriendo simultáneamente**:

1. **Backend (FastAPI)** - Puerto 8000
2. **Frontend (HTTP Server)** - Puerto 5500

Si solo inicias uno de ellos, la aplicación no funcionará correctamente.

---

## ✅ Solución Rápida

### Opción 1: Iniciar Todo Automáticamente (RECOMENDADO)

Ejecuta el archivo:

```
start_all.bat
```

Este script iniciará automáticamente ambos servidores en ventanas separadas.

### Opción 2: Iniciar Manualmente

1. **Primero**, abre una terminal y ejecuta:

   ```
   start_server.bat
   ```

   Espera a ver el mensaje: "Application startup complete"

2. **Segundo**, abre OTRA terminal y ejecuta:

   ```
   start_website.bat
   ```

3. **Tercero**, abre tu navegador en:
   ```
   http://localhost:5500
   ```

---

## 🔍 Verificar que Todo Funciona

### Verificar Backend (Puerto 8000)

Abre en tu navegador: http://localhost:8000

- Deberías ver: `{"message":"Electromatics API is running"}`

### Verificar Frontend (Puerto 5500)

Abre en tu navegador: http://localhost:5500

- Deberías ver la página principal de Electromatics

---

## ❌ Solución de Problemas

### Error: "Address already in use" o "Puerto ocupado"

**Para Puerto 5500:**

```powershell
# Encuentra el proceso usando el puerto
netstat -ano | findstr :5500

# Mata el proceso (reemplaza PID con el número que aparece)
taskkill /PID <PID> /F
```

**Para Puerto 8000:**

```powershell
# Encuentra el proceso usando el puerto
netstat -ano | findstr :8000

# Mata el proceso (reemplaza PID con el número que aparece)
taskkill /PID <PID> /F
```

### Error: "Python no reconocido"

Asegúrate de tener Python instalado y agregado al PATH del sistema.

### Error: "No module named 'fastapi'" o similar

Activa el entorno virtual e instala las dependencias:

```powershell
.venv\Scripts\activate
pip install -r backend\requirements.txt
```

---

## 📝 Notas Importantes

- **NO cierres las ventanas** de los servidores mientras uses la aplicación
- Si modificas el código del backend, el servidor se recargará automáticamente (modo `--reload`)
- Para detener todo, simplemente cierra las ventanas de los servidores o presiona `Ctrl+C`

---

## 🎯 Accesos Rápidos

| Servicio                  | URL                         | Descripción                   |
| ------------------------- | --------------------------- | ----------------------------- |
| Frontend                  | http://localhost:5500       | Interfaz de usuario principal |
| Backend API               | http://localhost:8000       | API REST                      |
| Documentación API         | http://localhost:8000/docs  | Swagger UI interactivo        |
| Documentación Alternativa | http://localhost:8000/redoc | ReDoc                         |

---

## 🛠️ Estructura de Archivos de Inicio

- `start_all.bat` - Inicia backend + frontend automáticamente ⭐ RECOMENDADO
- `start_server.bat` - Solo inicia el backend (Puerto 8000)
- `start_website.bat` - Solo inicia el frontend (Puerto 5500)
