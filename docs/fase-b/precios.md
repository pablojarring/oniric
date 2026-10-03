# Precios del flujo creativo, viabilidad y suscripción (octubre de 2026)

Recálculo de lo que paga el cliente con todo lo que se agregó en la fase B
(preparación, imagen de prueba, motion graphics, voz) y la comparación entre
créditos y una suscripción mensual. Los cálculos usan la misma fórmula del
código (`lib/billing/pricing.ts`).

## Resumen

- **Un anuncio Pro de 10 s cuesta ≈ 109 créditos (US$1,09)** con todo
  incluido: 10 de preparación e imagen de prueba, y 99 de video con edición.
  Un Rápido cuesta de 39 a 66 créditos y un Cine, de 441 a 1.298.
- **Es viable:** el margen se mantiene en el 35 % con el paquete de US$5 y en el
  25 % (el piso) con el de US$50, y los agregados suman pocos centavos por
  anuncio.
- **El riesgo principal:** varios precios de Higgsfield tienen hoy un descuento
  del 50 %. Si se acaba, un Pro de 10 s sube a ≈ 194 créditos. El margen no se
  pierde porque el precio sale de la estimación en vivo de Higgsfield, pero el
  cliente pagaría más.
- **Suscripción:** se recomienda un modelo mixto: planes mensuales con créditos
  incluidos, más recargas para quien no quiera suscribirse. Payphone lo permite
  (sección 8).

## 1. La fórmula

```
créditos = costo del proveedor × 1,07 ÷ 0,65 ÷ 0,00812  ≈  costo × 202,7
```

- **1,07:** ISD del 5 % y comisión bancaria del 2 %.
- **0,65:** margen del 35 %.
- **0,00812:** lo que queda de cada crédito vendido sin el IVA y sin la comisión
  de Payphone.

Se redondea hacia arriba y nunca baja de 1 crédito. 1 crédito = US$0,01 para el
cliente, con IVA incluido.

## 2. Qué se cobra en cada anuncio

| Parte                                      | Qué incluye                                                                                                          | Costo al proveedor (10 s)              | Créditos |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------- |
| **Preparación + primera imagen de prueba** | Conversación, director creativo, fichas visuales, 2 búsquedas en internet, notas de voz y la imagen (primer cuadro). | ≈ US$0,047                             | **10**   |
| Imagen de prueba extra                     | Marketing Studio Image                                                                                               | US$0,0138                              | 3        |
| **Video**                                  | Según el nivel (sección 3)                                                                                           | US$0,25 a 2,06                         | 51 a 418 |
| **Edición (motion graphics)**              | Análisis del video, recorte del sujeto (Pro y Cine) y hasta 3 renders                                                | US$0,025 (Rápido) a 0,067 (Pro y Cine) | 6 a 14   |
| Voz en off (opcional)                      | ElevenLabs v4 (sección 6)                                                                                            | ≈ US$0,01 a 0,02                       | 3 a 4    |
| Música (opcional)                          | Eleven Music, o una biblioteca con licencia (por decidir)                                                            | ≈ US$0,05                              | ≈ 11     |
| Cambio de texto desde el cuarto            | Un render más                                                                                                        | ≈ US$0,005                             | ≈ 2      |

- La **preparación se cobra con la primera imagen de prueba**: así no se pierde
  si el cliente abandona después de ver las ideas. Si va directo al video, se
  suma al precio del video. Lo único que Oniric absorbe son las conversaciones
  abandonadas antes de la primera imagen (≈ US$0,01 cada una), y se acotan con
  el límite de uso por organización.
- Supuestos del cálculo (a confirmar en la fase D):
  - texto con GPT-6 Luna;
  - búsqueda web de OpenAI a ≈ US$0,01;
  - recorte de video a US$0,0042 por segundo;
  - render de Remotion Lambda a ≈ US$0,005 por cada 10 s.

## 3. Precio por tipo de anuncio (precios de Higgsfield de hoy)

