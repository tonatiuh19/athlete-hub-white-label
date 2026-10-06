import { describe, expect, it } from "vitest";
import {
  buildMinuteOptions,
  combineDateWithTime,
  parseDatetimeLocalValue,
  parseDefaultTime,
  snapMinute,
  toDatetimeLocalValue,
} from "@/utils/datetimePickerValue";

describe("datetimePickerValue", () => {
  it("parses and formats local wall datetime", () => {
    const d = parseDatetimeLocalValue("2026-08-28T10:15");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(7);
    expect(d!.getDate()).toBe(28);
    expect(d!.getHours()).toBe(10);
    expect(d!.getMinutes()).toBe(15);
    expect(toDatetimeLocalValue(d!)).toBe("2026-08-28T10:15");
  });

  it("combines date with snapped interval minutes", () => {
    const day = new Date(2026, 7, 28, 0, 0, 0, 0);
    expect(combineDateWithTime(day, 10, 22)).toBe("2026-08-28T10:22");
    expect(snapMinute(22, 15)).toBe(15);
    expect(snapMinute(23, 15)).toBe(30);
    expect(buildMinuteOptions(15)).toEqual([0, 15, 30, 45]);
  });

  it("parses default time seeds", () => {
    expect(parseDefaultTime("08:00")).toEqual({ hours: 8, minutes: 0 });
    expect(parseDefaultTime("bogus")).toEqual({ hours: 8, minutes: 0 });
  });
});
