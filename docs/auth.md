# Auth, onboarding y segmento

## Flujo

1. **Registro** (`/signup`) con correo y contraseña. Supabase envía un correo de
   confirmación en el idioma en que se registró el usuario.
2. El enlace del correo abre `/api/auth/confirm`, que valida el token, crea el
   perfil (`users`) y lleva al **onboarding**.
3. El **onboarding** (`/onboarding`) pregunta el nombre del negocio, el país, la
   industria, el tamaño del equipo, quién crea los anuncios y para qué quiere
   los videos. Crea la organización con el usuario como `admin`.
4. Según el segmento, el usuario llega a `/home` (pyme) o a `/workspace`
   (empresa).

Con Google, la vuelta es `/api/auth/callback` y sigue igual desde el paso 2.

## Regla de segmento

Implementada en `lib/segment/index.ts` (`assignSegment`):

- **empresa** si el equipo tiene **más de 10 personas**, o si quien crea los
  anuncios es un **equipo de marketing** o una **agencia**;
- **pyme** en cualquier otro caso.

El umbral y los tipos de equipo son constantes de ese archivo. Un test verifica
que ningún rango de tamaño del onboarding cruce el umbral.

**Modo avanzado** (`/settings`) cambia la organización entre pyme y empresa.
Solo puede hacerlo un `admin`.

Las diferencias entre segmentos se consultan con `segmentConfig` y
`hasFeature`. Los layouts de `(pyme)` y `(empresa)` usan `requireSegmentArea`
para llevar a cada organización a su área.

## Sesión

- `proxy.ts` refresca la sesión de Supabase en cada petición **antes** del
  routing de idiomas. Los cookies nuevos se escriben en la request, para que las
  páginas de esa misma petición lean la sesión nueva, y en la respuesta. Si solo
  se escribieran en la respuesta, las páginas intentarían refrescar otra vez con
  un refresh token ya usado y el usuario perdería la sesión.
- La duración del token (`jwt_expiry`) debe ser mayor que el margen con el que
  supabase-js refresca antes de que venza (unos 90 s). Con valores menores, cada
  lectura intenta refrescar y la sesión se pierde. Supabase usa 3600 s por
  defecto.
- En páginas y acciones del servidor:
  - `requireUser()`: exige sesión y vuelve a la página después del login.
  - `requireOrganization()`: además exige organización; si no hay, lleva al
    onboarding.
  - `requireSegmentArea(segment)`: además exige que la organización sea de ese
    segmento.
- `?next=` solo acepta rutas del propio sitio (`safeNextPath`), para evitar
  redirecciones abiertas.

## Idioma

El idioma del registro se guarda en Supabase (`user_metadata.locale`) y en el
perfil (`users.locale`). Con sesión, el selector de idioma también actualiza el
perfil. Al iniciar sesión se aplica el idioma guardado, también en otro
dispositivo.

## Configuración en Supabase (producción)

En el proyecto de Supabase:

- **Authentication → URL Configuration**
  - Site URL: la URL pública de la app.
  - Redirect URLs: `https://<dominio>/**`.
- **Correos:** las plantillas de `supabase/templates/` y los asuntos de
  `supabase/config.toml` se suben con `supabase config push`. Los enlaces usan
  `token_hash`, así funcionan aunque se abran en otro dispositivo.
- **Google:** crea credenciales OAuth en Google Cloud con la redirect URI
  `https://<project-ref>.supabase.co/auth/v1/callback`. Actívalas en
  Authentication → Sign In / Providers y define `AUTH_GOOGLE_ENABLED=true` en la
  app.
- **Contraseñas:** mínimo 8 caracteres, igual que `minimum_password_length` en
  `supabase/config.toml` y `MIN_PASSWORD_LENGTH` en `lib/auth/schema.ts`.

TODO(fase 3): configurar un SMTP propio. El SMTP incluido en Supabase tiene un
límite muy bajo de correos por hora y no sirve para producción.
