import type { AuthError } from "@supabase/supabase-js";

/** Errores de los formularios de auth; los textos están en messages (Auth.errors). */
export type AuthFormError =
  | "invalidEmail"
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "weakPassword"
  | "samePassword"
  | "passwordMismatch"
  | "rateLimited"
  | "sessionExpired"
  | "invalidLink"
  | "oauth"
  | "unknown";

/** Traduce los códigos de error de Supabase Auth a los errores del formulario. */
export function toAuthFormError(error: Pick<AuthError, "code">): AuthFormError {
  switch (error.code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "weak_password":
      return "weakPassword";
    case "same_password":
      return "samePassword";
    case "email_address_invalid":
      return "invalidEmail";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "rateLimited";
    case "session_not_found":
    case "session_expired":
      return "sessionExpired";
    default:
      return "unknown";
  }
}
