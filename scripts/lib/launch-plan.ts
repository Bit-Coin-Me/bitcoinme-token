import plan from "../../config/launch-plan.json";

/**
 * Fail closed until the maintainers approve the economic plan and its on-chain
 * lock/Safe/LP verification is implemented and reviewed.
 */
export function assertLaunchPlanReady(): never {
  if (plan.status !== "approved") {
    throw new Error(
      "Deployment blocked: OD-1/OD-2 and the final recipients require maintainer approval"
    );
  }
  throw new Error(
    "Deployment blocked: immutable locks, Safe policy and liquidity proofs still require implementation and review"
  );
}
