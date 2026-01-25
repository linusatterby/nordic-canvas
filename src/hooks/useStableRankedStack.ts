import * as React from "react";
import { DEMO_DEBUG_ENABLED } from "@/lib/utils/debug";

/**
 * Score data structure for ranked items
 */
export interface ScoreData {
  score: number;
  reasons?: Array<{ key: string; label: string; impact: number }>;
}

/**
 * Parameters for useStableRankedStack hook
 */
export interface UseStableRankedStackParams<T extends { id: string }> {
  /** Raw items from feed (may update on refetch) */
  items: T[];
  /** Score map keyed by item id */
  scores?: Map<string, ScoreData>;
  /** Stable context key that triggers order rebuild when changed */
  contextKey: string;
  /** Optional custom score extractor */
  getScore?: (id: string) => number | undefined;
  /** Max items to rank (default 12) */
  topN?: number;
}

/**
 * Return type for useStableRankedStack hook
 */
export interface StableRankedStackResult<T> {
  /** Stable ordered items with scores attached */
  ordered: Array<T & { match_score?: number; match_reasons?: ScoreData["reasons"] }>;
  /** Remove top item from stack (optimistic swipe) */
  removeTop: () => void;
  /** Force reset the locked order */
  reset: () => void;
  /** Debug info (only populated when DEMO_DEBUG enabled) */
  debug?: {
    locked: boolean;
    contextKey: string;
    size: number;
    removedCount: number;
  };
}

/**
 * Hook that provides stable ranking order for swipe feeds.
 * 
 * Key behavior:
 * - Locks the sort order once scores are available for the first time
 * - Never reshuffles items when scores update after lock
 * - Handles optimistic removal of swiped items
 * - Rebuilds order when contextKey changes (filter/job change)
 */
export function useStableRankedStack<T extends { id: string }>({
  items,
  scores,
  contextKey,
  getScore,
  topN = 12,
}: UseStableRankedStackParams<T>): StableRankedStackResult<T> {
  // Track locked order by id
  const [lockedOrderIds, setLockedOrderIds] = React.useState<string[] | null>(null);
  // Track removed items (swiped away)
  const [removedIds, setRemovedIds] = React.useState<Set<string>>(new Set());
  // Track the context key that was used to build the current order
  const prevContextKeyRef = React.useRef<string>(contextKey);

  // Reset when context changes
  React.useEffect(() => {
    if (prevContextKeyRef.current !== contextKey) {
      setLockedOrderIds(null);
      setRemovedIds(new Set());
      prevContextKeyRef.current = contextKey;
    }
  }, [contextKey]);

  // Build stable ordered list
  const ordered = React.useMemo(() => {
    // Filter out removed items
    const availableItems = items.filter((item) => !removedIds.has(item.id));
    
    if (availableItems.length === 0) {
      return [];
    }

    // Score getter function
    const scoreOf = (id: string): number => {
      if (getScore) {
        return getScore(id) ?? -1;
      }
      return scores?.get(id)?.score ?? -1;
    };

    // Check if we should lock the order now
    const hasAnyScores = scores && scores.size > 0;
    
    let orderedIds: string[];

    if (lockedOrderIds !== null) {
      // Order is locked - use existing order, append new items at end
      const lockedSet = new Set(lockedOrderIds);
      const existingInOrder = lockedOrderIds.filter(
        (id) => !removedIds.has(id) && availableItems.some((item) => item.id === id)
      );
      
      // Find new items not in locked order
      const newItems = availableItems
        .filter((item) => !lockedSet.has(item.id))
        .map((item) => item.id);
      
      orderedIds = [...existingInOrder, ...newItems];
    } else if (hasAnyScores) {
      // First time we have scores - build sorted order and lock it
      const itemsCopy = [...availableItems];
      
      // Stable sort: by score desc, then by original index for ties
      const indexMap = new Map(items.map((item, idx) => [item.id, idx]));
      
      itemsCopy.sort((a, b) => {
        const scoreA = scoreOf(a.id);
        const scoreB = scoreOf(b.id);
        
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Descending
        }
        
        // Tie-break by original index (stable)
        return (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0);
      });
      
      orderedIds = itemsCopy.slice(0, topN).map((item) => item.id);
      
      // Lock the order
      setLockedOrderIds(orderedIds);
    } else {
      // No scores yet - use original order (no lock)
      orderedIds = availableItems.slice(0, topN).map((item) => item.id);
    }

    // Map ids back to items with scores attached
    const itemMap = new Map(items.map((item) => [item.id, item]));
    
    return orderedIds
      .filter((id) => itemMap.has(id) && !removedIds.has(id))
      .map((id) => {
        const item = itemMap.get(id)!;
        const scoreData = scores?.get(id);
        return {
          ...item,
          match_score: scoreData?.score,
          match_reasons: scoreData?.reasons,
        };
      });
  }, [items, scores, lockedOrderIds, removedIds, getScore, topN]);

  // Remove top item (optimistic swipe)
  const removeTop = React.useCallback(() => {
    if (ordered.length > 0) {
      const topId = ordered[0].id;
      setRemovedIds((prev) => new Set([...prev, topId]));
    }
  }, [ordered]);

  // Force reset
  const reset = React.useCallback(() => {
    setLockedOrderIds(null);
    setRemovedIds(new Set());
  }, []);

  // Debug info
  const debug = DEMO_DEBUG_ENABLED
    ? {
        locked: lockedOrderIds !== null,
        contextKey,
        size: ordered.length,
        removedCount: removedIds.size,
      }
    : undefined;

  return {
    ordered,
    removeTop,
    reset,
    debug,
  };
}

/**
 * Helper to create a stable hash from filter values
 */
export function hashFilters(filters: Record<string, unknown>): string {
  // Simple deterministic hash
  const sorted = Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
    .join("|");
  
  // Simple string hash
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString(36);
}
