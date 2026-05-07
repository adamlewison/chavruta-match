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
        <linearGradient id="cm-pageL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F5E6CB" />
          <stop offset="100%" stopColor="#EAD4A8" />
        </linearGradient>
        <linearGradient id="cm-pageR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#EAD4A8" />
          <stop offset="100%" stopColor="#F5E6CB" />
        </linearGradient>
        <linearGradient id="cm-cover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9B5A23" />
          <stop offset="100%" stopColor="#6B3610" />
        </linearGradient>
        <filter id="cm-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#6B3610" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Left book */}
      <rect x="5" y="16" width="16" height="68" rx="2.5" fill="url(#cm-cover)" filter="url(#cm-shadow)" />
      <rect x="6" y="17" width="3" height="66" rx="1" fill="white" opacity="0.1" />
      <path d="M21 18 L44 21 L44 79 L21 82 Z" fill="url(#cm-pageL)" filter="url(#cm-shadow)" />
      <line x1="21" y1="20" x2="21" y2="80" stroke="#C8905A" strokeWidth="0.6" opacity="0.4" />
      <line x1="26" y1="31" x2="41" y2="32" stroke="#A06830" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <line x1="26" y1="41" x2="41" y2="42" stroke="#A06830" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <line x1="26" y1="51" x2="41" y2="52" stroke="#A06830" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <line x1="26" y1="61" x2="41" y2="62" stroke="#A06830" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <line x1="26" y1="71" x2="38" y2="72" stroke="#A06830" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />

      {/* Right book */}
      <path d="M56 21 L79 18 L79 82 L56 79 Z" fill="url(#cm-pageR)" filter="url(#cm-shadow)" />
      <line x1="79" y1="20" x2="79" y2="80" stroke="#C8905A" strokeWidth="0.6" opacity="0.4" />
      <line x1="59" y1="32" x2="74" y2="31" stroke="#A06830" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <line x1="59" y1="42" x2="74" y2="41" stroke="#A06830" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <line x1="59" y1="52" x2="74" y2="51" stroke="#A06830" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <line x1="59" y1="62" x2="74" y2="61" stroke="#A06830" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <line x1="62" y1="72" x2="74" y2="71" stroke="#A06830" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
      <rect x="79" y="16" width="16" height="68" rx="2.5" fill="url(#cm-cover)" filter="url(#cm-shadow)" />
      <rect x="91" y="17" width="3" height="66" rx="1" fill="white" opacity="0.1" />

      {/* Center connection */}
      <line x1="50" y1="23" x2="50" y2="77" stroke="#C8905A" strokeWidth="0.8" opacity="0.25" strokeDasharray="2 3" />
      <circle cx="50" cy="50" r="5.5" fill="#C47B2E" />
      <circle cx="50" cy="50" r="3" fill="white" opacity="0.35" />
      <circle cx="50" cy="50" r="1.5" fill="#C47B2E" />
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
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="font-bold tracking-tight leading-none">
          <span className="text-foreground">Chavruta</span>
          <span className="text-primary">Match</span>
        </span>
      )}
    </span>
  );
}
