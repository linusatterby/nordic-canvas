/**
 * Hooks for the candidate ↔ job state machine.
 *
 * Provides:
 *   useJobState(jobId)        – current state for a single job
 *   useSavedJobs()            – list of saved jobs
 *   useCandidateApplications() – list of submitted applications
 *   useSaveJob()              – mutation: SAVE
 *   useUnsaveJob()            – mutation: UNSAVE
 *   useDismissJob()           – mutation: DISMISS
 *   useSubmitApplication()    – mutation: SUBMIT
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  getCandidateJobState,
  listSavedJobs,
  listCandidateApplications,
  saveJob,
  unsaveJob,
  dismissJob,
  submitApplication,
  type ApplicationPayload,
} from "@/lib/api/candidateJobState";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useJobState(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.jobs.state(jobId),
    queryFn: () => getCandidateJobState(jobId!),
    enabled: !!jobId,
    staleTime: 30_000,
  });
}

export function useSavedJobs() {
  return useQuery({
    queryKey: queryKeys.jobs.saved(),
    queryFn: async () => {
      const { jobs, error } = await listSavedJobs();
      if (error) throw error;
      return jobs;
    },
  });
}

export function useCandidateApplications() {
  return useQuery({
    queryKey: queryKeys.jobs.applications(),
    queryFn: async () => {
      const { applications, error } = await listCandidateApplications();
      if (error) throw error;
      return applications;
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useSaveJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await saveJob(jobId);
      if (error) throw error;
    },
    onSettled: (_d, _e, jobId) => {
      qc.invalidateQueries({ queryKey: queryKeys.jobs.state(jobId) });
      qc.invalidateQueries({ queryKey: queryKeys.jobs.saved() });
    },
  });
}

export function useUnsaveJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await unsaveJob(jobId);
      if (error) throw error;
    },
    onSettled: (_d, _e, jobId) => {
      qc.invalidateQueries({ queryKey: queryKeys.jobs.state(jobId) });
      qc.invalidateQueries({ queryKey: queryKeys.jobs.saved() });
    },
  });
}

export function useDismissJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await dismissJob(jobId);
      if (error) throw error;
    },
    onSettled: (_d, _e, jobId) => {
      qc.invalidateQueries({ queryKey: queryKeys.jobs.state(jobId) });
    },
  });
}

export function useSubmitApplication() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, payload }: { jobId: string; payload: ApplicationPayload }) => {
      const { error } = await submitApplication(jobId, payload);
      if (error) throw error;
    },
    onSettled: (_d, _e, { jobId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.jobs.state(jobId) });
      qc.invalidateQueries({ queryKey: queryKeys.jobs.saved() });
      qc.invalidateQueries({ queryKey: queryKeys.jobs.applications() });
    },
  });
}
