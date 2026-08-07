import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { Account } from "@stacks/wallet-sdk";
import {
  generateNewAccount,
  generateWallet,
  getStxAddress,
} from "@stacks/wallet-sdk";

export const testnetAccountRoles = [
  "deployer",
  "trusted_attester",
  "unrecognized_issuer",
  "lookalike_deployer",
] as const;

export type TestnetAccountRole = (typeof testnetAccountRoles)[number];

interface AccountSettings {
  derivation: string;
  mnemonic: string;
}

export interface PublicAccount {
  address: string;
  derivation: string;
}

export type PublicAccounts = Record<TestnetAccountRole, PublicAccount>;

interface LoadedTestnetAccount extends PublicAccount {
  account: Account;
}

const settingsPath = resolve("settings/Testnet.toml");
const publicAccountsPath = resolve("deployments/testnet-accounts.local.json");

function isTestnetAccountRole(value: string): value is TestnetAccountRole {
  return testnetAccountRoles.some((role) => role === value);
}

export function parseTestnetAccountSettings(source: string) {
  const accounts = new Map<TestnetAccountRole, Partial<AccountSettings>>();
  let currentRole: TestnetAccountRole | null = null;

  for (const line of source.split("\n")) {
    const section = line.match(/^\[accounts\.([^\]]+)\]$/)?.[1];
    if (section) {
      currentRole = isTestnetAccountRole(section) ? section : null;
      if (currentRole) accounts.set(currentRole, {});
      continue;
    }
    if (!currentRole) continue;

    const mnemonic = line.match(/^mnemonic = "([^"]+)"$/)?.[1];
    if (mnemonic) accounts.get(currentRole)!.mnemonic = mnemonic;
    const derivation = line.match(/^derivation = "([^"]+)"$/)?.[1];
    if (derivation) accounts.get(currentRole)!.derivation = derivation;
  }

  return Object.fromEntries(
    testnetAccountRoles.map((role) => {
      const account = accounts.get(role);
      if (!account?.mnemonic || !account.derivation)
        throw new Error(`Missing ${role} settings in ${settingsPath}`);
      return [role, account as AccountSettings];
    }),
  ) as Record<TestnetAccountRole, AccountSettings>;
}

export async function loadPublicTestnetAccounts() {
  return JSON.parse(
    await readFile(publicAccountsPath, "utf8"),
  ) as PublicAccounts;
}

export async function loadTestnetAccount(
  role: TestnetAccountRole,
): Promise<LoadedTestnetAccount> {
  const settings = parseTestnetAccountSettings(
    await readFile(settingsPath, "utf8"),
  )[role];
  const publicAccount = (await loadPublicTestnetAccounts())[role];
  if (!publicAccount)
    throw new Error(`Missing ${role} account in ${publicAccountsPath}`);
  if (settings.derivation !== publicAccount.derivation)
    throw new Error(`${role} derivation does not match the public manifest`);

  const accountIndexText = settings.derivation.match(
    /^m\/44'\/5757'\/0'\/0\/(\d+)$/,
  )?.[1];
  if (accountIndexText === undefined)
    throw new Error(`Unsupported ${role} derivation`);
  const accountIndex = Number(accountIndexText);
  let wallet = await generateWallet({
    secretKey: settings.mnemonic,
    password: "",
  });
  while (wallet.accounts.length <= accountIndex)
    wallet = generateNewAccount(wallet);
  const account = wallet.accounts[accountIndex];
  const address = getStxAddress({ account, network: "testnet" });
  if (address !== publicAccount.address)
    throw new Error(`${role} does not match the generated public manifest`);

  return { ...publicAccount, account };
}
