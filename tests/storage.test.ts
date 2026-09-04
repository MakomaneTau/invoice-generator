import { describe, expect, it } from "vitest";
import { createInitialState, INITIAL_SEQUENCE, parseStoredState } from "@/lib/invoice/storage";

describe("invoice storage", () => {
  it("creates a first draft at the planned sequence", () => {
    const state = createInitialState();
    expect(state.nextSequence).toBe(INITIAL_SEQUENCE);
    expect(state.drafts).toHaveLength(1);
    expect(state.drafts[0].invoiceNumber).toBe("INV-0000000");
  });

  it("starts a fresh workspace at the database-provided sequence", () => {
    const state = createInitialState(1107);
    expect(state.nextSequence).toBe(1107);
    expect(state.drafts[0].invoiceNumber).toBe("INV-0001107");
  });

  it("keeps saved drafts while advancing the next available sequence", () => {
    const saved = createInitialState(20);
    const restored = parseStoredState(JSON.stringify(saved), 1107);

    expect(restored.drafts[0].invoiceNumber).toBe("INV-0000020");
    expect(restored.nextSequence).toBe(1107);
  });

  it("recovers from malformed or outdated local data", () => {
    expect(parseStoredState("not-json").drafts).toHaveLength(1);
    expect(parseStoredState(JSON.stringify({ schemaVersion: 0, drafts: [] })).drafts).toHaveLength(1);
  });

  it("restores a structurally valid state", () => {
    const state = createInitialState();
    state.drafts[0].name = "Old custom name";
    state.drafts[0].customer.displayName = "Hype Nation";
    const restored = parseStoredState(JSON.stringify(state));
    expect(restored.activeDraftId).toBe(state.activeDraftId);
    expect(restored.drafts[0].id).toBe(state.drafts[0].id);
    expect(restored.drafts[0].name).toBe("INV-0000000 - Hype Nation");
  });

  it("migrates existing drafts to editable payment details", () => {
    const legacyState = JSON.parse(JSON.stringify(createInitialState()));
    legacyState.schemaVersion = 1;
    legacyState.drafts[0].schemaVersion = 1;
    delete legacyState.drafts[0].payment;

    const restored = parseStoredState(JSON.stringify(legacyState));

    expect(restored.schemaVersion).toBe(2);
    expect(restored.drafts[0].schemaVersion).toBe(2);
    expect(restored.drafts[0].payment).toMatchObject({ method: "EFT", bank: "Capitec" });
  });
});
