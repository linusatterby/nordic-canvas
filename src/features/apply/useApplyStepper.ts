/**
 * Stepper state machine for the apply dialog.
 *
 * Steps: questions → documents → review
 */

import * as React from "react";

export type ApplyStep = "questions" | "documents" | "review";

const STEPS: ApplyStep[] = ["questions", "documents", "review"];

export interface ApplyDraft {
  answers: Record<string, string>;
  selectedDocumentIds: string[];
}

export function useApplyStepper() {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [draft, setDraft] = React.useState<ApplyDraft>({
    answers: {},
    selectedDocumentIds: [],
  });

  const currentStep = STEPS[stepIndex];
  const stepNumber = stepIndex + 1;
  const totalSteps = STEPS.length;

  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));
  const reset = () => {
    setStepIndex(0);
    setDraft({ answers: {}, selectedDocumentIds: [] });
  };

  const updateAnswers = (answers: Record<string, string>) =>
    setDraft((d) => ({ ...d, answers }));

  const toggleDocument = (id: string) =>
    setDraft((d) => ({
      ...d,
      selectedDocumentIds: d.selectedDocumentIds.includes(id)
        ? d.selectedDocumentIds.filter((x) => x !== id)
        : [...d.selectedDocumentIds, id],
    }));

  const setSelectedDocuments = (ids: string[]) =>
    setDraft((d) => ({ ...d, selectedDocumentIds: ids }));

  return {
    currentStep,
    stepNumber,
    totalSteps,
    draft,
    next,
    back,
    reset,
    updateAnswers,
    toggleDocument,
    setSelectedDocuments,
  };
}
