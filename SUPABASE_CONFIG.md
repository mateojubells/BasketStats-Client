# Configuración de Supabase para HoopsIQ

## URLs Exactas en Supabase Dashboard

### Paso 1: Configuración de URL Base
En **Authentication → URL Configuration**:

**Site URL:**
```
https://basket-stats-client.vercel.app
```

### Paso 2: Redirect URLs
En **Authentication → URL Configuration → Redirect URLs**, añade todas estas URLs (una por línea):

```
http://localhost:3000/auth/callback
https://basket-stats-client.vercel.app/auth/callback
https://*.basket-stats-client.vercel.app/auth/callback
```

**Explicación:**
- `http://localhost:3000/auth/callback` → Desarrollo local
- `https://basket-stats-client.vercel.app/auth/callback` → Producción (rama main)
- `https://*.basket-stats-client.vercel.app/auth/callback` → Preview deployments en Vercel (opcional pero recomendado)

### Paso 3: Variables de Entorno

En la raíz del proyecto, asegúrate de que `.env.local` tenga:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**En Vercel (Production):**
- `NEXT_PUBLIC_SUPABASE_URL` → misma que arriba
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → misma que arriba
- `NEXT_PUBLIC_SITE_URL` → `https://basket-stats-client.vercel.app`

## Flujo de Autenticación

### 1. Login (Inicio de Sesión)
```
Usuario → "Entrar" → signIn() → validación en Supabase →
→ router.push("/") → AuthGuard valida sesión → Dashboard
```

**Archivos involucrados:**
- [app/login/page.tsx](app/login/page.tsx#L32-L43) - Redirección post-login

### 2. Signup (Registro con Confirmación por Email)
```
Usuario → "Registrarse" → signUp() con emailRedirectTo →
→ Email enviado → Usuario pincha link con code →
→ GET /auth/callback?code=XXX → exchangeCodeForSession() →
→ Sesión establecida → router.push("/") → Dashboard
```

**Archivos involucrados:**
- [lib/auth-context.tsx](lib/auth-context.tsx#L27-L34) - getEmailRedirectUrl()
- [lib/auth-context.tsx](lib/auth-context.tsx#L149-L173) - signUp con emailRedirectTo
- [app/auth/callback/route.ts](app/auth/callback/route.ts#L5-L39) - Intercambio de código PKCE

### 3. Verificación de Sesión (AuthGuard)
```
Cualquier ruta protegida → AuthGuard →
  Si loading=true → Muestra spinner
  Si loading=false && session=null → Redirige a /login
  Si loading=false && session=data → Muestra contenido
```

**Archivos involucrados:**
- [components/auth-guard.tsx](components/auth-guard.tsx#L11-L18) - Lógica de protección

## Variables Importantes en el Contexto

En [lib/auth-context.tsx](lib/auth-context.tsx):

- `getEmailRedirectUrl()` → Detecta dinámicamente si estamos en cliente o servidor y genera la URL correcta del callback
- `ensureProfileForUser()` → Crea/actualiza el perfil en `public.users` tras confirmación del email
- `fetchProfile()` → Carga el perfil + equipo asociado tras login

## Troubleshooting

### "Stuck Loading" en Login
✓ **Arreglado:** Ahora `app/login/page.tsx` redirige a "/" tras `signIn()` exitoso.

### "Sesión no persiste tras email confirmation"
✓ **Arreglado:** El callback en `app/auth/callback/route.ts` usa `exchangeCodeForSession()` que establece la sesión automáticamente y el `AuthProvider` sincroniza el estado.

### AuthGuard entra en bucle infinito
✓ **Arreglado:** Condición explícita `session === null` evita bucles por cambios en el tipo de dato.

## Testing

### Local (localhost:3000)
1. Inicia: `pnpm dev`
2. Abre: `http://localhost:3000/login`
3. Registra con email local (no se envía email real en dev)
4. O inicia sesión con credenciales existentes

### Producción (Vercel)
1. Pushea a `main` rama
2. Vercel deploy automático a `https://basket-stats-client.vercel.app`
3. Supabase envía emails reales con link a `/auth/callback`
4. Usuario pincha → Sesión se sincroniza → Dashboard carga automáticamente
