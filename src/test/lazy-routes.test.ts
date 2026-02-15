/**
 * Verify that all public routes in routeConfig use React.lazy wrappers,
 * ensuring code-splitting is maintained for initial load performance.
 */
import { describe, it, expect } from "vitest";
import { routes } from "@/app/routes/routeConfig";

describe("Route lazy-loading", () => {
  const publicRoutes = routes.filter(
    (r) => r.kind === "public" && r.path !== "*"
  );

  it("has at least one public route", () => {
    expect(publicRoutes.length).toBeGreaterThan(0);
  });

  it.each(publicRoutes.map((r) => [r.id, r]))(
    "public route '%s' uses React.lazy ($$typeof = Symbol.for('react.lazy'))",
    (_id, route) => {
      const el = route.element as any;
      // React.lazy components have $$typeof === Symbol.for('react.lazy')
      expect(el.$$typeof).toBe(Symbol.for("react.lazy"));
    }
  );

  it("protected routes are NOT lazy (eager-loaded)", () => {
    const appRoutes = routes.filter((r) => r.kind === "app");
    expect(appRoutes.length).toBeGreaterThan(0);
    for (const r of appRoutes) {
      const el = r.element as any;
      // Eager components are plain functions, not lazy wrappers
      expect(el.$$typeof).not.toBe(Symbol.for("react.lazy"));
    }
  });
});
