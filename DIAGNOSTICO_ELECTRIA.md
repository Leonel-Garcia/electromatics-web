# 🚨 DIAGNÓSTICO: ElectrIA No Funciona

## Problema Identificado:

**ElectrÍA dejó de funcionar porque falta la configuración de la API de Gemini**

---

## Causas Raíz:

### 1. ❌ **Servidor Backend No Estaba Corriendo**

- El backend se había detenido
- Sin backend, ElectrIA no puede procesar solicitudes
- **Solución**: Backend reiniciado exitosamente en puerto 8001

### 2. ❌ **Falta GEMINI_API_KEY en .env**

- El archivo `backend/.env` solo contiene:
  ```
  ZHIPU_API_KEY=d5ae155bd916413f9072513de7601896.l811hhCNDjgldIBU
  ```
- **FALTA**: `GEMINI_API_KEY=tu_clave_aqui`

### 3. ⚠️ **Configuración del Backend**

- El código en `backend/main.py` está **esperando GEMINI_API_KEY**
- Sin esta clave, el endpoint `/generate-content` falla con error 503
- Líneas 423-464 muestran que Gemini es el proveedor principal

---

## 🔧 Solución Paso a Paso:

### Paso 1: Agregar la Clave de Gemini

Edita el archivo: `backend/.env`

Debe quedar así:

```env
# API de Gemini (Principal)
GEMINI_API_KEY=AIzaSy...tu_clave_completa_aqui

# API de ZHIPU (Opcional - backup)
ZHIPU_API_KEY=d5ae155bd916413f9072513de7601896.l811hhCNDjgldIBU
```

### Paso 2: Verificar que el Backend está Corriendo

Ya está hecho ✅ - El backend está activo en:

```
http://127.0.0.1:8001
```

### Paso 3: Reiniciar el Backend (si es necesario)

Si cambias el `.env`, el backend se recarga automáticamente (tiene `--reload` activo).

---

## 📋 Archivo .env Correcto:

```env
# ==============================================
#  CONFIGURACIÓN DE APIs - ELECTROMATICS
# ==============================================

# --- API de Google Gemini (Principal) ---
# Obtén tu clave en: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=tu_clave_de_gemini_aqui

# --- API de ZHIPU (Opcional - Backup) ---
ZHIPU_API_KEY=d5ae155bd916413f9072513de7601896.l811hhCNDjgldIBU

# --- API de DeepSeek (Opcional - Backup) ---
# DEEPSEEK_API_KEY=tu_clave_deepseek_aqui

# --- Base de Datos ---
# DATABASE_URL=postgresql://usuario:password@host/database
```

---

## **Verificación:**

Una vez agregues la clave de Gemini:

1. **Comprueba el health endpoint:**

   ```
   http://localhost:8001/health/ai
   ```

   Debería mostrar:

   ```json
   {
     "status": "operational",
     "providers": {
       "gemini": {
         "configured": true,
         "key_preview": "AIzaSy...xxxx"
       }
     }
   }
   ```

2. **Prueba ElectrIA:**
   - Ve a cualquier página (calculadora.html, formacion.html)
   - Haz una consulta a ElectrIA
   - Debería responder correctamente

---

## 🔐 **Cómo Obtener una Clave de Gemini:**

1. Ve a: https://makersuite.google.com/app/apikey
   - O: https://aistudio.google.com/app/apikey

2. Inicia sesión con tu cuenta de Google

3. Click en "Create API Key" o "Get API key"

4. Copia la clave (empieza con `AIzaSy...`)

5. Pégala en el archivo `.env`

---

## 🚀 **Para Iniciar el Backend Manualmente:**

Si el backend se detiene, usa uno de estos comandos:

**Opción 1: Script incluido**

```bash
.\start_server.bat
```

**Opción 2: Comando directo**

```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**Opción 3: Script start_all.bat**

```bash
.\start_all.bat
```

---

## ✅ **Estado Actual:**

- [x] Backend corriendo en puerto 8001
- [ ] GEMINI_API_KEY falta en .env ← **ACCIÓN REQUERIDA**
- [x] Código actualizado con manejo de errores mejorado
- [x] Sistema de reintentos implementado

---

**SIGUIENTE PASO**: Agrega tu clave de Gemini al archivo `backend/.env` y ElectrIA volverá a funcionar inmediatamente.
