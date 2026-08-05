export const demoScenarios = [
  {
    id: "known",
    index: "01",
    eyebrow: "Reference contract",
    title: "The expected deployer",
    contractName: "acme-action",
    subject: "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action",
    siteClaim: "Presented by this site as Acme’s demo action.",
    walletPrompt:
      "Wallet-owned trust policy can name the attester behind this exact claim.",
  },
  {
    id: "unrecognized",
    index: "02",
    eyebrow: "Unrecognized claim",
    title: "Anyone can make a claim",
    contractName: "claimed-action",
    subject: "ST2EWCY9STYTS6FGJ0KP1FQNMKHJFXMP7KKM7FRX0.claimed-action",
    siteClaim: "Presented by this site as an official Acme contract.",
    walletPrompt:
      "The claim is surfaced without repeating its untrusted organization name.",
  },
  {
    id: "lookalike",
    index: "03",
    eyebrow: "Name collision",
    title: "Same name, new deployer",
    contractName: "acme-action",
    subject: "ST3B1B5SN96FXEP2EC2SE6K2XWEEBYR7TK70WF6XA.acme-action",
    siteClaim: "Presented by this site under the familiar contract name.",
    walletPrompt:
      "Unknown origin and the name-collision heuristic remain separate signals.",
  },
] as const;

export type DemoScenario = (typeof demoScenarios)[number];
export type DemoScenarioId = DemoScenario["id"];

export interface DemoContractCallRequest {
  contract: string;
  functionName: "record-demo-action";
  functionArgs: [];
  network: "testnet";
  postConditionMode: "deny";
  postConditions: [];
}

export function createDemoContractCall(
  scenario: DemoScenario,
): DemoContractCallRequest {
  return {
    contract: scenario.subject,
    functionName: "record-demo-action",
    functionArgs: [],
    network: "testnet",
    postConditionMode: "deny",
    postConditions: [],
  };
}
