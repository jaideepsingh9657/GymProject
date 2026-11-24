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
