import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it.each([["9876543210", "+919876543210"], ["+91 98765 43210", "+919876543210"], ["09876543210", "+919876543210"], ["91-9876543210", "+919876543210"]])("accepts %s", (i, o) => expect(normalizePhone(i)).toBe(o));
  it.each(["12345", "5876543210", "98765432101", "abcdefghij", ""])("rejects %s", (i) => expect(normalizePhone(i)).toBeNull());
});
