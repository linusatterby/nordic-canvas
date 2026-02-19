/**
 * Candidate ↔ Job state machine API layer.
 *
 * States: NONE → DISMISSED | SAVED | APPLYING → APPLIED
 *
 * Persistence:
 *   saved_jobs      – SAVED
 *   job_dismissals  – DISMISSED
 *   applications    – APPLIED (+ APPLYING drafts via status='draft')
 *
 * Hard guard: demo_session_id is attached when IS_LIVE_BACKEND is false.
 */

import { supabase } from "@/integrations/supabase/client";
import { IS_LIVE_BACKEND } from "@/lib/config/runtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CandidateJobStatus =
  | "none"
  | "dismissed"
  | "saved"
  | "applying"
  | "applied";

export interface CandidateJobState {
  jobId: string;
  status: CandidateJobStatus;
  savedAt?: string;
  dismissedAt?: string;
  appliedAt?: string;
  applicationId?: string;
}

export interface ApplicationPayload {
  /** IDs of selected credentials/documents */
  documentIds?: string[];
  /** Freeform answers keyed by question id */
  answers?: Record<string, string>;
  /** Profile snapshot reference (user_id is implicit) */
  profileSnapshotRef?: string;
  /** Any extra data */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

/** Returns demo_session_id when NOT live, null otherwise */
async function demoSessionId(): Promise<string | null> {
  if (IS_LIVE_BACKEND) return null;
  // Retrieve from local storage / context – demo sessions are stored client-side
  try {
    const raw = localStorage.getItem("demo_session_id");
    return raw || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// READ: Get state for a single job
// ---------------------------------------------------------------------------

export async function getCandidateJobState(jobId: string): Promise<CandidateJobState> {
  const uid = await currentUserId();

  // Check all three tables in parallel
  const [savedRes, dismissedRes, appRes] = await Promise.all([
    supabase
      .from("saved_jobs")
      .select("created_at")
      .eq("candidate_id", uid)
      .eq("job_id", jobId)
      .maybeSingle(),
    supabase
      .from("job_dismissals")
      .select("dismissed_at")
      .eq("candidate_id", uid)
      .eq("job_id", jobId)
      .maybeSingle(),
    supabase
      .from("applications")
      .select("id, status, created_at")
      .eq("candidate_id", uid)
      .eq("job_id", jobId)
      .maybeSingle(),
  ]);

  if (appRes.data) {
    const s = appRes.data.status === "draft" ? "applying" : "applied";
    return {
      jobId,
      status: s as CandidateJobStatus,
      appliedAt: appRes.data.created_at,
      applicationId: appRes.data.id,
    };
  }
  if (savedRes.data) {
    return { jobId, status: "saved", savedAt: savedRes.data.created_at };
  }
  if (dismissedRes.data) {
    return { jobId, status: "dismissed", dismissedAt: dismissedRes.data.dismissed_at };
  }
  return { jobId, status: "none" };
}

// ---------------------------------------------------------------------------
// READ: List saved jobs for candidate
// ---------------------------------------------------------------------------

export async function listSavedJobs(): Promise<{
  jobs: Array<{
    id: string;
    job_id: string;
    created_at: string;
    job_title: string;
    org_name: string;
    location: string | null;
    start_date: string;
    end_date: string;
  }>;
  error: Error | null;
}> {
  const uid = await currentUserId();

  const { data, error } = await supabase
    .from("saved_jobs")
    .select(`
      id,
      job_id,
      created_at,
      job_posts!saved_jobs_job_id_fkey (
        title,
        location,
        start_date,
        end_date,
        orgs!job_posts_org_id_fkey ( name )
      )
    `)
    .eq("candidate_id", uid)
    .order("created_at", { ascending: false });

  if (error) return { jobs: [], error: new Error(error.message) };

  const jobs = (data ?? []).map((row: any) => ({
    id: row.id,
    job_id: row.job_id,
    created_at: row.created_at,
    job_title: row.job_posts?.title ?? "—",
    org_name: row.job_posts?.orgs?.name ?? "Okänd",
    location: row.job_posts?.location ?? null,
    start_date: row.job_posts?.start_date ?? "",
    end_date: row.job_posts?.end_date ?? "",
  }));

  return { jobs, error: null };
}

// ---------------------------------------------------------------------------
// READ: List applications (for candidate)
// ---------------------------------------------------------------------------

export async function listCandidateApplications(): Promise<{
  applications: Array<{
    id: string;
    job_id: string;
    status: string;
    created_at: string;
    job_title: string;
    org_name: string;
  }>;
  error: Error | null;
}> {
  const uid = await currentUserId();

  const { data, error } = await supabase
    .from("applications")
    .select(`
      id,
      job_id,
      status,
      created_at,
      job_posts!applications_job_id_fkey (
        title,
        orgs!job_posts_org_id_fkey ( name )
      )
    `)
    .eq("candidate_id", uid)
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  if (error) return { applications: [], error: new Error(error.message) };

  const applications = (data ?? []).map((row: any) => ({
    id: row.id,
    job_id: row.job_id,
    status: row.status,
    created_at: row.created_at,
    job_title: row.job_posts?.title ?? "—",
    org_name: row.job_posts?.orgs?.name ?? "Okänd",
  }));

  return { applications, error: null };
}

// ---------------------------------------------------------------------------
// READ: List applications for employer (only APPLIED / submitted)
// ---------------------------------------------------------------------------

export async function listJobApplications(jobId: string): Promise<{
  applications: Array<{
    id: string;
    candidate_id: string;
    status: string;
    payload: ApplicationPayload;
    created_at: string;
  }>;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("applications")
    .select("id, candidate_id, status, payload, created_at")
    .eq("job_id", jobId)
    .eq("status", "submitted")
    .order("created_at", { ascending: false });

  if (error) return { applications: [], error: new Error(error.message) };
  return { applications: (data ?? []) as any[], error: null };
}

// ---------------------------------------------------------------------------
// WRITE: SAVE a job (NONE/DISMISSED → SAVED)
// ---------------------------------------------------------------------------

export async function saveJob(jobId: string): Promise<{ error: Error | null }> {
  const uid = await currentUserId();
  const dsId = await demoSessionId();

  // Remove any dismissal first
  await supabase
    .from("job_dismissals")
    .delete()
    .eq("candidate_id", uid)
    .eq("job_id", jobId);

  const { error } = await supabase
    .from("saved_jobs")
    .upsert(
      { candidate_id: uid, job_id: jobId, demo_session_id: dsId },
      { onConflict: "candidate_id,job_id" }
    );

  return { error: error ? new Error(error.message) : null };
}

// ---------------------------------------------------------------------------
// WRITE: UNSAVE a job (SAVED → NONE)
// ---------------------------------------------------------------------------

export async function unsaveJob(jobId: string): Promise<{ error: Error | null }> {
  const uid = await currentUserId();

  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("candidate_id", uid)
    .eq("job_id", jobId);

  return { error: error ? new Error(error.message) : null };
}

// ---------------------------------------------------------------------------
// WRITE: DISMISS a job (NONE → DISMISSED)
// ---------------------------------------------------------------------------

export async function dismissJob(jobId: string): Promise<{ error: Error | null }> {
  const uid = await currentUserId();
  const dsId = await demoSessionId();

  const { error } = await supabase
    .from("job_dismissals")
    .upsert(
      { candidate_id: uid, job_id: jobId, demo_session_id: dsId },
      { onConflict: "candidate_id,job_id" }
    );

  return { error: error ? new Error(error.message) : null };
}

// ---------------------------------------------------------------------------
// WRITE: START_APPLY (create draft application)
// ---------------------------------------------------------------------------

export async function startApplication(
  jobId: string,
  payload?: ApplicationPayload
): Promise<{ applicationId: string | null; error: Error | null }> {
  const uid = await currentUserId();
  const dsId = await demoSessionId();

  const { data, error } = await supabase
    .from("applications")
    .upsert(
      {
        candidate_id: uid,
        job_id: jobId,
        status: "draft",
        payload: (payload ?? {}) as any,
        demo_session_id: dsId,
      },
      { onConflict: "candidate_id,job_id" }
    )
    .select("id")
    .single();

  return {
    applicationId: data?.id ?? null,
    error: error ? new Error(error.message) : null,
  };
}

// ---------------------------------------------------------------------------
// WRITE: SUBMIT_APPLICATION (draft → submitted)
// ---------------------------------------------------------------------------

export async function submitApplication(
  jobId: string,
  payload: ApplicationPayload
): Promise<{ error: Error | null }> {
  const uid = await currentUserId();
  const dsId = await demoSessionId();

  // Upsert to handle both fresh submit and draft→submitted
  const { error } = await supabase
    .from("applications")
    .upsert(
      {
        candidate_id: uid,
        job_id: jobId,
        status: "submitted",
        payload: payload as any,
        demo_session_id: dsId,
      },
      { onConflict: "candidate_id,job_id" }
    );

  // Remove from saved_jobs if it was saved
  await supabase
    .from("saved_jobs")
    .delete()
    .eq("candidate_id", uid)
    .eq("job_id", jobId);

  return { error: error ? new Error(error.message) : null };
}

// ---------------------------------------------------------------------------
// WRITE: SAVE_INSTEAD (APPLYING → SAVED, remove draft)
// ---------------------------------------------------------------------------

export async function saveInsteadOfApply(jobId: string): Promise<{ error: Error | null }> {
  const uid = await currentUserId();

  // Delete draft application
  await supabase
    .from("applications")
    .delete()
    .eq("candidate_id", uid)
    .eq("job_id", jobId)
    .eq("status", "draft");

  // Save the job
  return saveJob(jobId);
}
