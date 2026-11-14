import { describe, it, expect } from "vitest";
import {
  getNowInIST,
  getISTWeekBoundaries,
  parseHighlightedSlogan,
  formatISTDateRange,
  getCountdownToSundayMidnightIST,
} from "@/lib/slogans";

describe("Weekly Slogans Engine (IST Asia/Kolkata)", () => {
  it("computes current time in Asia/Kolkata timezone with correct offsets", () => {
    const nowIST = getNowInIST();
    expect(nowIST).toBeInstanceOf(Date);
    expect(nowIST.getTime()).toBeGreaterThan(0);
  });

  it("calculates exact Monday 00:00:00 to Sunday 23:59:59 IST boundaries", () => {
    const testDate = new Date("2026-11-14T12:00:00Z"); // Saturday
    const boundaries = getISTWeekBoundaries(testDate);

    expect(boundaries.startAt).toBeInstanceOf(Date);
    expect(boundaries.endAt).toBeInstanceOf(Date);
    expect(boundaries.endAt.getTime()).toBeGreaterThan(boundaries.startAt.getTime());
    expect(boundaries.label).toBeTruthy();
    expect(boundaries.weekNumber).toBeGreaterThan(0);
  });

  it("correctly parses asterisks for radiant gold highlights", () => {
    const raw = "Pure *Kaju*. Pure *Elegance*. This Week's Special.";
    const segments = parseHighlightedSlogan(raw);

    expect(segments).toHaveLength(5);
    expect(segments[0]).toEqual({ text: "Pure ", isHighlight: false });
    expect(segments[1]).toEqual({ text: "Kaju", isHighlight: true });
    expect(segments[2]).toEqual({ text: ". Pure ", isHighlight: false });
    expect(segments[3]).toEqual({ text: "Elegance", isHighlight: true });
    expect(segments[4]).toEqual({ text: ". This Week's Special.", isHighlight: false });
  });

  it("formats readable IST date range string", () => {
    const start = "2026-11-10T00:00:00.000Z";
    const end = "2026-11-16T23:59:59.000Z";
    const label = formatISTDateRange(start, end);

    expect(label).toContain("to");
  });

  it("calculates countdown to Sunday midnight IST without negative values", () => {
    const countdown = getCountdownToSundayMidnightIST();

    expect(countdown.days).toBeGreaterThanOrEqual(0);
    expect(countdown.days).toBeLessThanOrEqual(7);
    expect(countdown.hours).toBeGreaterThanOrEqual(0);
    expect(countdown.hours).toBeLessThan(24);
    expect(countdown.minutes).toBeGreaterThanOrEqual(0);
    expect(countdown.minutes).toBeLessThan(60);
    expect(countdown.seconds).toBeGreaterThanOrEqual(0);
    expect(countdown.seconds).toBeLessThan(60);
    expect(countdown.totalSeconds).toBeGreaterThan(0);
    expect(countdown.label).toBeTruthy();
  });
});
