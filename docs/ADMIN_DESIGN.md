# Admin dashboard design (v0.1 DRAFT, awaiting approval)

Mockups were reviewed in the Claude session; this file records the decisions.
All names, numbers and money values in mockups are sample data.

## Principles
- A work tool for the front desk: calm, dense, fast. Gold marks the one primary action per view and active state; everything else is neutral.
- Same tokens as the website (ink, charcoal, line, bone, mute, gold) so brand stays consistent; dark default, light supported.
- The most frequent task, checking someone in, is always one step away.
- Role-aware: navigation items and actions a role can't use are absent (server still enforces).

## Layout
Collapsed icon sidebar (expands to labels on wide screens): Today, Members, Memberships, Payments, Attendance, Enquiries, Trainers, Reports, Settings. Top bar: page title, global member search, branch switcher (hidden with one branch), user menu.

## Screens
1. **Today**: KPIs (check-ins today, active members, revenue this month vs target, pending dues), renewals due in 7 days with Renew/Remind, quick check-in (scan or code, shows status), new enquiries and trials, 14-day revenue.
2. **Members**: search + status filters (All, Active, Expiring, Expired, Dues), table (member, plan, end date, status badge), side panel with membership, payments, 30-day attendance and actions (Renew, Freeze, Pay).
3. Next: Member form, Sell/renew membership flow (plan, dates, payment), Payments ledger and receipt, Attendance (live list + reports), Enquiries pipeline (board), Trainers, Reports, Settings.

## Components
Stat card, status badge (Active green, Soon amber, Expired/Dues red; always text + colour), data table (sortable, sticky header, pagination), filter chips, side panel, primary/ghost buttons, confirm dialog for destructive actions (freeze, cancel, refund), toast, empty state, skeleton.

## Rules
- Never colour alone: every status has a text label.
- Money shown in INR with grouping (₹ 4,20,000), stored as paise.
- Destructive or financial actions need confirmation and are audit-logged.
- Tables are keyboard navigable; minimum 4.5:1 text contrast in both themes.
