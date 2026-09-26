import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import type { Locale } from "../../i18n/config";

// Helpers de los tests e2e contra el Supabase local (`pnpm supabase:start`).

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} no está definida (ver .env.example).`);
  return value;
}

const admin = () =>
  createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export const TEST_PASSWORD = "clave-segura-123";

export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@oniric.test`;
}

/** Crea un usuario ya confirmado, sin pasar por el correo. */
export async function createConfirmedUser(
  options: { locale?: Locale; password?: string } = {},
) {
  const email = uniqueEmail();
  const password = options.password ?? TEST_PASSWORD;
  const { error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { locale: options.locale ?? "es" },
  });
  if (error) throw error;
  return { email, password };
}

type MailpitMessage = { ID: string; Subject: string };

/** Espera el último correo enviado a `email` y devuelve su asunto y su primer enlace. */
export async function waitForEmail(email: string) {
  const mailpit = env("MAILPIT_URL");
  const query = encodeURIComponent(`to:"${email}"`);

  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(`${mailpit}/api/v1/search?query=${query}`);
    const { messages } = (await response.json()) as {
      messages: MailpitMessage[];
    };
    const latest = messages[0];
    if (latest) {
      const detail = await fetch(`${mailpit}/api/v1/message/${latest.ID}`);
      const { HTML } = (await detail.json()) as { HTML: string };
      const href = /href="([^"]+)"/.exec(HTML)?.[1];
      if (!href) throw new Error(`El correo a ${email} no tiene enlace.`);
      return { subject: latest.Subject, link: href.replaceAll("&amp;", "&") };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No llegó ningún correo a ${email}.`);
}
