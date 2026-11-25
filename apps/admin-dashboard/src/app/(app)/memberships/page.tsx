"use client";
import { useState } from "react";
import PlanModal from "@/components/members/PlanModal";
import { Badge, Empty, ErrorNote, Skeleton } from "@/components/ui";
import { rupees } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useMe } from "@/lib/useMe";

const label = (d: number) => (d % 365 === 0 ? `${d / 365} year${d === 365 ? "" : "s"}` : d % 30 === 0 ? `${d / 30} month${d === 30 ? "" : "s"}` : `${d} days`);

export default function Memberships() {
  const { data, error, loading, reload } = useApi<Plan[]>("/plans");
  const { isOwner } = useMe();
  const [editing, setEditing] = useState<Plan | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="font-display text-3xl">Memberships</h1><p className="text-sm text-mute">The plans you sell. Prices here also feed the sales screens.</p></div>
        {isOwner && <button className="btn btn-gold" onClick={() => setEditing("new")}>New plan</button>}
      </div>
      <ErrorNote message={error} />
      {!isOwner && <p className="text-xs text-mute">Only the owner can create or edit plans.</p>}

      {loading && !data ? <Skeleton className="h-48" /> : data && data.length === 0 ? (
        <div className="panel"><Empty title="Create your first plan" body={isOwner ? "Add a monthly, quarterly or annual plan to start selling memberships." : "Ask the owner to create plans so memberships can be sold."} /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data?.map((p) => (
            <article key={p.id} className={`panel flex flex-col ${p.isActive ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2"><h2 className="font-display text-2xl">{p.name}</h2>{!p.isActive && <Badge tone="mute">Hidden</Badge>}</div>
              <p className="text-sm text-mute">{label(p.durationDays)} · {p.durationDays} days</p>
              <p className="mt-4 font-display text-3xl text-gold">{rupees(p.pricePaise)}</p>
              <p className="text-xs text-mute">{rupees(Math.round(p.pricePaise / p.durationDays * 30))} per month</p>
              {isOwner && <button className="btn btn-ghost mt-4 self-start" onClick={() => setEditing(p)}>Edit</button>}
            </article>
          ))}
        </div>
      )}

      {editing && <PlanModal plan={editing === "new" ? null : editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); void reload(); }} />}
    </div>
  );
}