| Anuncio                      | Modelo            | Costo total | Créditos (US$) | Con US$5 | Con US$15 | Con US$30 | Con US$50 | Ganancia con US$5 / US$50 |
| ---------------------------- | ----------------- | ----------- | -------------- | -------- | --------- | --------- | --------- | ------------------------- |
| Imagen para redes            | Marketing Studio  | US$0,05     | 11 (0,11)      | 45       | 143       | 300       | 522       | US$0,03 / 0,02            |
| Rápido 5 s                   | Wan 3.0           | US$0,19     | 39 (0,39)      | 12       | 40        | 84        | 147       | US$0,11 / 0,07            |
| Rápido 10 s                  | Wan 3.0           | US$0,32     | 66 (0,66)      | 7        | 23        | 50        | 87        | US$0,19 / 0,12            |
| **Pro 10 s**                 | Kling 3.0 / O3    | US$0,53     | **109 (1,09)** | 4        | 14        | 30        | 52        | US$0,31 / 0,20            |
| Pro 15 s                     | Kling 3.0 / O3    | US$0,77     | 158 (1,58)     | 3        | 9         | 20        | 36        | US$0,46 / 0,29            |
| Pro 10 s, muchas referencias | Seedance 2.5      | US$1,55     | 316 (3,16)     | 1        | 4         | 10        | 18        | US$0,90 / 0,57            |
| Cine 10 s                    | Cinema Studio 4.0 | US$2,17     | 441 (4,41)     | 1        | 3         | 7         | 13        | US$1,26 / 0,79            |
| Cine 15 s                    | Cinema Studio 4.0 | US$3,23     | 655 (6,55)     | 0        | 2         | 5         | 8         | US$1,87 / 1,17            |
| Cine 30 s                    | Cinema Studio 4.0 | US$6,40     | 1.298 (12,98)  | 0        | 1         | 2         | 4         | US$3,69 / 2,32            |

- "Con US$5…" es cuántos anuncios alcanzan con cada paquete; los paquetes
  grandes traen créditos de regalo.
- La ganancia es después de pagar a los proveedores, el ISD, el banco, el IVA y
  Payphone; con el paquete de US$50 es menor por el regalo del 15 %.
- No incluye voz ni música opcionales.
- Rangos para la pantalla "¿Qué tan pro?" (video y edición, más 10 de
  preparación): **Rápido 29 a 56, Pro 99 a 306, Cine 431 a 1.288**.

### Si Higgsfield quita sus descuentos

El catálogo de Higgsfield muestra hoy descuentos sin fecha de fin: Kling 3.0,
Kling O3 y Wan 3.0 al 50 %, Seedance 2.5 al 30 % y Marketing Studio al 15 %.
Cinema Studio y Soul 2 no tienen descuento.

| Anuncio     | Hoy | Sin descuento | Diferencia |
| ----------- | --- | ------------- | ---------- |
| Rápido 10 s | 66  | 117           | +77 %      |
| Pro 10 s    | 109 | 194           | +78 %      |
| Pro 15 s    | 158 | 285           | +80 %      |
| Cine 10 s   | 441 | 441           | igual      |

El margen no corre riesgo: cada precio se calcula con la estimación en vivo de
Higgsfield (`estimate()`) antes de reservar los créditos. Lo que cambia es lo
que paga el cliente. Por eso la app debe mostrar los rangos como "desde" y
nunca prometer un precio fijo en la publicidad.

## 4. Costos fijos y punto de equilibrio

| Costo                    | Cuándo                                                     | US$ al mes                                                            |
| ------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| Vercel Pro               | Antes de vender (el plan Hobby no permite uso comercial)   | 20                                                                    |
| Supabase Pro             | Cuando los videos pasen de 1 GB (o se mueven a R2, gratis) | 25                                                                    |
| AWS para Remotion Lambda | Desde la fase C                                            | ≈ 0 con poco volumen (el nivel gratis de Lambda: 400.000 GB-s al mes) |
| Remotion                 | Mientras ONIRIASOLUTIONS tenga 3 personas o menos          | 0                                                                     |
| YouTube, Pexels          | Siempre                                                    | 0                                                                     |

Con unos US$0,31 de ganancia por anuncio Pro, Vercel Pro se paga con **≈ 65
anuncios Pro al mes** (2 al día). Si además hace falta Supabase Pro, con ≈ 145.
Mover los videos a R2 evita Supabase Pro por bastante tiempo.

## 5. Presupuestos de prueba y topes

Topes del dueño (3 de octubre de 2026): **Higgsfield US$15** (ya cargados en la
API) y **OpenAI US$10**. Remotion Lambda y el recorte de video todavía no
tienen cuenta.

**Qué alcanza con US$15 en Higgsfield** (fase D):

| Uso                                                                | Costo         |
| ------------------------------------------------------------------ | ------------- |
| Panadería La Esquina: imagen, Rápido 10 s, 3 Pro 10 s, 1 Cine 10 s | US$3,58       |
| Estudio Brillo: imagen, Rápido 5 s, 2 Pro 10 s, 1 Pro 15 s         | US$1,61       |
| 20 imágenes de prueba                                              | US$0,28       |
| Ejemplos de las plantillas (30 imágenes)                           | US$0,41       |
| Personajes Oniric (20 × 3 ángulos con Soul 2)                      | US$0,19       |
| **Total**                                                          | **≈ US$6,10** |

