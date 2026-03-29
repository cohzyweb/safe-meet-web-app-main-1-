import { Badge } from "@/components/ui/badge";
import type { PactStatus } from "@safe-meet/shared";

const STATUS_STYLES: Record<PactStatus, string> = {
  COMPLETE: "rounded-full bg-emerald-500/20 text-emerald-300",
  PENDING: "rounded-full bg-tertiary/20 text-tertiary",
  ACTIVE: "rounded-full bg-primary/20 text-primary",
  PROOF_SUBMITTED: "rounded-full bg-secondary-container/20 text-secondary-container",
  DISPUTED: "rounded-full bg-error/20 text-error",
  CANCELLED: "rounded-full bg-error/20 text-error",
  EXPIRED: "rounded-full bg-outline-variant/20 text-on-surface-variant",
};

const STATUS_LABELS: Record<PactStatus, string> = {
  COMPLETE: "Complete",
  PENDING: "Pending",
  ACTIVE: "Active",
  PROOF_SUBMITTED: "Proof Submitted",
  DISPUTED: "Disputed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

interface StatusBadgeProps {
  status: PactStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge className={`${STATUS_STYLES[status]} px-3 py-1 text-xs ${className ?? ""}`}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
