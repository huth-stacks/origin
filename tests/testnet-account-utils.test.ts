import { describe, expect, test } from "vitest";

import { parseTestnetAccountSettings } from "../scripts/testnet-account-utils";

const settings = `[network]
name = "testnet"

[accounts.deployer]
mnemonic = "deployer seed"
derivation = "m/44'/5757'/0'/0/0"

[accounts.trusted_attester]
mnemonic = "trusted seed"
derivation = "m/44'/5757'/0'/0/0"

[accounts.unrecognized_issuer]
mnemonic = "unrecognized seed"
derivation = "m/44'/5757'/0'/0/0"

[accounts.lookalike_deployer]
mnemonic = "lookalike seed"
derivation = "m/44'/5757'/0'/0/0"`;

describe(parseTestnetAccountSettings.name, () => {
  test("loads a distinct role-scoped mnemonic and derivation", () => {
    const accounts = parseTestnetAccountSettings(settings);

    expect(accounts.trusted_attester).toEqual({
      mnemonic: "trusted seed",
      derivation: "m/44'/5757'/0'/0/0",
    });
    expect(
      new Set(Object.values(accounts).map((account) => account.mnemonic)).size,
    ).toBe(4);
  });

  test("rejects an incomplete role configuration", () => {
    expect(() =>
      parseTestnetAccountSettings(
        settings.replace('mnemonic = "trusted seed"', ""),
      ),
    ).toThrow("Missing trusted_attester settings");
  });
});
