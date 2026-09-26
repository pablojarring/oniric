import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renderiza un botón accesible con la variante por defecto", () => {
    render(<Button>Generar</Button>);

    const button = screen.getByRole("button", { name: "Generar" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveClass("bg-primary");
  });

  it("aplica la variante indicada", () => {
    render(<Button variant="outline">Cancelar</Button>);

    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveClass(
      "border-border",
    );
  });
});
