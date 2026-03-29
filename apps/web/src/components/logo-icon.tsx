import type { SVGProps } from "react";

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <circle className="logo-ring" cx="24" cy="30" r="15" stroke="currentColor" />
      <circle
        className="logo-ring"
        cx="40"
        cy="30"
        r="15"
        stroke="currentColor"
        opacity="0.9"
      />
      <path
        d="M21 31l7 7 14-15"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