Quedan ≈ US$9 para iterar en la fase E (unos 20 Pro de 10 s más).

**OpenAI US$10:** cada anuncio gasta de US$0,01 a 0,04 en texto, fichas,
búsquedas y plan de animación. Alcanza para cientos de anuncios de prueba.

**Remotion Lambda:** con el volumen de pruebas debería quedar dentro del nivel
gratis de AWS. Propuesta de tope: US$5, con una alerta de presupuesto en AWS.

**Recorte de video:** si Higgsfield no lo ofrece por API, US$5 en fal.ai
alcanzan para ≈ 119 recortes de 10 s.

**En la app** hay un tope por proveedor, y al llegar a él ese proveedor se
apaga:

- Higgsfield vuelve al simulador;
- la conversación usa las opciones de respaldo;
- sin recorte, el título no va detrás del sujeto.

Además conviene poner el mismo límite en el panel de cada proveedor, como
respaldo: el límite de presupuesto del proyecto en OpenAI y la alerta de AWS
Budgets. El saldo prepagado de Higgsfield ya funciona como tope natural.

## 6. Audio: ¿ElevenLabs v4 o el audio de cada modelo?

ElevenLabs lanzó Eleven v4 el 28 de septiembre de 2026:

- más de 90 idiomas;
- emociones dirigidas con etiquetas como `[laughs]` o `[whispers]`;
- diálogos entre varias voces y efectos de sonido en el mismo guion;
- clones de voz con 10 s de audio y consentimiento verificado.

| Necesidad                                                                            | Audio propio del modelo (Kling 3.0, Seedance 2.5, Cinema Studio) | ElevenLabs v4                                          |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------ |
| Ambiente y efectos sincronizados con la imagen (el horno, la campanita, un maullido) | **Mejor:** salen pegados a lo que se ve.                         | Posible, pero sin sincronía con la imagen.             |
| Voz en off con un guion exacto y en español                                          | Irregular: no siempre dice el texto exacto.                      | **Mejor:** guion exacto, emociones y pausas dirigidas. |
| La misma voz en todos los anuncios ("la voz de tu marca")                            | No.                                                              | **Sí:** se guarda la voz en Mi marca.                  |
| La voz del dueño                                                                     | No.                                                              | **Sí,** con su consentimiento verificado.              |
| Subtítulos estilo TikTok palabra por palabra                                         | Hay que transcribir.                                             | **Sí:** la voz trae los tiempos de cada palabra.       |

**Recomendación: usar los dos.** El audio del modelo pone el ambiente y los
efectos; ElevenLabs v4 pone la voz en off. Remotion los mezcla y baja el
ambiente cuando habla la voz. Cuesta de 3 a 4 créditos por anuncio de 10 s
(≈ 150 a 200 caracteres), así que es viable incluso si el precio fuera el
triple.

- TODO: el catálogo público de la API de Higgsfield solo lista modelos de
  imagen y video; ElevenLabs v4 no aparece ahí. Hay que confirmar en la consola
  que está en la API, su precio por carácter y sus condiciones de uso
  comercial. Si está, es una sola cuenta y un solo tope. Si no, se usa la API de
  ElevenLabs directamente (requiere plan pago para uso comercial y una clave
  nueva, `ELEVENLABS_API_KEY`).
- A probar en la fase D: acentos de Quito y de Guayaquil.

## 7. Estilos de animación

Los tres aprobados, más los cinco que pidió el dueño. Solo se usan tipografías
con licencia libre (Google Fonts, OFL).

| Estilo             | Cómo se ve                                                                              | Tipografía de ejemplo                               |
| ------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Portada de revista | Título enorme detrás del sujeto, garabatos, etiquetas (como la demo de Higgsfield).     | Bricolage Grotesque, Anton                          |
| De barrio          | Rótulo pintado a mano, colores de letrero popular ecuatoriano.                          | Lilita One, Bungee                                  |
| Oferta relámpago   | Rápido, inclinado, precio y cuenta regresiva.                                           | Archivo Black                                       |
| **Psicodélico**    | Colores saturados, letras onduladas con sombras de colores, ondas y distorsión líquida. | Shrikhand                                           |
| **Nueva era**      | Futurista estilo Y2K: cromo, brillos, letra ancha, íconos 3D.                           | Unbounded, Syne                                     |
| **Clásico**        | Serif elegante, transiciones suaves, líneas finas, comercial tradicional.               | Playfair Display, DM Serif Display                  |
| **Hogareño**       | Letra a mano, texturas de papel, stickers recortados, tonos cálidos.                    | Caveat                                              |
| **Estilo TikTok**  | Subtítulos palabra por palabra en caja o con contorno, zooms rápidos, ritmo de reel.    | TikTok Sans (TODO: verificar licencia) o Montserrat |

