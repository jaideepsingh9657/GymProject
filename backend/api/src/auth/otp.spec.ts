import { generateOtp, hashOtp, otpMatches } from "./otp";

const secret = "s".repeat(32);

describe("otp", () => {
  it("generates 6 digits", () => { for (let i = 0; i < 200; i++) expect(generateOtp()).toMatch(/^\d{6}$/); });
  it("matches only the right code and target", () => {
    const h = hashOtp(secret, "+919876543210", "123456");
    expect(otpMatches(secret, "+919876543210", "123456", h)).toBe(true);
    expect(otpMatches(secret, "+919876543210", "123457", h)).toBe(false);
    expect(otpMatches(secret, "+919999999999", "123456", h)).toBe(false);
  });
  it("does not throw on malformed stored hash", () => { expect(otpMatches(secret, "t", "123456", "zz")).toBe(false); });
});
