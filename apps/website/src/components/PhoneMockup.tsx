/** Sample member-app card. All values are sample data, not real members. */
export default function PhoneMockup() {
  const cells = Array.from({ length: 81 }, (_, i) => ((i * 7 + (i >> 2) * 3) % 5 < 2));
  return (
    <div className="relative mx-auto w-[260px] sm:w-[290px]" role="img" aria-label="Sample member app screen showing a membership QR card">
      <div className="absolute -inset-10 bg-[radial-gradient(circle,rgba(201,162,75,0.25)_0%,transparent_65%)]" aria-hidden />
      <div className="relative rounded-[2.6rem] border border-bone/20 bg-ink p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
        <div className="rounded-[2rem] bg-charcoal px-5 pb-6 pt-8">
          <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-line" />
          <p className="text-[10px] uppercase tracking-wider2 text-mute">Welcome back</p>
          <p className="font-display text-3xl">Sample Member</p>
          <div className="mt-5 border border-gold/50 bg-ink p-4">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider2">
              <span className="text-gold">Annual</span><span className="text-mute">Active</span>
            </div>
            <div className="mx-auto mt-4 grid w-36 grid-cols-9 gap-[2px] bg-bone p-2" aria-hidden>
              {cells.map((on, i) => <span key={i} className={`aspect-square ${on ? "bg-ink" : "bg-bone"}`} />)}
            </div>
            <p className="mt-3 text-center text-[10px] uppercase tracking-wider2 text-mute">Scan at the front desk</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="border border-line p-3"><p className="font-display text-2xl text-gold">18</p><p className="text-[10px] uppercase tracking-wider2 text-mute">Visits</p></div>
            <div className="border border-line p-3"><p className="font-display text-2xl text-gold">212</p><p className="text-[10px] uppercase tracking-wider2 text-mute">Days left</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
