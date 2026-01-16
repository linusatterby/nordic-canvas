import * as React from "react";
import { cn } from "@/lib/utils/classnames";

interface ConfettiPulseProps {
  trigger: boolean;
  onComplete?: () => void;
  className?: string;
}

export function ConfettiPulse({ trigger, onComplete, className }: ConfettiPulseProps) {
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    if (trigger) {
      setIsActive(true);
      const timer = setTimeout(() => {
        setIsActive(false);
        onComplete?.();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  if (!isActive) return null;

  const particles = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * 360;
    const delay = i * 30;
    return (
      <div
        key={i}
        className="absolute h-2 w-2 rounded-full"
        style={{
          background: i % 3 === 0 
            ? 'hsl(var(--c-primary))' 
            : i % 3 === 1 
              ? 'hsl(var(--c-delight))' 
              : 'hsl(var(--c-verified))',
          animation: `confetti-burst 0.6s ease-out ${delay}ms forwards`,
          transform: `rotate(${angle}deg) translateY(-20px)`,
        }}
      />
    );
  });

  return (
    <div 
      className={cn(
        "pointer-events-none fixed inset-0 z-50 flex items-center justify-center",
        className
      )}
      aria-hidden="true"
    >
      <div className="relative h-32 w-32">
        {particles}
      </div>
    </div>
  );
}
