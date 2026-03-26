import { describe, it, expect } from "vitest";

describe("Onboarding contracts", () => {
  it("API exports expected functions", async () => {
    const api = await import("@/lib/api/onboarding");
    expect(typeof api.createOnboardingItem).toBe("function");
    expect(typeof api.listOnboardingForOrg).toBe("function");
    expect(typeof api.listOnboardingForUser).toBe("function");
    expect(typeof api.listProgressForUser).toBe("function");
    expect(typeof api.markOnboardingComplete).toBe("function");
  });

  it("hooks export expected functions", async () => {
    const hooks = await import("@/hooks/useOnboarding");
    expect(typeof hooks.useOnboardingItems).toBe("function");
    expect(typeof hooks.useOnboardingForUser).toBe("function");
    expect(typeof hooks.useOnboardingProgress).toBe("function");
    expect(typeof hooks.useCreateOnboardingItem).toBe("function");
    expect(typeof hooks.useCompleteOnboarding).toBe("function");
  });

  it("queryKeys contains onboarding keys", async () => {
    const { queryKeys } = await import("@/lib/queryKeys");
    expect(queryKeys.onboarding).toBeDefined();
    expect(queryKeys.onboarding.items("org1")).toEqual(["onboarding", "items", "org1"]);
    expect(queryKeys.onboarding.userItems("org1")).toEqual(["onboarding", "userItems", "org1"]);
    expect(queryKeys.onboarding.progress("org1")).toEqual(["onboarding", "progress", "org1"]);
  });

  it("labels contain onboarding keys", async () => {
    const { LABELS } = await import("@/config/labels");
    expect(LABELS.onboardingTitle).toBe("Introduktion");
    expect(LABELS.onboardingNewItem).toBe("Lägg till innehåll");
    expect(LABELS.onboardingMarkComplete).toBe("Markera som klar");
    expect(LABELS.onboardingCompleted).toBe("Klar");
    expect(LABELS.onboardingNotStarted).toBe("Ej påbörjad");
    expect(LABELS.onboardingTargetAll).toBe("Alla anställda");
    expect(LABELS.onboardingTargetGroups).toBe("Grupper");
  });

  it("routeConfig includes onboarding routes", async () => {
    const { routes } = await import("@/app/routes/routeConfig");
    const ids = routes.map((r) => r.id);
    expect(ids).toContain("employer-onboarding");
    expect(ids).toContain("talent-onboarding");

    const employerRoute = routes.find((r) => r.id === "employer-onboarding");
    expect(employerRoute?.path).toBe("/employer/onboarding");

    const talentRoute = routes.find((r) => r.id === "talent-onboarding");
    expect(talentRoute?.path).toBe("/talent/onboarding");
  });
});
