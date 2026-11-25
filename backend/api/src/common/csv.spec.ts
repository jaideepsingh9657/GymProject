import { csvCell, rupees, toCsv } from "./csv";

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });
  it("neutralises spreadsheet formulas in text", () => {
    for (const bad of ["=1+1", "+cmd", "-2", "@SUM(A1)", "\t=x"]) expect(csvCell(bad).replace(/^"/, "")).toMatch(/^'/);
    expect(csvCell(-500)).toBe("-500"); // real negative numbers are untouched
  });
  it("handles empties and builds CRLF rows", () => {
    expect(csvCell(null)).toBe("");
    expect(toCsv(["a", "b"], [[1, "x,y"], [2, ""]])).toBe('a,b\r\n1,"x,y"\r\n2,\r\n');
  });
  it("formats paise as rupees", () => { expect(rupees(123456)).toBe("1234.56"); expect(rupees(5)).toBe("0.05"); });
});
