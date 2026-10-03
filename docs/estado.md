# Estado del proyecto

Resumen para retomar el trabajo sin el historial de conversaciones. **Actualízalo
al terminar cada tarea.** Última actualización: 3 de octubre de 2026 (PR #25).

## Dónde estamos

- **Fase 1 (MVP pyme): completa** y en `main` (PR #1 a #8).
- Después de la fase 1, y por decisión del dueño del producto, se adelantó parte
  de la **fase 3** para lanzar el modo pyme antes del modo empresa (fase 2):
  portada de venta, despliegue en planes gratuitos y pagos con Payphone.
- **Modo empresa (fase 2): no empezado.** El workspace empresa es un marcador.
- **Valor agregado del modo pyme** (pedido del dueño el 1 de octubre de 2026:
  que el producto no sea solo "videos con Higgsfield" y que tenga un plus
  llamativo para empresarios ecuatorianos). Hecho: calendario comercial
  ecuatoriano (PR #15, [temporadas.md](./temporadas.md)). En curso: el **flujo
  creativo nuevo**: fase A (investigación) terminada (PR #17,
  [fase-a/README.md](./fase-a/README.md)); fase B (diseño) con bocetos
  navegables, documento (PR #18) y las decisiones del dueño sobre los bocetos
  (PR #19, [fase-b/README.md](./fase-b/README.md)). Detalle en "Pendientes",
  punto 2.

## Historial de PRs (pablojarring/oniric)

| PR    | Qué hizo                                                                                |
| ----- | --------------------------------------------------------------------------------------- |
| #1    | Scaffold: Next.js, Tailwind, shadcn, Drizzle, Supabase, lint, typecheck y tests en CI.  |
| #2    | Auth (email y Google), onboarding y asignación de segmento.                             |
| #3    | `GenerationProvider`, `MockProvider`, jobs y billetera (reserva, cobro, reembolso).     |
| #4    | Plantillas pyme y asistente de 3 pasos.                                                 |
| #5    | Encabezado móvil (selector de idioma legible).                                          |
| #6–#7 | Galería, descargas, copia de resultados a un bucket privado y enlaces públicos.         |
| #8    | Panel de admin: márgenes por modelo y acreditación manual.                              |
| #9    | Portada de venta en español y portugués.                                                |
| #10   | Entorno de prueba en planes gratis: límite de 50 MB, cron diario, `docs/despliegue.md`. |
| #11   | Paquetes de créditos con IVA incluido, nueva fórmula de precios y pagos con Payphone.   |
| #12   | Mensajes de pago no aprobado o cancelado y motivo de Payphone en el admin.              |
| #13   | Nueva interfaz del modo pyme: menú y saldo, inicio, asistente, galería y recarga.       |
| #14   | Proveedor real de Higgsfield, webhook firmado y foto encuadrada en el formato elegido.  |
| #15   | Calendario comercial de Ecuador: próximas fechas, calendario y anuncios de temporada.   |
| #16   | Laboratorio de prompts de Higgsfield (`pnpm higgsfield:lab`) y subida de fotos.         |
| #17   | Fase A del flujo creativo: investigación, manual creativo, rúbrica y herramientas.      |
| #18   | Fase B del flujo creativo: bocetos navegables, búsqueda de inspiración y personajes.    |
| #19   | Fase B: decisiones del dueño, motion graphics, imagen de prueba y cobro de la edición.  |
| #20   | Fase B: recálculo de precios, audio con ElevenLabs v4, estilos y propuesta de planes.   |
| #21   | Fase B cerrada: modelo mixto, barra de uso, prueba gratis y fase C por tramos.          |
| #22   | Fase C, tramo 1: `TextProvider` con GPT-6 Luna y su simulador.                          |
| #23   | Fase C, tramo 1: lógica del director creativo (conversación, ideas, guion y prompts).   |
| #24   | Fase C, tramo 1: pantallas del director creativo, del inicio al guion.                  |
| #25   | Fase C, tramo 1: voz, corregir el brief, otras respuestas, insight y ¿Quién sale?       |

## Entornos

### Local

- Supabase en Docker: `pnpm supabase:start` (aplica migraciones y crea buckets).
- `.env.local` a partir de `.env.example` (incluye `PAYMENT_GATEWAY=mock`).
- `pnpm dev`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`.
- Créditos de prueba: `pnpm credits:grant <correo> <créditos>`. Admin:
  `pnpm admin:grant <correo>`.

### Producción de prueba (planes gratuitos)

Ver [despliegue.md](./despliegue.md) para el procedimiento completo.

- **Vercel** (plan Hobby): proyecto `oniric`, despliega `main` automáticamente.
  Dominio: **`https://oniric.oniriasolutions.com`** (DNS en Cloudflare, CNAME
  sin proxy; la landing de la empresa sigue en `oniriasolutions.com`). Ya está
  en `NEXT_PUBLIC_SITE_URL`, en la URL Configuration de Supabase y en la
  aplicación de Payphone. `oniric-jade.vercel.app` sigue respondiendo.
- **Supabase** `oniric-prod` (plan Free, región São Paulo): migraciones y
  buckets aplicados. `ad-outputs` con 50 MB (máximo del plan Free).
- **Correo:** SMTP de Google Workspace de `oniriasolutions.com`
  (`smtp.gmail.com:587`, contraseña de aplicación), remitente
  `no-reply@oniriasolutions.com`. Plantillas de `supabase/templates/` pegadas a
  mano en Supabase.
- **Generación:** `MockProvider` (no hay `HIGGSFIELD_API_KEY` a propósito). El
  proveedor real está listo ([higgsfield.md](./higgsfield.md)) pero no se
  activa hasta que el dueño dé permiso para gastar saldo real.
- **Pagos:** Payphone con la aplicación "Oniric" aprobada. Token y StoreId
  cargados en Vercel. La primera prueba falló porque la aplicación estaba en
  ambiente Producción (tarjetas ficticias rechazadas, `Canceled`). Después de
  ajustar el ambiente, el dueño confirmó el 30 de septiembre de 2026 que la
  compra de créditos funciona de punta a punta. TODO: registrar qué aplicación
  y ambiente quedaron cargados en Vercel, y volver a credenciales de Producción
  antes de vender. Ver [pagos.md](./pagos.md).
- **Tarea programada:** diaria, 05:00 UTC (`vercel.json`), con `CRON_SECRET`.

## Decisiones de producto vigentes

- Segmento: empresa si el equipo tiene más de 10 personas o es agencia o equipo
  de marketing; pyme en otro caso.
- 1 crédito = US$0,01 con IVA incluido. Paquetes de US$5 (500), 15 (1.575), 30
  (3.300) y 50 (5.750 créditos). Ver [creditos.md](./creditos.md).
- Precio de cada generación sobre el ingreso neto del crédito (sin IVA 15 % ni
  comisión de Payphone 5,75 %), con ISD 5 % y comisión bancaria 2 %, margen del
  35 % por defecto y 25 % mínimo.
- Créditos pyme vencen a los 12 meses.
- Resultados copiados a un bucket privado; enlaces públicos para compartir.
- Pasarela: Payphone (botón por redirección). Facturación: manual en el
  Facturador SRI por ahora, con los datos de `/admin/purchases`.
- Idiomas: español (por defecto) y portugués.
- Flujo creativo (3 de octubre de 2026): "Mi marca" (perfil, personalidad,
  colores y personaje opcional) pasa al modo pyme, aunque CLAUDE.md lo ubicaba
  en la fase 2; nunca se obliga a crear lo que el negocio no tiene. Tablero de
  inspiración por anuncio y como "Mi estilo"; plantillas de inspiración con
  ejemplos; personas reales con consentimiento o ficticias por descripción;
  respuestas de un toque generadas por la IA, nunca estáticas. Después de la
  fase A: manual creativo y rúbrica v1 aprobados; **GPT-6 Luna** para todo el
  texto; **Remotion** para la edición (gratis: ONIRIASOLUTIONS tiene 1
  persona); niveles de calidad Rápido, Pro y Cine con su precio visible; los
  ejemplos de las plantillas de inspiración los genera Oniric. Para la fase B:
  la inspiración sale de una búsqueda inteligente y mixta (producto + estilo)
  en internet, además de plantillas propias; set propio de personajes
  ficticios, editables y reutilizables; se empieza con plantillas de imagen por
  el límite de Supabase Free. Sobre los bocetos: recorrido, búsqueda mixta y
  personajes aprobados; las referencias de internet deben llegar bien
  interpretadas al modelo (ficha visual y referencia puente); la imagen de
  prueba viene de Higgsfield, es el primer cuadro del video y lleva marca de
  agua; la edición es motion graphics que responde al video, con nivel de
  programa profesional; el texto y la edición se cobran dentro del precio en
  créditos, nunca los absorbe Oniric.

## Pendientes, en orden sugerido

1. **Higgsfield:** el proveedor ya está (PR #14, ver
   [higgsfield.md](./higgsfield.md)). Falta:
   - **la prueba pagada**, que se hará **dentro de la app real** (fase D del
     flujo creativo, punto 2), no con el script. El dueño tiene **US$15**
     cargados en la API de Higgsfield (su tope de prueba) y fijó un tope de
     **US$10 en OpenAI**. La clave de Higgsfield está como
     `HIGGSFIELD_TEST_KEY` en Vercel (la app no la lee) y en la configuración
     del entorno de Claude Code. Para la fase D se activa Higgsfield para todas
     las cuentas (`HIGGSFIELD_API_KEY`), pero solo después de construir los
     topes de gasto por proveedor (ver
     [fase-b/precios.md](./fase-b/precios.md), sección 5). `pnpm higgsfield:lab` queda
     como herramienta interna opcional
     ([higgsfield.md](./higgsfield.md#laboratorio-de-prompts-prueba-pagada));
   - el panel del saldo del proveedor con alerta y el reporte mensual para el
     contador (siguiente PR). El dinero va Payphone → Produbanco → tarjeta
     empresarial → saldo prepagado de Higgsfield (ISD 5 % en el pago al
     exterior). Higgsfield no documenta recarga automática ni un endpoint de
     saldo: TODO confirmarlo en su consola.
2. **Flujo creativo nuevo** (plan acordado con el dueño el 3 de octubre de
   2026; ver [fase-a/README.md](./fase-a/README.md)). Objetivo: que un dueño
   sin mentalidad de publicista llegue a anuncios creativos y de calidad
   profesional, y que un publicista no pueda desacreditar los resultados.
   - **Fase A, investigación:** hecha (PR #17). Manual creativo, rúbrica v1,
     catálogo de herramientas con precios y experiencia del cliente.
   - **Fase B, diseño:** bocetos navegables (16 pantallas, Artifact privado
     del dueño) y documento (PR #18 y #19,
     [fase-b/README.md](./fase-b/README.md)). Aprobados el recorrido, la
     búsqueda mixta y los personajes; definidos la ficha visual de las
     referencias, la imagen de prueba como primer cuadro, los motion graphics
     y el cobro de la edición (secciones 5 a 9). Falta aprobar el tope de
     gasto, la lista de plantillas y los estilos de animación; decidir dónde
     renderizar (recomendado: Remotion Lambda). Después: topes, plantillas y
     estilos aprobados (más psicodélico, nueva era, clásico, hogareño y estilo
     TikTok); recálculo de precios, audio con ElevenLabs v4 y propuesta de
     planes mensuales con créditos en [fase-b/precios.md](./fase-b/precios.md).
     Después: modelo mixto aprobado para probarlo, con barra de uso
     verificable; prueba gratis sí (propuesta: 70 créditos); la música debe
     sonar profesional (sin biblioteca con licencia) y se decide después de
     las primeras pruebas; "Nueva era" confirmado. **Fase B cerrada.**
     Riesgo: los precios de Higgsfield tienen hoy descuentos del 30 al 50 % sin
     fecha de fin.
   - **Fase C, construcción** con el simulador, por tramos (sección 10 de
     [fase-b/README.md](./fase-b/README.md)). La primera prueba pagada es al
     final del tramo 1 (6 PRs); cada tramo cierra con una ronda de pruebas en
     la app real. Tramo 1, paso 1 hecho: `TextProvider` con GPT-6 Luna y su
     simulador (PR #22, [proveedor-de-texto.md](./proveedor-de-texto.md)).
     Paso 2 hecho: datos y lógica del director creativo (PR #23), sus
     pantallas (PR #24) y las decisiones del dueño sobre ellas (PR #25):
     notas de voz con `gpt-transcribe`, mensaje de falla al estilo de Claude,
     corregir el brief a mano, otras respuestas, confirmar el insight y un
     "¿Quién sale?" simple ([director-creativo.md](./director-creativo.md)).
     En `/director` el dueño conversa, elige el nivel y quién sale, recibe 3
     ideas y el guion, y puede pedir cambios. La entrada está en el inicio,
     como "Nuevo · Beta". En Vercel usa GPT-6 Luna (gasta saldo real de
     OpenAI, menos de un centavo por sesión típica, con el límite de 120
     pedidos por hora y organización); el tope de gasto llega en el paso 4.
     Migraciones del director en `oniric-prod`:
     `20261003214021_creative_sessions.sql` aplicada el 3 de octubre;
     `20261003233641_creative_featuring.sql` (PR #25) hay que aplicarla
     **antes de mergear el #25**. Decisiones del dueño: cuando el director
     haga videos, "Crear anuncio" lleva siempre a él y el asistente viejo se
     quita después de la ronda 1; la foto del producto entra en el paso 3; el
     tramo 3 sigue igual. Siguiente: paso 3, foto del producto, imagen de
     prueba como primer cuadro, video con Kling y precio. Se trabaja en una
     sola sesión de Claude Code: las pruebas usan simuladores y las pruebas
     reales corren en la app de Vercel, que ya tiene `OPENAI_API_KEY`. Claves nuevas para
     la búsqueda: `YOUTUBE_API_KEY` y `PEXELS_API_KEY` (gratis); Claude avisa
     cuando hagan falta, para cargarlas en Vercel.
   - **Fase D, pruebas pagadas en la app real** con la rúbrica. Negocios:
     Panadería La Esquina (Quito) y Estudio Brillo, salón de belleza
     ficticio (Guayaquil). Claude califica desde los enlaces del lote
     (cuadros del video, sin audio) y se comparan las notas.
   - **Fase E:** iterar prompts y capa; la capa se rehace sin volver a pagar
     el video.
   - Por decidir (lista en [fase-a/README.md](./fase-a/README.md)): la lista
     de plantillas de inspiración, dónde renderizar, audio y primeros modelos
     a integrar.
   - **Calendario comercial:** hecho (PR #15). Siguiente paso: aviso por correo
     unos días antes de cada fecha (ver [temporadas.md](./temporadas.md)).
   - Después: plantillas por industria ecuatoriana, enlace de WhatsApp con
     seguimiento de clics, y Oniric por WhatsApp (TODO(producto): el dueño
     decide si inicia la verificación de la empresa en Meta).
3. Redirigir `oniric-jade.vercel.app` al dominio propio (opcional).
4. **Con el contador:** ISD, IVA de servicios digitales importados y retención
   en pagos al exterior; si algo no se recupera, subir el factor de costos del
   proveedor en `lib/billing/config.ts`.
5. **Antes de cobrar de verdad:** Payphone a producción, regenerar credenciales
   (token de Payphone y contraseña de la base de datos), Vercel Pro (uso
   comercial), revisar límites de Supabase Free.
6. **Factura electrónica automática** (`InvoiceProvider`, firma `.p12`, SRI).
7. Páginas legales (términos y privacidad), imagen Open Graph, monitoreo de
   errores, login con Google.
8. Fase 2 (modo empresa).

Los `TODO(producto)` y `TODO(fase 3)` del código y de `docs/` detallan cada
punto.

## Reglas para tocar producción

- Nunca pedir ni mostrar secretos en el chat. Viven en Vercel y en archivos
  locales ignorados (`.env.local`, `.env.prod`), y se cargan sin imprimirlos.
- Prohibido `supabase db reset --linked` y `supabase config push` contra
  producción.
- Migraciones nuevas: `db push --dry-run`, confirmación del dueño, `db push`,
  `migration list`.
- Desplegar solo desde Git (merge a `main`), no con la CLI de Vercel desde una
  carpeta local.
- Nunca gastar saldo real de Higgsfield sin permiso explícito.