- "Nueva era" se interpretó como futurista o Y2K; falta que el dueño lo
  confirme.
- Los estilos no cambian el precio: el psicodélico tarda un poco más en
  renderizar, pero sigue siendo menos de un centavo.

## 8. ¿Suscripción mensual o créditos?

### Lo que hace el mercado

Las herramientas de video con IA cobran con **suscripción mensual que incluye
créditos** y recargas aparte:

- Higgsfield: desde US$19 al mes por 270 créditos (pago anual), hasta US$129
  por 3.000.
- HeyGen: US$29, 49 y 149 al mes, con créditos según el plan.

Es el modelo mixto que hoy es el estándar en software con IA: una cuota fija
más el uso, con topes y alertas para que el cliente no se lleve sorpresas.

### Comparación

|                          | Solo créditos (hoy)                                                                             | Solo suscripción                                                                         | **Mixto: plan con créditos + recargas**                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Para el cliente          | Sin compromiso, entra con US$5. Pero cada compra es una decisión y "créditos" se entiende poco. | Simple: "US$19 al mes, hasta 20 anuncios". Pero da miedo el cobro automático.            | Lo mejor de los dos: plan para el que publica seguido, paquetes para el ocasional.        |
| Ventas                   | Fácil la primera compra, difícil la segunda.                                                    | Más difícil la primera; después se repite sola.                                          | Se vende el plan como "tu equipo de marketing por US$19 al mes" y el paquete como prueba. |
| Ingresos                 | Irregulares, dependen de que el cliente se acuerde.                                             | Recurrentes y predecibles.                                                               | Recurrentes, más las recargas de los que usan mucho.                                      |
| Rentabilidad             | Margen fijo; los créditos no usados vencen a los 12 meses.                                      | El uso no consumido del mes queda como margen.                                           | Igual que la suscripción, con el margen protegido por los créditos.                       |
| Riesgo                   | Poco uso recurrente.                                                                            | Un cliente que usa Cine todo el mes puede comerse el margen si el plan dice "ilimitado". | Los créditos ponen el límite: Cine gasta más créditos que Rápido.                         |
| Lo que hay que construir | Ya existe.                                                                                      | Cobro recurrente, cancelación, reintentos.                                               | Lo mismo que la suscripción; los paquetes ya existen.                                     |

### Recomendación: mixto

1. **Los créditos siguen siendo la moneda interna**, porque un Cine cuesta 10
   veces un Rápido y el precio sale del costo real. Al cliente se le muestran en
   **anuncios** ("≈ 20 anuncios Pro") además de créditos.
2. **Tres planes mensuales** (nombres por decidir), con precios cuyo IVA cuadra al
   centavo y menores a US$50, así la factura no pide los datos del comprador:

   | Plan   | Precio al mes (IVA incl.) | Créditos al mes | Equivale a                           |
   | ------ | ------------------------- | --------------- | ------------------------------------ |
   | Básico | US$9                      | 990 (+10 %)     | ≈ 9 Pro de 10 s o 15 Rápidos de 10 s |
   | Crece  | US$19                     | 2.185 (+15 %)   | ≈ 20 Pro o 33 Rápidos                |
   | Total  | US$39                     | 4.485 (+15 %)   | ≈ 41 Pro o 10 Cine de 10 s           |

3. **Reglas:**
   - los créditos del plan que no se usan pasan al mes siguiente, hasta un mes
     de cupo;
   - se gastan primero los del plan y después los de paquetes;
   - el cliente cambia o cancela el plan cuando quiera desde la app;
   - recargas disponibles en cualquier momento.
4. **Los paquetes prepagados siguen** para quien no quiere suscribirse, y como
   puerta de entrada (US$5).
5. **Ventajas del plan que no cuestan:** más créditos por dólar, los créditos
   que pasan al mes siguiente y 3 ideas listas antes de cada fecha comercial del
   calendario.

### Números

Margen de cada plan según cuánto use el cliente (después del IVA, Payphone,
proveedores, ISD y banco):

| Plan   | Usa el 100 %     | Usa el 75 %       | Usa el 60 %       |
| ------ | ---------------- | ----------------- | ----------------- |
| Básico | 28,5 % (US$2,08) | 46,4 % (US$3,39)  | 57,1 % (US$4,17)  |
| Crece  | 25,3 % (US$3,90) | 43,9 % (US$6,78)  | 55,2 % (US$8,51)  |
| Total  | 25,3 % (US$8,00) | 43,9 % (US$13,92) | 55,2 % (US$17,47) |

