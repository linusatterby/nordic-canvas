import { useEffect } from "react";
import { toast } from "sonner";
import { useDemoMode } from "./useDemo";

type ToastKey =
  | "swipe-talent"
  | "swipe-jobs"
  | "scheduler"
  | "borrow"
  | "matches"
  | "chat";

const TOAST_MESSAGES: Record<ToastKey, { title: string; description: string }> = {
  "swipe-talent": {
    title: "Tips: Swipea talanger",
    description: "Tryck JA på två kort för att skapa en match och öppna chatten.",
  },
  "swipe-jobs": {
    title: "Tips: Swipea jobb",
    description: "Tryck JA på jobb du gillar – arbetsgivaren får en notis!",
  },
  scheduler: {
    title: "Tips: Schema",
    description: "Boka pass och se hur busy blocks förhindrar dubbelbokning.",
  },
  borrow: {
    title: "Tips: Borrow",
    description: "Skicka en request, byt sedan till talang och acceptera.",
  },
  matches: {
    title: "Tips: Matches",
    description: "Klicka på en match för att öppna chatten.",
  },
  chat: {
    title: "Tips: Chatt",
    description: "Skicka meddelanden för att koordinera detaljer.",
  },
};

/**
 * Show a one-time coach toast for demo mode users
 * Only shows once per key per session
 */
export function useDemoCoachToast(key: ToastKey) {
  const { isDemoMode } = useDemoMode();

  useEffect(() => {
    if (!isDemoMode) return;

    const storageKey = `demoToast_${key}`;
    const alreadyShown = sessionStorage.getItem(storageKey);

    if (alreadyShown) return;

    const message = TOAST_MESSAGES[key];
    if (!message) return;

    // Delay to let the page render first
    const timer = setTimeout(() => {
      toast.info(message.title, {
        description: message.description,
        duration: 6000,
      });
      sessionStorage.setItem(storageKey, "true");
    }, 800);

    return () => clearTimeout(timer);
  }, [isDemoMode, key]);
}
