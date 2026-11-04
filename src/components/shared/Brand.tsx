import { ArrowUpRight } from "lucide-react";

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <ArrowUpRight size={23} strokeWidth={3} />
      </span>
      <span>
        vanguard<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
