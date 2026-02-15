/**
 * Public API surface map.
 *
 * Re-exports every official API function grouped by domain.
 * Hooks in src/hooks/* should import from here (or from the domain file directly).
 * Components/pages must NEVER import from this file — use hooks instead.
 */

// --- Activity ---
export { listMyActivity, type ActivityFilters } from "./activity";

// --- Admin ---
export { runHealthChecks, logAdminAudit, type HealthCheck } from "./adminHealth";

// --- Borrow ---
export {
  createBorrowRequest,
  computeAndCreateOffers,
  listOrgBorrowRequests,
  listTalentBorrowOffers,
  acceptBorrowOffer,
  declineBorrowOffer,
  closeBorrowRequest,
} from "./borrow";

// --- Chat ---
export {
  getThreadByMatch,
  listMessages,
  sendMessage,
  subscribeToMessages,
  type Thread,
  type Message,
  type MessageWithSender,
} from "./chat";

// --- Circles ---
export {
  listCircleRequests,
  createCircleRequest,
  acceptCircleRequest,
  declineCircleRequest,
  listTrustedCircle,
  listCirclePartners,
  listMyCircles,
  getCircleMembers,
  createCircle,
  addCircleMember,
  removeCircleMember,
  getMyVisibility,
  updateMyVisibility,
  createReleaseOffer,
  listCircleReleaseOffers,
  takeReleaseOffer,
  cancelReleaseOffer,
  findAvailableTalentsScoped,
  getAvailableTalentCounts,
  listAllCircleMembersFlat,
  type TalentVisibilityScope,
  type BorrowScope,
  type CirclePartner,
  type CirclePartnerFlat,
} from "./circles";

// --- Dashboard ---
export { getTalentDashboardSummary, type TalentDashboardSummary } from "./dashboard";

// --- Demo ---
export { resetDemo, resetDemoForUser, listMyDemoOrgs, seedDemoScenario } from "./demo";

// --- Demo Guide ---
export type { DemoGuideSummary } from "./demoGuide";

// --- Demo Matches ---
export {
  listDemoMatchesForEmployer,
  getDemoThreadByMatch,
  listDemoMessages,
  sendDemoMessage,
  type DemoMatchDTO,
  type DemoThreadDTO,
  type DemoMessageDTO,
} from "./demoMatches";

// --- Demo Scheduler ---
export {
  listDemoBookings,
  listDemoReleaseOffers,
  type DemoBookingWithTalent,
  type DemoReleaseOfferDTO,
} from "./demoScheduler";

// --- Housing ---
export {
  listHousingListings,
  createHousingInquiry,
  listHostHousingThreads,
  listTalentHousingThreads,
  checkVerifiedTenant,
  listMyHostHousing,
  createHostHousingListing,
  updateHousingListingStatus,
  type HousingFilters,
  type HousingListing,
  type HousingThread,
  type CreateHousingPayload,
} from "./housing";

// --- Jobs ---
export {
  listUnswipedJobs,
  getJob,
  listOrgJobs,
  resetTalentDemoSwipes,
  listDemoJobsHard,
  listListings,
  listOrgListings,
  updateListingStatus,
  upsertTalentJobSwipe,
  type JobWithOrg,
  type JobFilters,
  type JobFetchResult,
  type ListingFilters,
  type ListingWithOrg,
  type ListingStatus,
} from "./jobs";

// --- Matches ---
export {
  listMyMatches,
  listOrgMatches,
  getMatch,
  getMatchByJobAndTalent,
  type MatchDTO,
} from "./matches";

// --- Notifications ---
export {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  subscribeToNotifications,
  type Notification,
  type NotificationFilters,
} from "./notifications";

// --- Offers ---
export {
  listTalentOffers,
  listOrgOffers,
  getOffer,
  createOfferDraft,
  sendOffer,
  respondOffer,
  withdrawOffer,
  updateOfferDraft,
  checkOfferConflict,
  getOfferErrorMessage,
  type CreateOfferPayload,
  type Offer,
  type OfferWithOrg,
  type OfferActionResult,
} from "./offers";

// --- Orgs ---
export {
  listMyOrgs,
  getDefaultOrgId,
  createOrg,
  type Org,
  type OrgMember,
  type OrgWithRole,
} from "./orgs";

// --- Profile ---
export {
  getMyProfile,
  ensureMyProfile,
  updateMyProfile,
  type Profile,
  type ProfileType,
  type ProfileUpdate,
} from "./profile";

// --- Ranking ---
export {
  scoreListingsForTalent,
  scoreCandidatesForJob,
  logListingInteraction,
  logCandidateInteraction,
  type ScoredListing,
  type ScoredCandidate,
} from "./ranking";

// --- Scheduler ---
export {
  listOrgBookings,
  listBusyBlocksForTalentIds,
  createBooking,
  type ShiftBooking,
  type ShiftBookingWithTalent,
  type BusyBlock,
} from "./scheduler";

// --- Talent ---
export {
  listTalentsForJob,
  listDemoTalentsHard,
  upsertEmployerTalentSwipe,
  type CandidateCardDTO,
} from "./talent";

// --- Visibility ---
export {
  getVisibilitySummary,
  updateVisibility,
  type VisibilitySummary,
} from "./visibility";
