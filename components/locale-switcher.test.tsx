import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "@/messages/es.json";

import { LocaleSwitcher } from "./locale-switcher";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/galeria",
  useRouter: () => ({ replace }),
}));

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

  it("navega a la misma página en el idioma elegido", () => {
    renderSwitcher();

    fireEvent.change(screen.getByRole("combobox", { name: "Idioma" }), {
      target: { value: "pt" },
    });

    expect(replace).toHaveBeenCalledWith("/galeria", { locale: "pt" });
  });
});
