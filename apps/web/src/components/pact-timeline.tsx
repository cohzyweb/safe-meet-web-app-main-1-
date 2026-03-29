import { cn } from "@/lib/utils";
import type { PactStatus } from "@/lib/types";

type PactTimelineProps = {
  status: PactStatus;
};

const STEPS = ["Created", "Accepted", "Funds Locked", "Meeting/Proof", "Complete"] as const;

function completedStepIndex(status: PactStatus): number {
  switch (status) {
    case "PENDING":
      return 0;
    case "ACTIVE":
      return 2;
    case "PROOF_SUBMITTED":
      return 3;
    case "COMPLETE":
      return 4;
    case "DISPUTED":
      return 3;
    case "EXPIRED":
      return 2;
    case "CANCELLED":
      return 0;
    default:
      return 0;
  }
}

export function PactTimeline({ status }: PactTimelineProps) {
  const current = completedStepIndex(status);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2 text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
        {STEPS.map((step, index) => (
          <span key={step} className={cn(index <= current ? "text-white" : "text-on-surface-variant")}>{step}</span>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {STEPS.map((step, index) => (
          <span
            key={`bar-${step}`}
            className={cn(
              "h-1.5 rounded-full",
              index <= current ? "bg-primary" : "bg-surface-highest",
            )}
          />
        ))}
      </div>
      {status === "DISPUTED" || status === "CANCELLED" || status === "EXPIRED" ? (
        <p className="text-xs text-tertiary">Current status: {status}</p>
      ) : null}
    </div>
  );
}
