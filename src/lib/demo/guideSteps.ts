import type { DemoGuideSummary } from "@/lib/api/demoGuide";

export interface GuideStep {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  icon: "swipe" | "match" | "chat" | "borrow" | "schedule" | "release" | "profile";
  isComplete: (ctx: DemoGuideSummary) => boolean;
}

const EMPLOYER_STEPS: GuideStep[] = [
  {
    id: "employer-swipe",
    title: "Swipea kandidater",
    description: "Hitta och matcha kandidater för dina jobb",
    ctaLabel: "Börja swipea",
    href: "/employer/jobs",
    icon: "swipe",
    isComplete: (ctx) => ctx.hasSwiped,
  },
  {
    id: "employer-match",
    title: "Öppna en matchning",
    description: "Visa matchade kandidater och påbörja kontakt",
    ctaLabel: "Se matchningar",
    href: "/employer/matches",
    icon: "match",
    isComplete: (ctx) => ctx.hasMatchThread,
  },
  {
    id: "employer-chat",
    title: "Skicka ett meddelande",
    description: "Chatta med matchade kandidater",
    ctaLabel: "Öppna chatt",
    href: "/employer/matches",
    icon: "chat",
    isComplete: (ctx) => ctx.hasSentMessage,
  },
  {
    id: "employer-borrow",
    title: "Skapa en Borrow-förfrågan",
    description: "Låna personal från andra organisationer",
    ctaLabel: "Skicka Borrow",
    href: "/employer/borrow",
    icon: "borrow",
    isComplete: (ctx) => ctx.hasBorrowRequest,
  },
  {
    id: "employer-schedule",
    title: "Se schemat",
    description: "Visa bokade pass och busy blocks",
    ctaLabel: "Öppna schema",
    href: "/employer/scheduler",
    icon: "schedule",
    isComplete: (ctx) => ctx.hasBooking,
  },
  {
    id: "employer-release",
    title: "Skapa en Release",
    description: "Släpp ett pass till ditt nätverk",
    ctaLabel: "Hantera releases",
    href: "/employer/scheduler",
    icon: "release",
    isComplete: (ctx) => ctx.hasReleaseOffer,
  },
];

const TALENT_STEPS: GuideStep[] = [
  {
    id: "talent-swipe",
    title: "Swipea jobb",
    description: "Hitta säsongsjobb som passar dig",
    ctaLabel: "Börja swipea",
    href: "/talent/swipe-jobs",
    icon: "swipe",
    isComplete: (ctx) => ctx.hasSwiped,
  },
  {
    id: "talent-match",
    title: "Öppna en matchning",
    description: "Se jobb du matchat med",
    ctaLabel: "Se matchningar",
    href: "/talent/matches",
    icon: "match",
    isComplete: (ctx) => ctx.hasMatchThread,
  },
  {
    id: "talent-chat",
    title: "Skicka ett meddelande",
    description: "Chatta med arbetsgivare",
    ctaLabel: "Öppna chatt",
    href: "/talent/matches",
    icon: "chat",
    isComplete: (ctx) => ctx.hasSentMessage,
  },
  {
    id: "talent-borrow",
    title: "Svara på Borrow",
    description: "Hantera inkommande förfrågningar",
    ctaLabel: "Se förfrågningar",
    href: "/talent/dashboard",
    icon: "borrow",
    isComplete: (ctx) => ctx.hasBorrowOffer,
  },
  {
    id: "talent-profile",
    title: "Uppdatera din profil",
    description: "Lägg till tillgänglighet och badges",
    ctaLabel: "Redigera profil",
    href: "/talent/profile",
    icon: "profile",
    isComplete: (ctx) => ctx.hasUpdatedProfile,
  },
];

export function getGuideSteps(role: "employer" | "talent"): GuideStep[] {
  return role === "employer" ? EMPLOYER_STEPS : TALENT_STEPS;
}

export function getCompletedCount(steps: GuideStep[], ctx: DemoGuideSummary): number {
  return steps.filter((step) => step.isComplete(ctx)).length;
}
