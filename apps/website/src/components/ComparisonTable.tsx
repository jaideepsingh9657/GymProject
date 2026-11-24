import Reveal from "./Reveal";
import { comparison } from "@/content/site";

export default function ComparisonTable() {
  return (
    <Reveal>
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Membership benefits comparison</caption>
          <thead className="bg-charcoal">
            <tr>{comparison.head.map((h, i) => <th key={h} scope="col" className={`px-5 py-4 font-display text-xl font-medium ${i === 3 ? "text-gold" : ""}`}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {comparison.rows.map((r) => (
              <tr key={String(r[0])} className="border-t border-line transition-colors hover:bg-charcoal/60">
                <th scope="row" className="px-5 py-4 font-normal text-bone/90">{r[0]}</th>
                {r.slice(1).map((c, i) => (
                  <td key={i} className="px-5 py-4">
                    {c === true ? <span className="text-gold" aria-label="Included">✓</span> : c === false ? <span className="text-mute/50" aria-label="Not included">–</span> : <span>{c}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Reveal>
  );
}
