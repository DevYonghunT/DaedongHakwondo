import { describe, expect, it } from "vitest";
import { parseMonthlyTuition } from "../src/lib/tuition";

describe("parseMonthlyTuition", () => {
  it("parses won strings", () => {
    expect(parseMonthlyTuition("월 360,000원").monthlyFee).toBe(360000);
  });

  it("parses manwon strings", () => {
    expect(parseMonthlyTuition("교습비 28만원").monthlyFee).toBe(280000);
  });

  it("uses the largest amount for composite fee text", () => {
    expect(parseMonthlyTuition("주2회 150,000원 / 주3회 210,000원").monthlyFee).toBe(210000);
  });

  it("marks undisclosed fees", () => {
    expect(parseMonthlyTuition("수강료 비공개")).toEqual({
      monthlyFee: null,
      disclosed: false,
      reason: "undisclosed"
    });
  });
});
