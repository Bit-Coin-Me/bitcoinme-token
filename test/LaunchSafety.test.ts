import { expect } from "chai";
import { assertLaunchPlanReady } from "../scripts/lib/launch-plan";
import plan from "../config/launch-plan.json";

describe("Unresolved launch plan", function () {
  it("blocks deployment while maintainer decisions are missing", function () {
    expect(() => assertLaunchPlanReady()).to.throw("Deployment blocked");
  });

  it("cannot be enabled by changing only the approval status", function () {
    const original = plan.status;
    try {
      plan.status = "approved";
      expect(() => assertLaunchPlanReady()).to.throw("implementation and review");
    } finally {
      plan.status = original;
    }
  });
});
