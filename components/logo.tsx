import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoMarkProps {
  className?: string;
  size?: number;
}

export function LogoMark({ className, size = 32 }: LogoMarkProps) {
  return (
    <Image
      src="/vruta-icon.png"
      alt="Vruta"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
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
        <Image
          src="/vruta.svg"
          alt="Vruta"
          width={size * 3.5}
          height={size}
          className="shrink-0"
        />
      )}
    </span>
  );
}
