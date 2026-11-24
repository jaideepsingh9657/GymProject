const paths: Record<string, React.ReactNode> = {
  dumbbell: <><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /></>,
  pulse: <><path d="M2 12h5l2.5-6 4 12 2.5-6H22" /></>,
  bolt: <><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></>,
  coach: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  lotus: <><path d="M12 21c-4-2-7-5-7-9 3 0 6 2 7 5 1-3 4-5 7-5 0 4-3 7-7 9z" /><path d="M12 17c-1.5-3-1.5-7 0-11 1.500 4 1.500 8 0 11z" /></>,
  locker: <><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" /></>,
  qr: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM20 14v7M14 20h3" /></>,
  chart: <><path d="M4 20V11M10 20V4M16 20v-8M2 20h20" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="1" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="1" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></>,
  bell: <><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4" /></>,
};

export type IconName = keyof typeof paths;

export default function Icon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {paths[name]}
    </svg>
  );
}

export const facilityIcon: Record<string, IconName> = {
  "Strength Floor": "dumbbell",
  "Cardio Studio": "pulse",
  "Functional Zone": "bolt",
  "Personal Training": "coach",
  "Recovery & Mobility": "lotus",
  "Changing & Lockers": "locker",
};
