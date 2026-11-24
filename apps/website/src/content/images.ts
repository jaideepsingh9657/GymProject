// Temporary stock photos (Unsplash License, free to use). Replace with the
// gym's own photography: change the URL here or point `src` at /public/images.
const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=75&w=1400`;

export const stock: Record<string, string> = {
  // facilities
  "Strength Floor": u("1623874514711-0f321325f318"),
  "Cardio Studio": u("1767531309781-b61fe1edfe86"),
  "Functional Zone": u("1758875570600-8daf8d2f05f3"),
  "Personal Training": u("1758875570185-eaed16371474"),
  "Recovery & Mobility": u("1771270786606-f5a0e57db762"),
  "Changing & Lockers": u("1637430308606-86576d8fef3c"),
  // about
  "Club interior": u("1778828494354-9b717d36dc99"),
  // trainers
  trainer0: u("1605296867304-46d5465a13f1"),
  trainer1: u("1574680096145-d05b474e2155"),
  trainer2: u("1758875569334-27579a49ed0b"),
  // gallery (seed gal0..gal11)
  gal0: u("1778828494354-9b717d36dc99"),
  gal1: u("1521805103424-d8f8430e8933"),
  gal2: u("1758875570185-eaed16371474"),
  gal3: u("1674834727149-00812f907676"),
  gal4: u("1689877020200-403d8542d95d"),
  gal5: u("1517838277536-f5f99be501cd"),
  gal6: u("1541534741688-6078c6bfb5c5"),
  gal7: u("1758875570600-8daf8d2f05f3"),
  gal8: u("1593079831268-3381b0db4a77"),
  gal9: u("1597076537061-a6b58163aa45"),
  gal10: u("1574680096145-d05b474e2155"),
  gal11: u("1637430308606-86576d8fef3c"),
  // home instagram strip
  "Gallery 1": u("1623874514711-0f321325f318"),
  "Gallery 2": u("1605296867304-46d5465a13f1"),
  "Gallery 3": u("1758875570600-8daf8d2f05f3"),
  "Gallery 4": u("1767531309781-b61fe1edfe86"),
};
