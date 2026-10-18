// Frame shared by the four corner instruments: line-art illustration + title + one live value,
// the whole card is one link. Lead-owned; widgets use it and do not edit it.
import type { ReactNode } from "react";
import { Link } from "../router";
import "./corners.css";

export function Corner({ to, title, art, label, children, testId }: { to: string; title: string; art: ReactNode; label: string; children: ReactNode; testId: string }) {
  return (
    <Link to={to} className="corner" aria-label={label} data-testid={testId}>
      <span className="corner-art" role="img" aria-label={`${title} (illustration)`}>
        {art}
      </span>
      <span className="corner-body">
        <span className="corner-title">{title}</span>
        {children}
      </span>
    </Link>
  );
}
