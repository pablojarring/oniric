// Datos que el cliente pyme completa en el asistente de 3 pasos. Se guardan en
// `generation_jobs.brief` para mostrarlos en la galería y como registro.

export type AdBrief = {
  /** Qué se anuncia ("Pan de yuca"). */
  productName: string;
  description?: string;
  /** La oferta de la plantilla "Oferta del día" ("2x1"). */
  offer?: string;
  /** Texto final del anuncio, editado por el cliente. */
  adCopy: string;
  /**
   * El cliente confirmó que tiene derechos sobre la foto y el consentimiento
   * de las personas que aparecen en ella (CLAUDE.md §7).
   */
  photoConsent: boolean;
};
