import fixtures from "../../deployments/testnet-fixtures.json";

function principalParts(subject: string) {
  const separator = subject.indexOf(".");
  if (separator < 1 || separator === subject.length - 1)
    throw new Error(`Invalid fixture subject: ${subject}`);
  return {
    deployer: subject.slice(0, separator),
    contractName: subject.slice(separator + 1),
  };
}

const known = principalParts(fixtures.fixtures.known.subject);
const unrecognized = principalParts(fixtures.fixtures.unrecognized.subject);
const lookalike = principalParts(fixtures.fixtures.lookalike.subject);

export const demoScenarios = [
  {
    id: "known",
    actionTitle: "Weekly check-in",
    body: "Your regular check-in. Keeps the streak going and adds one stamp.",
    from: "acme.example",
    deployer: known.deployer,
    contractName: known.contractName,
    subject: fixtures.fixtures.known.subject,
    stampWeek: 10,
  },
  {
    id: "unrecognized",
    actionTitle: "Bonus check-in",
    body: "Acme is running bonus week with Northwind. Adds one stamp, same as usual.",
    from: "northwind.example",
    deployer: unrecognized.deployer,
    contractName: unrecognized.contractName,
    subject: fixtures.fixtures.unrecognized.subject,
    stampWeek: 10,
  },
  {
    id: "lookalike",
    actionTitle: "Weekly check-in",
    body: "Your regular check-in. Keeps the streak going and adds one stamp.",
    from: "mail.acme-rewards.example",
    deployer: lookalike.deployer,
    contractName: lookalike.contractName,
    subject: fixtures.fixtures.lookalike.subject,
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
