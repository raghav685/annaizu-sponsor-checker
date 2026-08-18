export function FlowFieldBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-bg-motion animate-flow-drift opacity-70"
      style={{
        background:
          "radial-gradient(60% 50% at 20% 20%, rgba(79,232,201,0.10), transparent 60%), " +
          "radial-gradient(50% 45% at 80% 30%, rgba(255,155,84,0.05), transparent 60%), " +
          "radial-gradient(70% 60% at 50% 85%, rgba(47,143,125,0.12), transparent 65%)",
      }}
    />
  );
}
