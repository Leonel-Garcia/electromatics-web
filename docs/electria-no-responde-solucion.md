# 🚨 SOLUCIÓN RÁPIDA - ElectrIA No Responde

## Problema

ElectrIA no responde y no muestra errores en el frontend.

## Causa

El backend no se reinició automáticamente después de cambiar los modelos de Gemini.

## Solución Inmediata

### Paso 1: Reiniciar el Backend

**Opción A: Si está en Windows (PowerShell)**

1. Ve a la terminal del backend (donde corre `uvicorn`)
2. Presiona `Ctrl + C` para detenerlo
3. Espera 2-3 segundos
4. Ejecuta nuevamente:

```powershell
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**Opción B: Si `--reload` no funcionó automáticamente**

```powershell
# Detén el proceso
Ctrl + C

# Espera unos segundos
# Vuelve a ejecutar
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Paso 2: Verificar que Arrancó Correctamente

Deberías ver en los logs:

```
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
🚀 Starting database initialization...
✅ Database initialization successful.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

### Paso 3: Verificar Health Check

Abre una **nueva terminal** y ejecuta:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8001/health/ai" -Method GET -UseBasicParsing
```

**Deberías ver:**

```json
{
  "status": "operational",
  "providers": {
    "grok": { "configured": false }, // Desactivada
    "gemini": { "configured": true }, // ✅ Activa
    "deepseek": { "configured": false }
  }
}
```

### Paso 4: Probar ElectrIA

1. Abre el navegador (Chrome/Edge)
2. Ve a: `http://localhost:5500/calculadora.html` (si usas Live Server)
   O abre el archivo `calculadora.html` directamente
3. Presiona `F12` para abrir Developer Tools
4. Ve a la pestaña **Console**
5. Escribe una consulta: `"Calcula un motor de 5HP a 220V trifásico"`
6. Presiona Enter

**Deberías ver:**

- En la consola: `🔌 API URL Configured: http://127.0.0.1:8001`
- ElectrIA debería responder con el cálculo

---

## Si Todavía No Responde

### Verificación 1: Consola del Navegador

Presiona `F12` y ve a **Console**. Busca errores como:

- `API configuration not found` → El script config.js no cargó
- `CORS error` → Problema de CORS
- `503 Service Unavailable` → El backend no está respondiendo

### Verificación 2: Network Tab

1. Presiona `F12`
2. Ve a **Network** tab
3. Escribe una consulta en ElectrIA
4. Busca la petición a `/generate-content`
5. Haz clic en ella y ve la **Response**

**Si ves:** `503` o `429` → Problema con las APIs
**Si ves:** `200` pero no hay respuesta → Problema de parsing en el frontend

### Verificación 3: Terminal del Backend

Observa los logs en tiempo real cuando haces una consulta:

**Logs buenos (funcionando):**

```
INFO:main:🤖 Attempting Gemini API...
INFO:main:✅ gemini-1.5-flash-latest responded successfully
INFO:     127.0.0.1:XXXXX - "POST /generate-content HTTP/1.1" 200 OK
```

**Logs bad (problema):**

```
ERROR:main:🚫 All AI providers failed: ...
INFO:     127.0.0.1:XXXXX - "POST /generate-content HTTP/1.1" 503 Service Unavailable
```

---

## Solución por Errores Específicos

### Error: "429 - Rate Limit"

**Causa:** Límite de Gemini alcanzado
**Solución:**

1. Espera 1 hora (se resetea automáticamente)
2. O usa otra API key de Gemini
3. O activa Grok/DeepSeek

### Error: "503 - Service Unavailable"

**Causa:** Ninguna API funciona
**Solución:**

1. Verifica que Gemini API key sea válida
2. Confirma con `/health/ai` que Gemini está `configured: true`
3. Prueba manualmente la API de Gemini en: https://aistudio.google.com/

### Error: "No response" (Sin errores en consola)

**Causa:** JavaScript no conecta con backend
**Solución:**
1 Verifica que `config.js` se carga PRIMERO en calculadora.html 2. Abre consola y escribe: `console.log(window.API_BASE_URL)` 3. Debería mostrar: `http://127.0.0.1:8001` 4. Si es `undefined`, el script no cargó

---

## Checklist Completo

- [ ] Backend reiniciado con éxito
- [ ] `/health/ai` muestra Gemini `configured: true`
- [ ] Consola del navegador no muestra errores
- [ ] `window.API_BASE_URL` está definido
- [ ] Request a `/generate-content` devuelve 200
- [ ] ElectrIA responde correctamente

---

## Comando Rápido de Reinicio (PowerShell)

```powershell
# En la terminal del backend
Ctrl + C  # Detener
timeout /t 3  # Esperar 3 segundos
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

---

**Si nada funciona:** Comparte:

1. El output de `/health/ai`
2. Los logs del backend al hacer una consulta
3. Errores de la consola del navegador (F12)

Y te ayudaré a diagnosticar el problema específico.
