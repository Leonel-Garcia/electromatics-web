# 🚀 Configuración de Grok API para ElectrIA

## 📋 Pasos para integrar Grok (xAI)

### 1. Obtener API Key de Grok

1. Visita: https://console.x.ai/
2. Crea una cuenta o inicia sesión
3. Ve a la sección "API Keys"
4. Genera una nueva API key
5. Copia la clave (comienza con `xai-...`)

### 2. Configurar la API Key

**Opción A: Archivo .env (Desarrollo Local)**

```bash
# backend/.env
GROK_API_KEY=tu_clave_de_grok_aqui
GEMINI_API_KEY=tu_clave_de_gemini_aqui  # Opcional - fallback
DEEPSEEK_API_KEY=tu_clave_de_deepseek_aqui  # Opcional - fallback
```

**Opción B: Variables de entorno (Render/Producción)**

1. Ve a tu proyecto en Render.com
2. Dashboard → Environment
3. Agrega: `GROK_API_KEY` = `tu_clave_aqui`
4. Guarda y redeploy

### 3. Reiniciar el Backend

**Local:**

```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**Render:**
El redeploy automático al guardar las variables de entorno.

---

## 🎯 Prioridad de Proveedores

El sistema usa el siguiente orden de prioridad (fallback automático):

1. **🚀 Grok (xAI)** - Prioridad 1
   - Modelo: `grok-beta` o `grok-2-latest`
   - Endpoint: `https://api.x.ai/v1/chat/completions`
   - Formato: OpenAI-compatible

2. **🤖 Gemini (Google)** - Prioridad 2
   - Modelos: gemini-1.5-flash, gemini-2.0-flash-exp, etc.
   - Endpoint: `https://generativelanguage.googleapis.com/`
   - Formato: Gemini nativo

3. **🔷 DeepSeek** - Prioridad 3
   - Modelo: `deepseek-chat`
   - Endpoint: `https://api.deepseek.com/v1/chat/completions`
   - Formato: OpenAI-compatible

---

## ✅ Verificar Configuración

### Health Check Endpoint

```bash
curl http://localhost:8001/health/ai
```

**Respuesta esperada:**

```json
{
  "status": "operational",
  "providers": {
    "grok": {
      "configured": true,
      "key_preview": "xai-AB...XY",
      "priority": 1
    },
    "gemini": {
      "configured": true,
      "key_preview": "AIzaSyC...ACoE",
      "priority": 2
    },
    "deepseek": {
      "configured": false,
      "key_preview": "not set",
      "priority": 3
    }
  },
  "message": "ElectrIA is ready"
}
```

---

## 🔧 Transformación de Formato

El backend transforma automáticamente entre los formatos:

### Request (Gemini → Grok)

```javascript
// Frontend envía (formato Gemini)
{
  "contents": [{
    "parts": [{"text": "Calcula un motor de 10HP"}]
  }]
}

// Backend transforma a (formato OpenAI para Grok)
{
  "model": "grok-beta",
  "messages": [
    {"role": "user", "content": "Calcula un motor de 10HP"}
  ],
  "temperature": 0.7,
  "max_tokens": 4096
}
```

### Response (Grok → Gemini)

```javascript
// Grok responde (formato OpenAI)
{
  "choices": [{
    "message": {"content": "Para un motor de 10HP..."}
  }]
}

// Backend transforma de vuelta a (formato Gemini)
{
  "candidates": [{
    "content": {
      "parts": [{"text": "Para un motor de 10HP..."}],
      "role": "model"
    },
    "finishReason": "STOP"
  }]
}
```

---

## 🧪 Probar la Integración

### 1. Desde el Frontend

Abre `calculadora.html` y prueba:

```
Calcula un motor de 10HP a 230V trifásico
```

### 2. Desde curl (desarrollo)

```bash
curl -X POST http://localhost:8001/generate-content \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Calcula un motor de 10HP a 230V trifásico"}]
    }]
  }'
```

---

## 📊 Logs del Backend

Verás en la consola:

```
🚀 Attempting Grok API (xAI)...
✅ Grok API responded successfully
```

O si falla:

```
🚀 Attempting Grok API (xAI)...
⚠️ Grok API failed: 401
🤖 Attempting Gemini API...
✅ gemini-1.5-flash responded successfully
```

---

## ⚠️ Consideraciones

### Límites de Cuota

- **Grok**: Verifica tus límites en console.x.ai
- **Gemini**: 1500 requests/día (gratis)
- **DeepSeek**: Verifica en tu cuenta

### Costos

- **Grok**: Consulta precios en https://x.ai/pricing
- **Gemini**: Gratis hasta cierto límite
- **DeepSeek**: Modelo de pago por uso

### Fallback Automático

Si Grok falla (límite, error, etc.), automáticamente pasa a Gemini, luego a DeepSeek.

---

## 🔒 Seguridad

**⚠️ IMPORTANTE:**

- Nunca subas tu archivo `.env` a GitHub
- Agrega `.env` a tu `.gitignore`
- Las claves se ven ofuscadas en los logs
- Solo se exponen primeros y últimos caracteres en `/health/ai`

---

## 🐛 Troubleshooting

### "GROK_API_KEY not configured"

- Verifica que la variable esté en `.env`
- Reinicia el backend después de agregar la clave
- En Render, asegúrate de guardar y redeploy

### "Grok: 401"

- API key inválida o expirada
- Verifica en console.x.ai

### "Grok: 429"

- Límite de cuota alcanzado
- Espera o sube tu plan
- El sistema usará Gemini automáticamente

### "All AI providers failed"

- Ninguna API está configurada correctamente
- Verifica las 3 claves en `/health/ai`

---

## 📚 Recursos

- Documentación Grok: https://docs.x.ai/
- Console xAI: https://console.x.ai/
- Pricing: https://x.ai/pricing
- API Reference: https://docs.x.ai/api

---

## ✅ Checklist de Implementación

- [ ] Obtener API key de console.x.ai
- [ ] Agregar `GROK_API_KEY` al `.env` o variables de entorno
- [ ] Reiniciar backend
- [ ] Verificar `/health/ai` muestra Grok configurado
- [ ] Probar desde calculadora.html
- [ ] Verificar logs del backend
- [ ] Confirmar respuestas correctas

---

**¡Listo!** Grok ahora es tu proveedor primario de IA. 🚀
