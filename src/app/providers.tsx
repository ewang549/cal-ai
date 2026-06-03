/**
 * Top-level provider wrapper. Currently a pass-through — we removed the
 * smooth-scroll lib because it felt over-damped on real input devices.
 * Left in place so future providers (theme, analytics) have a home.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
