import { describe, it, expect } from "vitest";
import { assertDealStageChange, isWinTransition, type StageInfo } from "@/domain/policies/deal-stage.policy";
import { ValidationFailed, InvalidTransition } from "@/domain/errors";

const stage = (id: string, position: number, kind: StageInfo["kind"]): StageInfo => ({ id, position, kind });

describe("deal-stage.policy", () => {
  it("dopředný přechod mezi open fázemi je povolen", () => {
    expect(() => assertDealStageChange({
      from: stage("lead", 1, "open"), to: stage("proposal", 4, "open"),
      lostReason: null, actorIsAdminOrOwner: false,
    })).not.toThrow();
  });

  it("přechod do Lost bez důvodu selže", () => {
    expect(() => assertDealStageChange({
      from: stage("proposal", 4, "open"), to: stage("lost", 7, "lost"),
      lostReason: null, actorIsAdminOrOwner: true,
    })).toThrow(ValidationFailed);
  });

  it("zpětný přechod smí jen admin/owner", () => {
    const change = { from: stage("proposal", 4, "open"), to: stage("lead", 1, "open"), lostReason: null };
    expect(() => assertDealStageChange({ ...change, actorIsAdminOrOwner: false })).toThrow(InvalidTransition);
    expect(() => assertDealStageChange({ ...change, actorIsAdminOrOwner: true })).not.toThrow();
  });

  it("isWinTransition detekuje vstup do won", () => {
    expect(isWinTransition({ from: stage("neg", 5, "open"), to: stage("won", 6, "won"), lostReason: null, actorIsAdminOrOwner: true })).toBe(true);
    expect(isWinTransition({ from: stage("won", 6, "won"), to: stage("won", 6, "won"), lostReason: null, actorIsAdminOrOwner: true })).toBe(false);
  });
});