Aunque un cliente gaste todo, el margen queda en el piso del 25 %.

Ejemplo ilustrativo, **con supuestos por validar**:

- **Cliente del plan Crece** que usa el 75 % y se queda unos 16 meses (6 %
  de bajas al mes; las referencias de la industria dan del 3 al 7 % mensual en
  pymes): deja ≈ US$113 de ganancia.
- **Cliente de solo créditos** que compra el paquete de US$15 cada dos meses
  durante seis meses: deja ≈ US$12.

La diferencia viene de la recurrencia, no del precio por anuncio, que es
parecido en los dos modelos.

**Conclusión:** el modelo mixto trae más ingresos y es más fácil de vender a
quien publica cada semana. Los paquetes mantienen la entrada barata para
probar.

### ¿Se puede con Payphone?

**Sí, de dos formas, sin cambiar de pasarela:**

1. **Suscripción Recurrente de Payphone Business** (sin programar):
   - se crea el plan una vez, se comparte un enlace y Payphone cobra cada mes
     o cada año;
   - acepta Visa y Mastercard, de crédito o de débito, desde US$5 hasta
     US$1.000.

   Sirve para probar con los primeros clientes ya mismo. Los créditos de cada
   mes se acreditan a mano desde el admin, con el acreditado manual que ya
   existe. TODO: preguntar a Payphone si estos cobros mandan una notificación a
   nuestra app, para automatizarlo.

2. **Tokenización por API** (automática):
   - en el primer pago, el cliente autoriza guardar su tarjeta y Payphone
     devuelve un `cardToken`;
   - cada mes, la tarea programada diaria (ya existe) cobra con ese token
     desde nuestro servidor y acredita los créditos del plan;
   - si el cobro falla, se reintenta y se avisa por correo antes de pausar el
     plan.

   Condiciones de Payphone:
   - aprobación previa, que toma de 3 a 5 días hábiles;
   - solo Visa y Mastercard;
   - en cada cobro se envían los datos del titular (correo, teléfono, cédula y
     nombre cifrado), que deben coincidir con los de la primera compra;
   - **retiene el 10 % de lo cobrado con tokens durante 6 meses**, como
     garantía contra fraude. Afecta la caja, no la ganancia.

   Payphone notifica a nuestra app solo los cobros aprobados; los rechazados se
   detectan en la respuesta del cobro.

**Camino propuesto:**

1. Decidir los planes.
2. Probar con la Suscripción Recurrente de Payphone Business y acreditar a mano
   con los primeros clientes.
3. Pedir la aprobación de la tokenización y construir el cobro automático antes
   de abrir las ventas.

No bloquea la fase C: es un trabajo de pagos aparte.

### Decisiones pendientes

- TODO(producto): aprobar el modelo mixto, los precios y los nombres de los
  planes.
- TODO(producto): si hay prueba gratis (por ejemplo, el primer anuncio Rápido
  de regalo, ≈ US$0,32 por cliente nuevo).
- TODO(producto): fuente de la música (Eleven Music o una biblioteca con
  licencia).
- TODO: comisión de Payphone en los cobros con token (no figura en su
  documentación).

## Fuentes

- Catálogo público de Higgsfield (`dash.higgsfield.ai/api/v2/catalog-models/`),
  consultado el 3 de octubre de 2026.
- [Payphone: tokenización](https://docs.payphone.app/tokenizacion),
  [notificación externa](https://docs.payphone.app/notificacion-externa) y
  [suscripciones en Payphone Business](https://help.payphone.app/hc/es/articles/51293618777627-Activa-las-Suscripciones-para-tus-clientes-en-tu-Payphone-Business).
- [Eleven v4 (ElevenLabs)](https://elevenlabs.io/blog/eleven-v4) y
  [lanzamiento de Eleven v4](https://testingcatalog.com/elevenlabs-launches-eleven-v4-and-v4-turbo-voice-models).
- [Precios de Higgsfield en 2026](<https://creatify.ai/blog/higgsfield-pricing-(2026)-plans-and-what-you-ll-actually-pay>)
  y [de HeyGen](<https://creatify.ai/es/blog/heygen-pricing-(2026)-plans-and-what-you-ll-actually-pay>).
- [El precio mixto ya es el estándar](https://www.solvimon.com/blog/hybrid-pricing-is-the-default-now-heres-the-data)
  y [bajas en software para pymes](https://www.withorb.com/blog/saas-churn-statistics).
- [Remotion Lambda: ejemplo de costo](https://remotion.dev/docs/lambda/cost-example).
