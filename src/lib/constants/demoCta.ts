/**
 * Single source of truth for demo CTA configurations.
 * Role, label, and destination are co-located so they cannot drift.
 */
export interface DemoCtaConfig {
  role: "talent" | "employer";
  label: string;
  loadingLabel: string;
  pathPrefix: string;
}

export const TALENT_DEMO_CTA: DemoCtaConfig = {
  role: "talent",
  label: "Testa demo som kandidat",
  loadingLabel: "Startar…",
  pathPrefix: "/talent",
} as const;

export const EMPLOYER_DEMO_CTA: DemoCtaConfig = {
  role: "employer",
  label: "Testa demo som arbetsgivare",
  loadingLabel: "Startar…",
  pathPrefix: "/employer",
} as const;

/** All demo CTAs for iteration / testing */
export const DEMO_CTAS = [TALENT_DEMO_CTA, EMPLOYER_DEMO_CTA] as const;
