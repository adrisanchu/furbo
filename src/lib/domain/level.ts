/** Player level (PRD §5.5): visible scale 1.0–10.0 with one decimal. */

export const MIN_RATING = 1;
export const MAX_RATING = 10;
export const MAX_ADJUSTMENT = 1;
export const PROVISIONAL_MATCHES = 5;

export type Question = { tag: string; short: string; text: string; options: [string, string, string, string] };

/** Five questions, four answers each (0 = lowest, 3 = highest). */
export const SELF_ASSESSMENT: readonly Question[] = [
  {
    tag: "Experiencia",
    short: "Experiencia",
    text: "¿Cuánto tiempo llevas jugando al fútbol?",
    options: ["Estoy empezando", "Jugué de pequeño/a", "Varios años en pachangas", "He jugado federado"],
  },
  {
    tag: "Frecuencia",
    short: "Frecuencia",
    text: "¿Con qué frecuencia juegas?",
    options: ["Menos de una vez al mes", "Un par de veces al mes", "Una vez por semana", "Varias veces por semana"],
  },
  {
    tag: "Condición física",
    short: "Físico",
    text: "¿Cómo aguantas un partido de una hora?",
    options: ["Me cuesta bastante", "Aguanto con descansos", "Aguanto bien todo el partido", "Podría jugar otro"],
  },
  {
    tag: "Técnica",
    short: "Técnica",
    text: "¿Qué tal te manejas con el balón?",
    options: [
      "Controlo lo justo",
      "Paso y controlo con seguridad",
      "Regateo y golpeo con las dos piernas",
      "Domino casi cualquier gesto",
    ],
  },
  {
    tag: "Táctica",
    short: "Táctica",
    text: "¿Cómo te mueves en el campo?",
    options: ["Sigo el balón", "Conozco mi posición", "Leo el juego y ayudo a ordenar", "Organizo al equipo"],
  },
] as const;

export function roundRating(value: number): number {
  return Math.round(value * 10) / 10;
}

export function clampRating(value: number): number {
  return Math.min(MAX_RATING, Math.max(MIN_RATING, value));
}

export function isValidAnswers(answers: unknown): answers is number[] {
  return (
    Array.isArray(answers) &&
    answers.length === SELF_ASSESSMENT.length &&
    answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 3)
  );
}

/**
 * Maps the 5 answers (0–3 each, total 0–15) linearly onto 1.5–9.0.
 * Self-assessments can't reach the extremes: the last stretch is earned
 * by playing. All middle answers (2) → 6.5.
 */
export function suggestRating(answers: number[]): number {
  if (!isValidAnswers(answers)) throw new Error("Invalid self-assessment answers");
  const total = answers.reduce((a, b) => a + b, 0);
  return roundRating(1.5 + (total / 15) * 7.5);
}

/** The player may move the suggestion by ±1.0, always inside 1.0–10.0. */
export function applyAdjustment(suggested: number, adjustment: number): number {
  const adj = Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, adjustment));
  return roundRating(clampRating(suggested + adj));
}

export function formatLevel(rating: number | null | undefined): string {
  return rating == null ? "–" : rating.toFixed(1);
}
