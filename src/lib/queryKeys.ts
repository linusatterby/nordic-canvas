/**
 * Centralized React Query key factories.
 *
 * Every useQuery / useMutation in src/hooks/* MUST reference keys from here.
 * Keys are readonly tuples so typos become compile errors.
 *
 * Convention:
 *   queryKeys.<domain>.all        → prefix for invalidateQueries({ queryKey: ... })
 *   queryKeys.<domain>.list(…)    → list queries
 *   queryKeys.<domain>.detail(id) → single-entity queries
 */

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function stableHash(obj: unknown): string {
  if (obj === undefined || obj === null) return "nil";
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
}

// ---------------------------------------------------------------------------
// keys
// ---------------------------------------------------------------------------

export const queryKeys = {
  // --- Activity ---
  activity: {
    all: ["activity"] as const,
    list: (role: string, orgId?: string, filters?: unknown) =>
      ["activity", role, orgId, filters] as const,
  },

  // --- Admin ---
  admin: {
    all: ["admin"] as const,
    healthchecks: () => ["admin", "healthchecks"] as const,
  },

  // --- Borrow ---
  borrow: {
    all: ["borrow"] as const,
    requests: (orgId?: string) => ["borrow", "requests", orgId] as const,
    talentOffers: () => ["borrow", "offers", "talent"] as const,
  },

  // --- Chat / Messages ---
  chat: {
    all: ["chat"] as const,
    thread: (matchId?: string) => ["thread", matchId] as const,
    messages: (threadId?: string) => ["messages", threadId] as const,
    demoThread: (matchId?: string) => ["demoThread", "byMatch", matchId] as const,
    demoMessages: (threadId?: string) => ["demoMessages", threadId] as const,
  },

  // --- Circles ---
  circles: {
    all: ["circles"] as const,
    requests: (orgId?: string) => ["circleRequests", orgId] as const,
    allPartnersFlat: (orgId?: string) => ["allCirclePartnersFlat", orgId] as const,
    partners: (orgId?: string) => ["circlePartners", orgId] as const,
    trusted: (orgId?: string) => ["trustedCircle", orgId] as const,
    myCircles: (orgId?: string) => ["myCircles", orgId] as const,
    members: (circleId?: string) => ["circleMembers", circleId] as const,
    myVisibility: () => ["myVisibility"] as const,
    releaseOffers: (orgId?: string) => ["releaseOffers", orgId] as const,
    availableTalents: (location: string, startTs: string, endTs: string, scope: string, orgId?: string) =>
      ["availableTalents", location, startTs, endTs, scope, orgId] as const,
    talentCounts: (location: string, startTs: string, endTs: string, orgId?: string, circleId?: string) =>
      ["talentCounts", location, startTs, endTs, orgId, circleId] as const,
  },

  // --- Dashboard ---
  dashboard: {
    all: ["dashboard"] as const,
    talentSummary: () => ["talentDashboardSummary"] as const,
  },

  // --- Demo ---
  demo: {
    orgs: () => ["demoOrgs"] as const,
    matches: (orgId?: string) => ["demoMatches", orgId] as const,
    bookings: (orgId?: string, start?: string, end?: string) =>
      ["demoBookings", orgId, start, end] as const,
    releaseOffers: (orgId?: string, start?: string, end?: string) =>
      ["demoReleaseOffers", orgId, start, end] as const,
    guideSummary: (role: string, orgId?: string | null, userId?: string | null) =>
      ["demoGuideSummaryAdditional", role, orgId, userId] as const,
  },

  // --- Housing ---
  housing: {
    all: ["housing"] as const,
    listings: (filters?: unknown, isDemoMode?: boolean) =>
      ["housing", "listings", filters, isDemoMode] as const,
    verifiedTenant: () => ["verified-tenant"] as const,
    threads: (role: "host" | "talent") => ["housing", "threads", role] as const,
    myListings: () => ["housing", "my-listings"] as const,
  },

  // --- Jobs ---
  jobs: {
    all: ["jobs"] as const,
    unswiped: (filters?: unknown, isDemoMode?: boolean) =>
      ["jobs", "unswiped", filters, isDemoMode] as const,
    detail: (jobId?: string) => ["job", jobId] as const,
    org: (orgId?: string, status?: string) => ["jobs", "org", orgId, status] as const,
    demoHard: () => ["jobs", "demo-hard"] as const,
  },

  // --- Listings (unified) ---
  listings: {
    all: ["listings"] as const,
    list: (filters?: string, isDemoMode?: boolean) =>
      ["listings", filters, isDemoMode] as const,
  },

  // --- Matches ---
  matches: {
    all: ["matches"] as const,
    list: (role: string, orgId?: string | null) => ["matches", role, orgId] as const,
    detail: (matchId?: string) => ["match", matchId] as const,
    check: (jobId?: string, talentUserId?: string) =>
      ["checkMatch", jobId, talentUserId] as const,
    orgMatches: () => ["orgMatches"] as const,
  },

  // --- Notifications ---
  notifications: {
    all: ["notifications"] as const,
    list: (filters?: unknown) => ["notifications", filters] as const,
    unreadCount: () => ["notifications-unread-count"] as const,
  },

  // --- Offers ---
  offers: {
    all: ["offers"] as const,
    talent: () => ["offers", "talent"] as const,
    org: (orgId?: string) => ["offers", "org", orgId] as const,
    detail: (offerId?: string) => ["offers", "detail", offerId] as const,
  },

  // --- Orgs ---
  orgs: {
    all: ["orgs"] as const,
    my: () => ["myOrgs"] as const,
    defaultId: () => ["defaultOrgId"] as const,
  },

  // --- Ranking ---
  ranking: {
    all: ["ranking"] as const,
    listings: (talentUserId?: string, idsHash?: string) =>
      ["ranking", "listings", talentUserId, idsHash] as const,
    candidates: (orgId?: string, jobPostId?: string, idsHash?: string) =>
      ["ranking", "candidates", orgId, jobPostId, idsHash] as const,
  },

  // --- Scheduler ---
  scheduler: {
    all: ["scheduler"] as const,
    bookings: (orgId?: string, start?: string, end?: string) =>
      ["scheduler", "bookings", orgId, start, end] as const,
  },

  // --- Talent Feed ---
  talentFeed: {
    all: ["talentFeed"] as const,
    list: (jobId?: string, orgId?: string) => ["talentFeed", jobId, orgId] as const,
    hardDemo: (orgId?: string, jobId?: string) =>
      ["talentFeed", "hard", "demo", orgId, jobId] as const,
  },

  // --- Visibility ---
  visibility: {
    summary: () => ["visibilitySummary"] as const,
  },

  // --- Credentials ---
  credentials: {
    all: ["credentials"] as const,
    mine: () => ["credentials", "mine"] as const,
  },

  // --- Job Preferences ---
  jobPreferences: {
    all: ["jobPreferences"] as const,
    mine: () => ["jobPreferences", "mine"] as const,
  },
} as const;
