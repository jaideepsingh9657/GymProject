"use client";
import { useEffect, useState } from "react";
import TrainerModal from "@/components/members/TrainerModal";
import { Badge, Empty, ErrorNote, Skeleton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { day } from "@/lib/format";
import type { MemberList, TrainerDetail, TrainerRow } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useMe } from "@/lib/useMe";

export default function Trainers() {
  const { isOwner } = useMe();
  const list = useApi<TrainerRow[]>("/trainers");
  const [selected, setSelected] = useState<string | null>(null);
  const detail = useApi<TrainerDetail>(selected ? `/trainers/${selected}` : null);
  const [dialog, setDialog] = useState<null | "add" | "edit">(null);
  const refresh = () => { void list.reload(); void detail.reload(); };

  useEffect(() => { if (!selected && list.data?.[0]) setSelected(list.data[0].id); }, [list.data, selected]);
  const d = detail.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="font-display text-3xl">Trainers</h1><p className="text-sm text-mute">Your coaches, who they train, and what the website shows about them.</p></div>
        {isOwner && <button className="btn btn-gold" onClick={() => setDialog("add")}>Add trainer</button>}
      </div>
      <ErrorNote message={list.error} />
      {!isOwner && <p className="text-xs text-mute">Only the owner can add or edit trainers. You can assign members to them.</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {list.loading && !list.data ? <Skeleton className="h-48" /> : list.data && list.data.length === 0 ? (
            <div className="panel"><Empty title="Add your first trainer" body={isOwner ? "Trainers get their own login and can be shown on the website." : "Ask the owner to add trainers."} /></div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.data?.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setSelected(t.id)} aria-pressed={selected === t.id} className={`panel block h-full w-full text-left transition-colors hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${selected === t.id ? "!border-gold" : ""} ${t.isActive ? "" : "opacity-60"}`}>
                    <div className="flex items-start justify-between gap-2"><h2 className="font-display text-2xl">{t.name}</h2>{!t.isActive && <Badge tone="bad">Inactive</Badge>}</div>
                    <p className="mt-1 text-xs text-mute">{t.experienceYears !== null ? `${t.experienceYears} yrs experience · ` : ""}{t.memberCount} member{t.memberCount === 1 ? "" : "s"}</p>
                    <div className="mt-2 flex flex-wrap gap-1">{t.specializations.map((s) => <span key={s} className="border border-line px-1.5 py-0.5 text-[11px] text-mute">{s}</span>)}</div>
                    <p className="mt-3 text-[11px] uppercase tracking-wider text-mute">{t.isPublic ? "Shown on website" : "Hidden from website"}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside aria-label="Trainer detail" className="panel min-w-0 lg:sticky lg:top-4 lg:self-start">
          {selected && detail.loading && !d && <Skeleton className="h-64" />}
          <ErrorNote message={selected ? detail.error : null} />
          {!selected && <Empty title="Select a trainer" body="Profile and assigned members show here." />}
          {d && <Detail d={d} isOwner={isOwner} onEdit={() => setDialog("edit")} onChanged={refresh} />}
        </aside>
      </div>

      {dialog === "add" && <TrainerModal trainer={null} onClose={() => setDialog(null)} onDone={(id) => { setDialog(null); setSelected(id); refresh(); }} />}
      {dialog === "edit" && d && <TrainerModal trainer={d} onClose={() => setDialog(null)} onDone={() => { setDialog(null); refresh(); }} />}
    </div>
  );
}

function Detail({ d, isOwner, onEdit, onChanged }: { d: TrainerDetail; isOwner: boolean; onEdit: () => void; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const found = useApi<MemberList>(dq.length >= 2 ? `/members?search=${encodeURIComponent(dq)}&limit=5` : null);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); onChanged(); } catch (e) { setError(e instanceof ApiError ? e.message : "Something went wrong"); } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div><h2 className="font-display text-2xl">{d.name}</h2><p className="text-xs text-mute">{d.email}{d.phone ? ` · ${d.phone}` : ""}</p></div>
        <div className="flex flex-col items-end gap-1">{d.isActive ? <Badge tone="ok">Active</Badge> : <Badge tone="bad">Inactive</Badge>}</div>
      </div>
      {isOwner && (
        <div className="my-3 flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={onEdit}>Edit</button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => { if (d.isActive && !confirm(`Deactivate ${d.name}? They will be signed out and can't log in.`)) return; void act(() => api(`/trainers/${d.id}`, { method: "PATCH", body: { isActive: !d.isActive } })); }}>{d.isActive ? "Deactivate" : "Reactivate"}</button>
        </div>
      )}
      <ErrorNote message={error} />

      <dl className="space-y-1.5 border-t border-line pt-2 text-sm">
        {d.qualifications && <Row k="Qualifications" v={d.qualifications} />}
        {d.experienceYears !== null && <Row k="Experience" v={`${d.experienceYears} years`} />}
        {d.availability && <Row k="Availability" v={d.availability} />}
        <Row k="Last sign-in" v={d.lastLoginAt ? day(d.lastLoginAt) : "Never"} />
        {d.specializations.length > 0 && <Row k="Specialises in" v={d.specializations.join(", ")} />}
      </dl>
      {d.bio && <p className="mt-2 text-sm text-mute">{d.bio}</p>}

      <h3 className="label mt-4">Members ({d.members.length})</h3>
      {d.members.length === 0 ? <p className="py-2 text-sm text-mute">No members assigned yet.</p> : d.members.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-2 border-t border-line py-1.5 text-sm first:mt-1">
          <span>{m.member.name} <span className="text-xs text-mute">{m.member.memberCode} · since {day(m.startsOn)}</span></span>
          <button className="btn btn-ghost !px-2 !py-1" disabled={busy} onClick={() => act(() => api(`/trainers/${d.id}/assignments/${m.id}/end`, { method: "POST", body: {} }))}>End</button>
        </div>
      ))}

      {d.isActive && (
        <div className="mt-3">
          <label htmlFor="assign" className="label block">Assign a member</label>
          <input id="assign" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone or code" className="input mt-1" autoComplete="off" />
          {dq.length >= 2 && found.data && (found.data.items.length === 0 ? <p className="py-2 text-sm text-mute">No members match.</p> : (
            <ul className="mt-1">
              {found.data.items.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 border-t border-line py-1.5 text-sm">
                  <span>{m.name} <span className="text-xs text-mute">{m.memberCode}</span></span>
                  <button className="btn btn-gold !px-2 !py-1" disabled={busy} onClick={() => act(async () => { await api(`/trainers/${d.id}/assignments`, { method: "POST", body: { memberId: m.id } }); setQ(""); })}>Assign</button>
                </li>
              ))}
            </ul>
          ))}
          <p className="mt-1 text-[11px] text-mute">A member has one trainer at a time; assigning moves them from their current one.</p>
        </div>
      )}
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between gap-3"><dt className="shrink-0 text-mute">{k}</dt><dd className="text-right">{v}</dd></div>;
