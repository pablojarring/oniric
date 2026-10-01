import { describe, expect, it } from "vitest";

import { higgsfieldConfig } from ".";

describe("higgsfieldConfig", () => {
  it("sin clave se usa el mock", () => {
    expect(higgsfieldConfig({})).toBeNull();
    expect(higgsfieldConfig({ HIGGSFIELD_API_KEY: "  " })).toBeNull();
  });

  it("exige el formato <key_id>:<key_secret>", () => {
    expect(() => higgsfieldConfig({ HIGGSFIELD_API_KEY: "solo-id" })).toThrow(
      "<key_id>:<key_secret>",
    );
  });

  it("sin HTTPS público o sin secreto no pide webhook", () => {
    expect(
      higgsfieldConfig({
        HIGGSFIELD_API_KEY: "id:secret",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        HIGGSFIELD_WEBHOOK_SECRET: "s3cret",
      }),
    ).toEqual({ credentials: "id:secret", webhook: undefined });
    expect(
      higgsfieldConfig({
        HIGGSFIELD_API_KEY: "id:secret",
        NEXT_PUBLIC_SITE_URL: "https://oniric.test",
      })?.webhook,
    ).toBeUndefined();
  });

  it("con HTTPS y secreto pide el webhook firmado", () => {
    expect(
      higgsfieldConfig({
        HIGGSFIELD_API_KEY: "id:secret",
        NEXT_PUBLIC_SITE_URL: "https://oniric.test/",
        HIGGSFIELD_WEBHOOK_SECRET: "s3cret",
      }),
    ).toEqual({
      credentials: "id:secret",
      webhook: { siteUrl: "https://oniric.test", secret: "s3cret" },
    });
  });
});
