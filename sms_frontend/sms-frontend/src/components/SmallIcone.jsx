export default function SmsWallIcon({ size = 58 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="url(#g)"
        strokeWidth="2"
        opacity="0.6"
      />
      <path
        d="M20 34C24 28 28 28 32 34C36 40 40 40 44 34"
        stroke="#22D3EE"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M16 28C22 20 28 20 32 28C36 36 42 36 48 28"
        stroke="#3B82F6"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M12 22C20 12 28 12 32 22C36 32 44 32 52 22"
        stroke="#A855F7"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="32" cy="34" r="3.5" fill="#fff" />
      <circle cx="32" cy="34" r="7" fill="#22D3EE" opacity="0.15" />
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="64" y2="64">
          <stop stopColor="#22D3EE" />
          <stop offset="0.5" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}
