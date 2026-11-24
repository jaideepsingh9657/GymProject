import { addDays } from "../common/dates";

export type MemberState = "ACTIVE" | "EXPIRING" | "EXPIRED" | "NONE";
export const EXPIRING_DAYS = 7;

interface Sub { status: string; startDate: Date; endDate: Date }

/** Derives what the front desk cares about from subscriptions, relative to the branch-local `today`. */
export function membershipState(subs: Sub[], today: Date): { state: MemberState; current?: Sub; daysLeft?: number } {
  const live = subs
    .filter((s) => s.status === "ACTIVE" && s.startDate <= today && s.endDate >= today)
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0];
  if (live) {
    const daysLeft = Math.round((live.endDate.getTime() - today.getTime()) / 86_400_000);
    return { state: live.endDate <= addDays(today, EXPIRING_DAYS) ? "EXPIRING" : "ACTIVE", current: live, daysLeft };
  }
  return { state: subs.some((s) => s.status !== "CANCELLED") ? "EXPIRED" : "NONE" };
}
