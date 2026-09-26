import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "@/messages/es.json";

import { LocaleSwitcher } from "./locale-switcher";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/galeria",
  useRouter: () => ({ replace }),
}));

const { saveLocalePreference } = vi.hoisted(() => ({
  saveLocalePreference: vi.fn(async () => undefined),
}));

vi.mock("@/lib/users/actions", () => ({ saveLocalePreference }));

function renderSwitcher() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  );
}

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    replace.mockClear();
    saveLocalePreference.mockClear();
  });

  it("muestra los idiomas activos con su nombre nativo", () => {
    renderSwitcher();

    const select = screen.getByRole("combobox", { name: "Idioma" });
    expect(select).toHaveValue("es");
    expect(screen.getByRole("option", { name: "Español" })).toHaveAttribute(
      "lang",
      "es",
    );
    expect(screen.getByRole("option", { name: "Português" })).toHaveAttribute(
      "lang",
      "pt",
    );
  });

  it("guarda el idioma y navega a la misma página en el idioma elegido", async () => {
    renderSwitcher();

    fireEvent.change(screen.getByRole("combobox", { name: "Idioma" }), {
      target: { value: "pt" },
    });

    expect(saveLocalePreference).toHaveBeenCalledWith("pt");
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/galeria", { locale: "pt" }),
    );
  });
});
