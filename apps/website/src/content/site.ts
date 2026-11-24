// PLACEHOLDER: every value below is temporary sample content until the owner
// supplies verified business details. Do not publish with these values.
export const PLACEHOLDER = true;

export const site = {
  name: "Luxury Fitness Gym",
  tagline: "Train like it matters.",
  city: "Chhatrapati Sambhajinagar",
  region: "Maharashtra, India",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // PLACEHOLDER contact details
  address: "Address to be confirmed, Chhatrapati Sambhajinagar, Maharashtra",
  phone: "+91 00000 00000",
  whatsapp: "910000000000",
  hours: [
    { days: "Monday – Saturday", time: "5:30 AM – 10:30 PM" },
    { days: "Sunday", time: "7:00 AM – 12:00 PM" },
  ],
  instagram: "#", // PLACEHOLDER: owner to provide official URL
  googleMaps: "#", // PLACEHOLDER
  googleReviews: "#", // PLACEHOLDER
};

export const waLink = (msg: string) =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}`;

export const nav = [
  { href: "/about", label: "About" },
  { href: "/facilities", label: "Facilities" },
  { href: "/membership", label: "Membership" },
  { href: "/trainers", label: "Trainers" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
];

export const facilities = [
  { title: "Strength Floor", body: "Racks, platforms and free weights arranged for serious lifting." },
  { title: "Cardio Studio", body: "Treadmills, cross-trainers and bikes with room to breathe." },
  { title: "Functional Zone", body: "Open turf for conditioning, mobility and athletic work." },
  { title: "Personal Training", body: "One-to-one programming with a coach who knows your name." },
];

// PLACEHOLDER trainers: replace with real profiles
export const trainers = [
  { name: "Trainer Name", role: "Head Coach", spec: "Strength & Conditioning" },
  { name: "Trainer Name", role: "Performance Coach", spec: "Functional Training" },
  { name: "Trainer Name", role: "Nutrition & Fat Loss", spec: "Body Composition" },
];

// PLACEHOLDER plans: pricing is admin-managed later
export const plans = [
  { name: "Monthly", duration: "1 month", price: "₹ —", features: ["Full gym access", "Locker", "Member app"] },
  { name: "Quarterly", duration: "3 months", price: "₹ —", features: ["Full gym access", "Locker", "Member app", "Body assessment"] },
  { name: "Half-Yearly", duration: "6 months", price: "₹ —", featured: true, features: ["Everything in Quarterly", "2 PT sessions", "Diet guidance"] },
  { name: "Annual", duration: "12 months", price: "₹ —", features: ["Everything in Half-Yearly", "4 PT sessions", "Priority booking"] },
];

export const why = [
  { n: "01", t: "Coaching, not crowding", b: "Capped floor density so equipment and attention are never scarce." },
  { n: "02", t: "Programming with intent", b: "Every plan is built around a measurable goal and tracked in the app." },
  { n: "03", t: "Detail you can feel", b: "Clean space, serious equipment and a team that remembers you." },
];

// PLACEHOLDER: no real testimonials exist yet. Never present these as genuine.
export const testimonials = [
  { quote: "Sample testimonial: replace with a real member review.", who: "Sample Member" },
  { quote: "Sample testimonial: replace with a real member review.", who: "Sample Member" },
];

// PLACEHOLDER marquee / stats: replace with verified figures only.
export const marquee = ["Strength", "Conditioning", "Mobility", "Coaching", "Discipline", "Performance"];
export const stats = [
  { to: 24, suffix: "+", label: "Sample stat: years / members / coaches" },
  { to: 1200, suffix: "+", label: "Sample stat" },
  { to: 15, suffix: "", label: "Sample stat" },
  { to: 6, suffix: "", label: "Days open per week" },
];

export const facilityDetails = [
  { title: "Strength Floor", body: "Power racks, lifting platforms, dumbbells to heavy and plate-loaded machines laid out so nobody waits.", points: ["Free weights", "Platforms", "Plate-loaded machines"] },
  { title: "Cardio Studio", body: "Modern treadmills, cross-trainers and bikes in a ventilated, well-lit space.", points: ["Treadmills", "Cross-trainers", "Bikes"] },
  { title: "Functional Zone", body: "Open turf for sleds, kettlebells, battle ropes and athletic conditioning.", points: ["Turf lane", "Kettlebells", "Conditioning rigs"] },
  { title: "Personal Training", body: "One-to-one coaching with structured programming and tracked progress.", points: ["Assessment", "Custom program", "Progress tracking"] },
  { title: "Recovery & Mobility", body: "Stretching and mobility area for warm-ups and cool-downs.", points: ["Mats", "Foam rollers", "Mobility tools"] },
  { title: "Changing & Lockers", body: "Clean changing rooms and secure lockers.", points: ["Lockers", "Showers", "Water"] },
];

export const comparison = {
  head: ["Benefit", "Monthly", "Quarterly", "Half-Yearly", "Annual"],
  rows: [
    ["Full gym access", true, true, true, true],
    ["Locker", true, true, true, true],
    ["Member app & QR entry", true, true, true, true],
    ["Body assessment", false, true, true, true],
    ["Personal training sessions", "—", "—", "2", "4"],
    ["Diet guidance", false, false, true, true],
    ["Priority booking", false, false, false, true],
  ] as (string | boolean)[][],
};

export const gallery = [
  { cat: "Interior", label: "Main floor" }, { cat: "Equipment", label: "Racks" },
  { cat: "Training", label: "Coaching" }, { cat: "Events", label: "Challenge day" },
  { cat: "Interior", label: "Lobby" }, { cat: "Equipment", label: "Dumbbells" },
  { cat: "Transformations", label: "Member story" }, { cat: "Training", label: "Group session" },
  { cat: "Interior", label: "Cardio" }, { cat: "Events", label: "Community" },
  { cat: "Transformations", label: "Member story 2" }, { cat: "Equipment", label: "Machines" },
];
