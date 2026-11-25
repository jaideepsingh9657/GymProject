import { notFound } from "next/navigation";
import { Empty } from "@/components/ui";

const SECTIONS = ["attendance", "enquiries", "trainers", "reports", "settings"];

export default async function Soon({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SECTIONS.includes(section)) notFound();
  return <div className="panel"><Empty title={`${section[0].toUpperCase()}${section.slice(1)} is coming soon`} body="This screen is designed but not built yet. Today, Members, Memberships and Payments are live." /></div>;
}
