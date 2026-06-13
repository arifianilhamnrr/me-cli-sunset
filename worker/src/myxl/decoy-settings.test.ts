import { describe, expect, it } from "vitest";
import {
  DECOY_NAME_RE,
  formatDecoyRow,
  parseDecoyForm,
} from "./decoy-settings";

describe("decoy-settings helpers", () => {
  it("DECOY_NAME_RE accepts valid custom names", () => {
    expect(DECOY_NAME_RE.test("v1")).toBe(true);
    expect(DECOY_NAME_RE.test("my-decoy")).toBe(true);
    expect(DECOY_NAME_RE.test("X")).toBe(false);
  });

  it("parseDecoyForm maps form fields", () => {
    const data = parseDecoyForm(
      {
        family_name: " XL PASS ",
        family_code: "fc-1",
        variant_code: "vc-1",
        order: "2",
        price: "5000",
        is_enterprise: "true",
        migration_type: "PRE_TO_PRIOH",
        base_method: "qris",
      },
      true,
    );
    expect(data.family_name).toBe("XL PASS");
    expect(data.order).toBe(2);
    expect(data.price).toBe(5000);
    expect(data.is_enterprise).toBe(true);
    expect(data.base_method).toBe("qris");
  });

  it("formatDecoyRow precomputes template flags", () => {
    const row = formatDecoyRow(
      {
        family_code: "abcd-1234-uuid",
        migration_type: "NONE",
        base_method: "qris",
        is_enterprise: true,
        order: 3,
        price: 1000,
      },
      "custom",
      "vtest",
      "Custom vtest",
    );
    expect(row.has_family_code).toBe(true);
    expect(row.family_code_short).toBe("abcd-123…");
    expect(row.mt_NONE).toBe(true);
    expect(row.base_method_qris_selected).toBe(true);
    expect(row.is_enterprise_checked).toBe(true);
    expect(row.raw_json).toContain("abcd-1234-uuid");
  });
});