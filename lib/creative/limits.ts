// Límites del director creativo que también usan las pantallas, en un módulo
// sin dependencias del servidor.

/** Preguntas máximas de la conversación antes de cerrar con el brief. */
export const MAX_QUESTIONS = 6;

/** Largo máximo de lo que escribe el dueño en cada respuesta o cambio. */
export const MAX_FREE_TEXT = 500;

/** Largo máximo de cada campo de "Esto entendí" al corregirlo a mano. */
export const MAX_BRIEF_FIELD = 300;

/** Elementos y largo máximos de las listas del brief (incluir, evitar). */
export const MAX_BRIEF_ITEMS = 8;
export const MAX_BRIEF_ITEM = 120;

/** Duración máxima de una nota de voz, en segundos. */
export const MAX_VOICE_SECONDS = 30;

/** Tamaño máximo de una nota de voz (30 s en cualquier formato del navegador). */
export const MAX_VOICE_BYTES = 2 * 1024 * 1024;

/** Formatos de audio que graban los navegadores y acepta la transcripción. */
export const voiceMimeTypes = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
} as const;
