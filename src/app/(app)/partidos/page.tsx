import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Partidos" };

export default function MatchesPage() {
  return (
    <ComingSoon
      title="Partidos"
      body="Aquí verás los partidos de tus grupos: apúntate, consulta las plazas y lo que te toca pagar."
    />
  );
}
