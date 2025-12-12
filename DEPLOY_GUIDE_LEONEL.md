# 🚀 Guía de Despliegue para Leonel

¡Todo está listo en el código! Ahora solo faltan los pasos de infraestructura.

Esta guía te llevará paso a paso para poner tu web en internet usando **GitHub** y **Render**.

---

## Paso 1: Subir tu Código a GitHub

Como ya tienes cuenta (`@Leonel-Garcia`), vamos a crear un repositorio.

1. Ve a **[GitHub.com/new](https://github.com/new)**.
2. Crea un repositorio llamado: `electromatics-web`.
3. Hazlo **Público** o **Privado** (como prefieras).
4. **NO** marques "Add a README", ni "gitignore", ni licencia (ya los tenemos).
5. Crea el repositorio.

Ahora, abre una **Nueva Terminal** en tu VS Code (o usa una existente en la carpeta del proyecto) y ejecuta estos comandos UNO por UNO:

```powershell
# 1. Iniciar Git
git init

# 2. Agregar todos los archivos
git add .

# 3. Guardar el primer cambio
git commit -m "Primera version lista para produccion"

# 4. Cambiar a la rama principal
git branch -M main

# 5. Conectar con TU repositorio (REEMPLAZA LA URL)
# Copia la URL HTTPS que te da GitHub al crear el repo. Se verá así:
# https://github.com/Leonel-Garcia/electromatics-web.git
git remote add origin https://github.com/Leonel-Garcia/electromatics-web.git

# 6. Subir el código
git push -u origin main
```

> **Nota:** Si te pide usuario y contraseña, usa tu usuario `Leonel-Garcia` y si la contraseña falla, necesitarás un "Personal Access Token". Si tienes GitHub Desktop instalado, es más fácil hacerlo por ahí.

---

## Paso 2: Crear el Proyecto en Render

Render leerá el archivo `render.yaml` que he creado y configurará todo mágicamente.

1. Ve a **[dashboard.render.com](https://dashboard.render.com/)**.
2. Regístrate o inicia sesión con tu cuenta de GitHub.
3. Haz clic en el botón **"New +"** y selecciona **"Blueprint"**.
4. Conecta tu cuenta de GitHub y selecciona el repositorio `electromatics-web`.
5. Render detectará el archivo `render.yaml` y te mostrará:
   - **electromatics-api** (Backend Python)
   - **electromatics-web** (Frontend Estático)
   - **electromatics-db** (Base de Datos)
6. Haz clic en **"Apply"** o **"Create Resources"**.

¡Render empezará a construir todo! Esto tomará unos 5 minutos.

---

## Paso 3: Configuración Final de Dominios

Una vez que Render termine (todo en verde):

1. **Obtener URL del Backend**:

   - Ve al servicio `electromatics-api` en el dashboard.
   - Copia la URL que te dan (ej: `https://electromatics-api-xyz.onrender.com`).
   - Tendremos que actualizar esta URL en el código JS más adelante si cambia. (He puesto una genérica por ahora).

2. **Configurar tu Dominio (`electromatics.com.ve`)**:
   - Ve al servicio `electromatics-web` en Render.
   - Ve a la pestaña **"Settings"** -> sección **"Custom Domains"**.
   - Agrega `electromatics.com.ve` y `www.electromatics.com.ve`.
   - Render te dará unos registros DNS (tipo `CNAME` o `A`) que debes poner en tu panel de control donde compraste el dominio.

---

## Paso 4: (Opcional) Actualizar URL de la API

Si la URL que Render le dio a tu API NO es `https://electromatics-api.onrender.com` (seguramente tendrá letras aleatorias), tendrás que hacer un pequeño cambio:

1. Copia la URL REAL de tu API en Render.
2. Abre en tu PC el archivo `js/auth.js` y `js/simple-auth.js`.
3. Cambia la línea donde dice:
   ```javascript
   : 'https://electromatics-api.onrender.com';
   ```
   Por tu URL real.
4. Guarda, haz `git add .`, `git commit -m "fix api url"` y `git push`. Render actualizará solito.
