import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
  size?: number;
}

export function LogoMark({ className, size = 32 }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vruta-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="vruta-right" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>

      <circle cx="30" cy="20" r="8" fill="url(#vruta-left)" />
      <circle cx="70" cy="20" r="8" fill="url(#vruta-right)" />

      <path
        d="M 30 30 Q 20 45, 25 60 Q 30 75, 50 85 Q 70 75, 75 60 Q 80 45, 70 30"
        fill="url(#vruta-left)"
        opacity="0.9"
      />

      <path
        d="M 70 30 Q 80 45, 75 60 Q 70 75, 50 85 Q 30 75, 25 60 Q 20 45, 30 30"
        fill="url(#vruta-right)"
        opacity="0.9"
      />

      <line
        x1="45"
        y1="35"
        x2="48"
        y2="30"
        stroke="#7c3aed"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="32"
        x2="52"
        y2="28"
        stroke="#3b82f6"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="55"
        y1="35"
        x2="52"
        y2="30"
        stroke="#14b8a6"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface LogoProps {
  showWordmark?: boolean;
  size?: number;
  className?: string;
}

export function Logo({ showWordmark = true, size = 28, className }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className="font-bold tracking-tight leading-none text-[1.15em]"
          style={{ color: "#1a1f3a" }}
        >
          vruta
        </span>
      )}
    </span>
  );
}
