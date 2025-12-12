# 🔥 Firebase Setup - Instrucciones de Configuración

## Pasos para Activar Firebase

### 1. Crear Proyecto en Firebase

1. Ve a https://console.firebase.google.com/
2. Click en "Crear un proyecto" o "Add project"
3. Nombre del proyecto: `electromatics` (o el que prefieras)
4. Acepta los términos y continúa
5. Puedes desactivar Google Analytics si lo deseas
6. Click en "Crear proyecto"

### 2. Activar Authentication

1. En el menú lateral, click en "Authentication"
2. Click en "Comenzar" (Get started)
3. En la pestaña "Sign-in method"
4. Click en "Email/Password"
5. Activa el toggle de "Email/Password"
6. Click en "Guardar"

### 3. Activar Firestore Database

1. En el menú lateral, click en "Firestore Database"
2. Click en "Crear base de datos" (Create database)
3. Selecciona "Empezar en modo de producción" (Production mode)
4. Elige una ubicación cercana (ej: `us-east1` o `southamerica-east1`)
5. Click en "Habilitar"

### 4. Configurar Reglas de Seguridad de Firestore

1. En Firestore Database, ve a la pestaña "Reglas" (Rules)
2. Reemplaza las reglas con las siguientes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Users can read their own profile
      allow read: if request.auth != null && request.auth.uid == userId;

      // Only authenticated users can create their profile
      allow create: if request.auth != null && request.auth.uid == userId;

      // Users can update their own profile (except admin/premium fields)
      allow update: if request.auth != null &&
                       request.auth.uid == userId &&
                       !request.resource.data.diff(resource.data).affectedKeys().hasAny(['isAdmin', 'isPremium']);

      // Admins can read and update any user
      allow read, update: if request.auth != null &&
                            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

3. Click en "Publicar" (Publish)

### 5. Obtener Credenciales de Configuración

1. En la página principal de Firebase Console, click en el ícono de engranaje ⚙️ y selecciona "Configuración del proyecto"
2. Baja hasta la sección "Tus apps"
3. Click en el ícono `</>` (Web)
4. Nickname: `Electromatics Web`
5. **NO** marques "Firebase Hosting"
6. Click en "Registrar app"
7. Verás un código similar a este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "electromatics-xxxxx.firebaseapp.com",
  projectId: "electromatics-xxxxx",
  storageBucket: "electromatics-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxx",
};
```

8. **COPIA ESTE CÓDIGO**

### 6. Actualizar Configuración en el Proyecto

1. Abre el archivo `js/firebase-config.js`
2. Busca la sección que dice:

```javascript
// Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  ...
};
```

3. **REEMPLAZA** esos valores con los valores que copiaste de Firebase Console
4. Guarda el archivo

### 7. Configurar Plantilla de Email de Verificación (Opcional)

1. En Firebase Console, ve a "Authentication"
2. Click en la pestaña "Templates"
3. Click en "Email address verification"
4. Personaliza el asunto y mensaje si lo deseas
5. Guarda los cambios

## ✅ Listo para Probar

Una vez completados estos pasos:

1. Abre `index.html` en tu navegador
2. Click en "Acceder" → "Registrarse"
3. Completa el formulario de registro
4. Recibirás un email de verificación (revisa spam)
5. Verifica tu email
6. Inicia sesión con tus credenciales

## 🎯 Panel de Administración

El primer usuario registrado será automáticamente administrador.

Para acceder al panel de administración:

- URL: `admin-firebase.html`
- Solo usuarios con rol de admin pueden acceder

## 🆘 Solución de Problemas

### "Firebase initialization error"

- Verifica que hayas reemplazado TODOS los valores en `firebase-config.js`
- Verifica que no haya errores de sintaxis

### "Missing or insufficient permissions"

- Verifica que las reglas de Firestore estén configuradas correctamente
- Asegúrate de haber publicado las reglas

### Email de verificación no llega

- Revisa la carpeta de spam
- Verifica que el email esté correctamente configurado en Firebase Console
- Espera unos minutos, a veces tarda

### No puedo acceder al panel de admin

- Solo el primer usuario registrado es admin
- Verifica en Firebase Console > Firestore Database que tu usuario tenga `isAdmin: true`

## 📚 Recursos Adicionales

- [Documentación de Firebase Authentication](https://firebase.google.com/docs/auth)
- [Documentación de Firestore](https://firebase.google.com/docs/firestore)
- [Reglas de Seguridad de Firestore](https://firebase.google.com/docs/firestore/security/get-started)
