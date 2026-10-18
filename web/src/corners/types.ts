// Shared contract for the four corner instruments (dashboard, preview ?corners=1).
import type { Alert, CaseSummary, Overview } from "../../../shared/types";

export interface CornerProps {
  overview: Overview;
  cases: CaseSummary[];
  alerts: Alert[];
  /** Effects allowed (false under reduced motion, VITE_FX=off, Skip animations): render static. */
  motion: boolean;
}
