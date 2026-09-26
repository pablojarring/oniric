import { z } from "zod";

/** Igual que `minimum_password_length` en supabase/config.toml. */
export const MIN_PASSWORD_LENGTH = 8;

export const emailSchema = z.email().max(254);

// bcrypt, que usa Supabase, ignora lo que pase de 72 bytes.
export const passwordSchema = z.string().min(MIN_PASSWORD_LENGTH).max(72);

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
