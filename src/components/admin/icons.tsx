type IconProps = { size?: number; className?: string };

function Svg({ size = 16, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ChevronIcon({ direction, ...p }: IconProps & { direction: "up" | "down" | "left" | "right" }) {
  const rotate = { up: "", down: "rotate-180", left: "-rotate-90", right: "rotate-90" }[direction];
  return (
    <Svg {...p} className={`${rotate} ${p.className ?? ""}`}>
      <path d="M3.5 10l4.5-4.5 4.5 4.5" />
    </Svg>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 4.5h10M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4.5 4.5l.6 9a1 1 0 0 0 1 1h3.8a1 1 0 0 0 1-1l.6-9" />
    </Svg>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 2.5v11M2.5 8h11" />
    </Svg>
  );
}

export function StarIcon({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...p}>
      <path
        d="M8 1.8l1.85 3.9 4.25.5-3.15 2.9.85 4.2L8 11.2 4.2 13.3l.85-4.2L1.9 6.2l4.25-.5z"
        fill={filled ? "currentColor" : "none"}
      />
    </Svg>
  );
}

export function GripIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {[4.5, 8, 11.5].map((y) => (
        <g key={y}>
          <circle cx="6" cy={y} r="0.6" fill="currentColor" />
          <circle cx="10" cy={y} r="0.6" fill="currentColor" />
        </g>
      ))}
    </Svg>
  );
}

export function ArrowUpRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 11l6-6M6 5h5v5" />
    </Svg>
  );
}

export function PlayIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5.5 3.5v9l7-4.5z" fill="currentColor" />
    </Svg>
  );
}

export function UploadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 10.5V2.5M4.8 5.5L8 2.3l3.2 3.2M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8.5l3.2 3L13 4.5" />
    </Svg>
  );
}

export function EyeOffIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2 2l12 12M6.6 6.6a2 2 0 0 0 2.8 2.8M4.3 4.4C2.9 5.3 2 6.6 1.5 8c1.1 2.9 3.6 4.5 6.5 4.5 1.3 0 2.5-.3 3.6-1M7 3.6c.3 0 .7-.1 1-.1 2.9 0 5.4 1.6 6.5 4.5-.3.8-.7 1.5-1.2 2.1" />
    </Svg>
  );
}

export function LogoutIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H6M10.5 11l3-3-3-3M13.5 8H6" />
    </Svg>
  );
}
