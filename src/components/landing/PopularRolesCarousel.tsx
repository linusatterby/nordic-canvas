import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  roles: string[];
}

export function PopularRolesCarousel({ roles }: Props) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateArrows = React.useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  const scroll = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const arrowCls =
    "hidden md:flex items-center justify-center shrink-0 h-8 w-8 rounded-full bg-card border border-border shadow-md text-foreground/70 hover:text-primary hover:border-primary/30 transition-all duration-fast disabled:opacity-0 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-3">
        Populära roller
      </p>

      {/* Flex row: arrow | chips | arrow — arrows in gutter, chips take remaining space */}
      <div className="flex items-center gap-2">
        {/* Left arrow (gutter) */}
        <button
          type="button"
          aria-label="Scrolla roller vänster"
          onClick={() => scroll(-1)}
          disabled={!canScrollLeft}
          className={arrowCls}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Scroll track — clips content, takes all remaining width */}
        <div className="relative flex-1 min-w-0">
          {/* Mobile fade edges */}
          <div
            className="md:hidden absolute left-0 top-0 bottom-0 w-6 z-10 pointer-events-none
                       bg-gradient-to-r from-background to-transparent transition-opacity"
            style={{ opacity: canScrollLeft ? 1 : 0 }}
          />
          <div
            className="md:hidden absolute right-0 top-0 bottom-0 w-6 z-10 pointer-events-none
                       bg-gradient-to-l from-background to-transparent transition-opacity"
            style={{ opacity: canScrollRight ? 1 : 0 }}
          />

          <div
            ref={trackRef}
            className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 flex-nowrap"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {roles.map((role) => (
              <span
                key={role}
                className="snap-start shrink-0 px-4 py-1.5 rounded-full text-sm font-medium
                           bg-card border border-border text-foreground/80
                           hover:bg-warm-accent-muted hover:text-primary hover:border-primary/30
                           transition-all duration-fast cursor-default select-none"
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        {/* Right arrow (gutter) */}
        <button
          type="button"
          aria-label="Scrolla roller höger"
          onClick={() => scroll(1)}
          disabled={!canScrollRight}
          className={arrowCls}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
