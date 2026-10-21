import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import type {
  IgnitionModule,
  NamedArtifactContractDeploymentFuture,
} from "@nomicfoundation/ignition-core";
import { assertLaunchPlanReady } from "../../scripts/lib/launch-plan";

const BitCoinMeModule: IgnitionModule<
  "BitCoinMeModule",
  "BitCoinMe",
  { token: NamedArtifactContractDeploymentFuture<"BitCoinMe"> }
> = buildModule("BitCoinMeModule", (m) => {
  assertLaunchPlanReady();
  const recipients = m.getParameter<string[]>("recipients");
  const token = m.contract("BitCoinMe", [recipients]);
  return { token };
});

export default BitCoinMeModule;
