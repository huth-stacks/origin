import { describe, expect, test } from "vitest";

import { parseBackupArguments } from "../scripts/testnet-backup-arguments.ts";

describe(parseBackupArguments.name, () => {
  test("parses each required flag exactly once in either order", () => {
    expect(
      parseBackupArguments([
        "--output",
        "recovery.gpg",
        "--recipient",
        "ab".repeat(20),
      ]),
    ).toEqual({ output: "recovery.gpg", recipient: "ab".repeat(20) });
  });

  test.each([
    { args: [] },
    { args: ["--recipient", "ab".repeat(20)] },
    { args: ["--output", "recovery.gpg"] },
    { args: ["--recipient", "--output", "recovery.gpg"] },
    { args: ["--unknown", "value", "--output", "recovery.gpg"] },
    {
      args: [
        "--recipient",
        "ab".repeat(20),
        "--recipient",
        "cd".repeat(20),
        "--output",
        "recovery.gpg",
      ],
    },
  ])("rejects incomplete or expanded arguments %#", ({ args }) => {
    expect(() => parseBackupArguments(args)).toThrow();
  });
});
