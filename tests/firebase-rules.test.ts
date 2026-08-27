import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-invoice-generator",
    firestore: { rules: await readFile("firestore.rules", "utf8") },
  });
});

afterAll(async () => environment?.cleanup());

describe("private Firebase resources", () => {
  it("denies Firestore access even to an authenticated browser client", async () => {
    const firestore = environment.authenticatedContext("allowed-user").firestore();
    await assertFails(setDoc(doc(firestore, "users/allowed-user/invoices/example"), { invoiceNumber: "INV-1" }));
    await assertFails(getDoc(doc(firestore, "users/allowed-user/invoices/example")));
  });
});
