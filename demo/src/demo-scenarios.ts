export const demoScenarios = [
  {
    id: "known",
    actionTitle: "Weekly check-in",
    body: "Your regular check-in. Keeps the streak going and adds one stamp.",
    from: "acme.example",
    deployer: "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY",
    contractName: "acme-action",
    subject: "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action",
    stampWeek: 10,
  },
  {
    id: "unrecognized",
    actionTitle: "Bonus check-in",
    body: "Acme is running bonus week with Northwind. Adds one stamp, same as usual.",
    from: "northwind.example",
    deployer: "ST2EWCY9STYTS6FGJ0KP1FQNMKHJFXMP7KKM7FRX0",
    contractName: "claimed-action",
    subject: "ST2EWCY9STYTS6FGJ0KP1FQNMKHJFXMP7KKM7FRX0.claimed-action",
    stampWeek: 10,
  },
  {
    id: "lookalike",
    actionTitle: "Weekly check-in",
    body: "Your regular check-in. Keeps the streak going and adds one stamp.",
    from: "mail.acme-rewards.example",
    deployer: "ST3B1B5SN96FXEP2EC2SE6K2XWEEBYR7TK70WF6XA",
    contractName: "acme-action",
    subject: "ST3B1B5SN96FXEP2EC2SE6K2XWEEBYR7TK70WF6XA.acme-action",
    stampWeek: 10,
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
