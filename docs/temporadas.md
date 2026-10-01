# Calendario comercial (temporadas)

Valor agregado propio para el modo pyme: Oniric le recuerda al negocio las
fechas que más venden en su país y le deja el anuncio de cada una a un toque,
con la plantilla, la ambientación y el texto pensados para la fecha. El código
está en `lib/seasons`; los textos, en `messages/*.json` (namespace `Seasons`).

## Dónde aparece

| Lugar                 | Qué muestra                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `/home`               | "Fechas que venden": las 3 próximas fechas (carrusel en el celular) y el enlace al calendario.    |
| `/calendar`           | Las fechas de los próximos 12 meses, agrupadas por mes.                                           |
| `/create?season=<id>` | El asistente con la plantilla de la fecha, el aviso "Anuncio para…" (se puede quitar) y su texto. |
| `/ads/[id]`           | "Fecha comercial" en los detalles del anuncio.                                                    |

- Cada tarjeta muestra cuánto falta. Desde `leadDays` días antes se destaca
  con "Es momento de publicar".
- El día de hoy se calcula en la zona horaria del país
  (`America/Guayaquil`), no en UTC. La fecha se muestra hasta el mismo día y
  después pasa al año siguiente.
- Solo el modo pyme (`seasonalCalendar` en `lib/segment`) y solo países con
  calendario: hoy, **Ecuador**. Los demás no ven la sección y `/calendar`
  responde 404.

## Qué cambia en el anuncio

- La fecha propone su plantilla, salvo que también llegue `?template=`.
- El texto sugerido es el de la fecha (`Seasons.items.<id>.copy`, o
  `copyOffer` en las plantillas que piden oferta). El cliente lo puede editar.
- El prompt agrega la ambientación de la fecha (`scene`, en inglés) después
  del estilo de la plantilla (`buildPrompt` en `lib/templates`).
- `seasonId` se guarda en `generation_jobs.brief`. No hubo migración.
- El precio no cambia: es el de la plantilla y el formato.

## Fechas de Ecuador

| Fecha                                | Regla                                  | Anticipación | Plantilla           |
| ------------------------------------ | -------------------------------------- | ------------ | ------------------- |
| San Valentín                         | 14 de febrero                          | 14 días      | Promo 15s Instagram |
| Carnaval                             | Lunes, 48 días antes de Pascua         | 14 días      | Estado de WhatsApp  |
| Semana Santa                         | Viernes Santo                          | 10 días      | Oferta del día      |
| Regreso a clases (Costa)             | ≈ primer lunes de mayo (aproximada)    | 21 días      | Oferta del día      |
| Día de la Madre                      | Segundo domingo de mayo                | 21 días      | Promo 15s Instagram |
| Día del Niño                         | 1 de junio                             | 10 días      | Estado de WhatsApp  |
| Día del Padre                        | Tercer domingo de junio                | 14 días      | Promo 15s Instagram |
| Fundación de Guayaquil               | 25 de julio                            | 10 días      | Estado de WhatsApp  |
| Regreso a clases (Sierra y Amazonía) | ≈ primer lunes de septiembre (aprox.)  | 21 días      | Oferta del día      |
| Independencia de Guayaquil           | 9 de octubre                           | 10 días      | Estado de WhatsApp  |
| Día de Difuntos                      | 2 de noviembre                         | 14 días      | Estado de WhatsApp  |
| Black Friday                         | Viernes después del 4.º jueves de nov. | 14 días      | Oferta del día      |
| Fiestas de Quito                     | 6 de diciembre                         | 14 días      | Estado de WhatsApp  |
| Navidad                              | 25 de diciembre                        | 30 días      | Promo 15s Instagram |
| Año Viejo                            | 31 de diciembre                        | 10 días      | Estado de WhatsApp  |

Las fechas **aproximadas** cambian cada año por decisión oficial: se muestran
con el mes ("Aprox. en mayo"), sin el día ni la cuenta regresiva.

Son fechas comerciales, no la lista de feriados: los traslados de feriados no
las cambian.

## Agregar una fecha o un país

1. Agregar el id a `seasonIds` y su entrada en `seasons` (regla, anticipación,
   plantilla y ambientación).
2. Agregar el país a `calendars` con su zona horaria y sus fechas.
3. Agregar `name`, `tip`, `copy` y `copyOffer` en `messages/es.json` y
   `messages/pt.json`, y su ícono en `components/seasons/season-visuals.ts`.
4. Actualizar los tests de `lib/seasons/seasons.test.ts`.

## Pendientes

- TODO(producto): validar la lista de fechas, su anticipación y los textos.
- TODO(producto): confirmar cada año el inicio de clases de la Costa y de la
  Sierra con el Ministerio de Educación.
- Siguiente paso: **aviso por correo** unos días antes de cada fecha. Necesita
  que la app envíe correos propios (hoy solo Supabase Auth envía correos),
  permiso para darse de baja y un registro de avisos enviados.
- Ideas para después: filtrar por industria y por ciudad (las fiestas de Quito
  y de Guayaquil son regionales) y generar el texto con IA según el negocio.
