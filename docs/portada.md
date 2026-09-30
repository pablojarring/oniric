# Portada

La página pública (`app/[locale]/page.tsx`) presenta el producto y lleva a
crear la cuenta. Es estática (se genera en el build para cada idioma).

## Secciones

Cada sección es un componente en `components/landing/`:

| Sección        | Componente         | Ancla           |
| -------------- | ------------------ | --------------- |
| Hero           | `hero.tsx`         | —               |
| Rubros         | `industries.tsx`   | —               |
| Por qué Oniric | `problem.tsx`      | —               |
| Cómo funciona  | `how-it-works.tsx` | `#how-it-works` |
| Plantillas     | `templates.tsx`    | `#templates`    |
| Beneficios     | `features.tsx`     | —               |
| Precios        | `pricing.tsx`      | `#pricing`      |
| Preguntas      | `faq.tsx`          | `#faq`          |
| Llamado final  | `final-cta.tsx`    | —               |

El encabezado (`components/site-header.tsx`) queda fijo arriba y, en pantallas
anchas, enlaza a las anclas. El pie está en `components/site-footer.tsx`.

## Textos

Todo el texto está en `messages/*.json`, namespace `Landing`. Las plantillas
salen de `lib/templates` y de `Templates.items`, así que la portada muestra
siempre las mismas que el asistente.

Reglas del texto de venta:

- Solo promete lo que el producto ya hace. Lo que falta (modo empresa) va como
  "Próximamente".
- Sin testimonios, cifras de clientes ni logos inventados.
- Los anuncios de la portada son ilustraciones (`components/marketing/ad-mockup.tsx`)
  con negocios ficticios, no resultados reales de un modelo.

## Diseño

- Colores de marca: violeta (`--primary`), fucsia y naranja. Títulos en
  Bricolage Grotesque (`--font-display`); el resto en Geist.
- Efectos en CSS puro, sin librerías (`app/globals.css`): fondo "aurora", grilla
  de puntos, texto y botones con degradado, borde animado, cinta infinita y
  aparición al desplazarse (`animation-timeline: view()`, solo donde el
  navegador lo soporta).
- Con "reducir movimiento" activado en el sistema, las animaciones se detienen.
- Primitivas reutilizables en `components/marketing/`.

## Pendientes

- TODO(producto): paquetes de créditos y sus precios para mostrarlos en la
  sección de precios.
- TODO(producto): imágenes o videos reales de ejemplo generados con las
  plantillas, cuando estén los modelos de Higgsfield.
- TODO(producto): páginas legales (términos y privacidad) para enlazarlas en el
  pie.
- TODO(producto): imagen para compartir la portada en redes (Open Graph).
