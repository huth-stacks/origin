import { describe, expect, test } from "vitest";

import {
  parseTestnetRoleSettings,
  privateAccountPath,
} from "../scripts/testnet-account-utils";

const trustedSettings = JSON.stringify({
  role: "canonical_attester",
  mnemonic: "trusted seed",
  derivation: "m/44'/5757'/0'/0/0",
});

describe(parseTestnetRoleSettings.name, () => {
  test("loads only the expected role-scoped credential", () => {
    expect(
      parseTestnetRoleSettings(trustedSettings, "canonical_attester"),
    ).toEqual({
      role: "canonical_attester",
      mnemonic: "trusted seed",
      derivation: "m/44'/5757'/0'/0/0",
    });
  });

  test("rejects a credential file for another role", () => {
    expect(() =>
      parseTestnetRoleSettings(trustedSettings, "registry_deployer"),
    ).toThrow("Invalid registry_deployer private account settings");
  });

  test("rejects incomplete private account settings", () => {
    expect(() =>
      parseTestnetRoleSettings(
        JSON.stringify({ role: "canonical_attester" }),
        "canonical_attester",
      ),
    ).toThrow("Invalid canonical_attester private account settings");
  });
});

describe(privateAccountPath.name, () => {
  test("uses one ignored local file per role", () => {
    expect(privateAccountPath("canonical_attester")).toMatch(
      /settings\/testnet-v2-canonical_attester\.local\.json$/,
    );
    expect(privateAccountPath("registry_deployer")).not.toBe(
      privateAccountPath("canonical_attester"),
    );
  });
});
