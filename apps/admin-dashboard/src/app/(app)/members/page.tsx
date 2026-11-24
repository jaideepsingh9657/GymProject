import { Suspense } from "react";
import MembersView from "./MembersView";

export const metadata = { title: "Members" };

export default function MembersPage() {
  return <Suspense fallback={null}><MembersView /></Suspense>;
}
