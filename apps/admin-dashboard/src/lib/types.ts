export type MemberState = "ACTIVE" | "EXPIRING" | "EXPIRED" | "NONE";

export interface Plan { id: string; name: string; durationDays: number; pricePaise: number; isActive: boolean }

export interface MemberRow { id: string; memberCode: string; name: string; phone: string | null; status: string; state: MemberState; daysLeft: number | null; planName: string | null; endDate: string | null; duesPaise: number }
export interface MemberList { total: number; page: number; limit: number; items: MemberRow[] }

export interface PaymentRow { id: string; amountDuePaise: number; amountPaidPaise: number; status: string; receiptNo: string | null; createdAt: string; transactions: { method: string; amountPaise: number; createdAt: string }[] }
export interface SubRow { id: string; status: string; startDate: string; endDate: string; plan: { name: string } }
export interface MemberDetail {
  id: string; memberCode: string; name: string; status: string; state: MemberState; daysLeft: number | null;
  user: { phone: string | null; email: string | null };
  subscriptions: SubRow[]; payments: PaymentRow[];
  attendance: { localDate: string; checkInAt: string }[];
  assignments: { trainer: { name: string } }[];
}

export interface Dashboard {
  date: string; checkInsToday: number; activeMembers: number; revenueMonthPaise: number; pendingDuesPaise: number; membersWithDues: number;
  renewalsDue: { subscriptionId: string; endDate: string; daysLeft: number; plan: string; member: { id: string; name: string; memberCode: string } }[];
  enquiries: Record<string, number>;
  revenueByDay: { date: string; paise: number }[];
}

export interface PaymentListRow {
  id: string; amountDuePaise: number; amountPaidPaise: number; status: "PENDING" | "PARTIAL" | "PAID" | "REFUNDED" | "FAILED";
  receiptNo: string | null; createdAt: string; planName: string | null; member: { id: string; name: string; memberCode: string };
}
export interface PaymentList {
  total: number; page: number; limit: number; items: PaymentListRow[];
  summary: { collectedMonthPaise: number; outstandingPaise: number; membersWithDues: number };
}
export interface PaymentDetail {
  id: string; amountDuePaise: number; amountPaidPaise: number; status: string; receiptNo: string | null; createdAt: string;
  member: { id: string; name: string; memberCode: string };
  subscription: { startDate: string; endDate: string; plan: { name: string; durationDays: number } } | null;
  transactions: { method: string; type: string; amountPaise: number; createdAt: string }[];
}

export interface AttendanceDay {
  date: string; insideNow: number;
  items: { id: string; checkInAt: string; checkOutAt: string | null; method: string; member: { id: string; name: string; memberCode: string } }[];
}
export interface AttendanceReport {
  days: number; from: string; to: string; totalVisits: number; uniqueMembers: number; avgPerDay: number; avgVisitMinutes: number | null;
  daily: { date: string; count: number }[]; byHour: { hour: number; count: number }[];
}
