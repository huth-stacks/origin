interface BackupArguments {
  recipient: string;
  output: string;
}

export function parseBackupArguments(args: readonly string[]): BackupArguments {
  const allowed = new Set(["--recipient", "--output"]);
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!name || !allowed.has(name))
      throw new Error(`Unknown recovery argument: ${name ?? "missing"}`);
    if (!value || value.startsWith("--"))
      throw new Error(`Missing required ${name} argument`);
    if (values.has(name))
      throw new Error(`Duplicate recovery argument: ${name}`);
    values.set(name, value);
  }
  const recipient = values.get("--recipient");
  const output = values.get("--output");
  if (!recipient) throw new Error("Missing required --recipient argument");
  if (!output) throw new Error("Missing required --output argument");
  return { recipient, output };
}
