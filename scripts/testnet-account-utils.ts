import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { Account } from "@stacks/wallet-sdk";
import {
  generateNewAccount,
  generateWallet,
  getStxAddress,
} from "@stacks/wallet-sdk";

export const testnetAccountRoles = [
  "registry_deployer",
  "canonical_attester",
  "domain_attester",
  "unrecognized_issuer",
  "proof_deployer",
  "lifecycle_deployer",
  "expiry_deployer",
] as const;

export type TestnetAccountRole = (typeof testnetAccountRoles)[number];

interface AccountSettings {
  derivation: string;
  mnemonic: string;
  role: TestnetAccountRole;
}

export interface PublicAccount {
  address: string;
  derivation: string;
}

export type PublicAccounts = Record<TestnetAccountRole, PublicAccount>;

interface LoadedTestnetAccount extends PublicAccount {
  account: Account;
}

const accountSet = "testnet-v2";
const publicAccountsPath = resolve(
  `deployments/${accountSet}-accounts.local.json`,
);

export function privateAccountPath(role: TestnetAccountRole) {
  return resolve(`settings/${accountSet}-${role}.local.json`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseTestnetRoleSettings(
  source: string,
  expectedRole: TestnetAccountRole,
): AccountSettings {
  const value: unknown = JSON.parse(source);
  if (
    !isObject(value) ||
    value.role !== expectedRole ||
    typeof value.mnemonic !== "string" ||
    typeof value.derivation !== "string"
  )
    throw new Error(`Invalid ${expectedRole} private account settings`);
  return {
    role: expectedRole,
    mnemonic: value.mnemonic,
    derivation: value.derivation,
  };
}

export async function loadPublicTestnetAccounts() {
  return JSON.parse(
    await readFile(publicAccountsPath, "utf8"),
  ) as PublicAccounts;
}

export async function loadTestnetAccount(
  role: TestnetAccountRole,
): Promise<LoadedTestnetAccount> {
  const rolePath = privateAccountPath(role);
  const settings = parseTestnetRoleSettings(
    await readFile(rolePath, "utf8"),
    role,
  );
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
