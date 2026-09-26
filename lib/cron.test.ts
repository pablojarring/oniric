import { describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "./cron";

describe("isAuthorizedCronRequest", () => {
  it("acepta el secreto correcto", () => {
    expect(
      isAuthorizedCronRequest("Bearer s3creto-largo", "s3creto-largo"),
    ).toBe(true);
  });

  it.each([
    ["Bearer otro", "s3creto-largo"],
    ["s3creto-largo", "s3creto-largo"],
    [null, "s3creto-largo"],
    ["Bearer ", ""],
    ["Bearer undefined", undefined],
  ])("rechaza %s", (authorization, secret) => {
    expect(isAuthorizedCronRequest(authorization, secret)).toBe(false);
  });
});
