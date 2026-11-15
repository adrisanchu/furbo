import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Grupos" };

export default function GroupsPage() {
  return <ComingSoon title="Grupos" body="Muy pronto podrás crear tu grupo, invitar a tu gente y unirte a grupos públicos." />;
}
