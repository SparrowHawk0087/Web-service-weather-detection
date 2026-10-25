export default function Background({ children }) {
  return (
    <div className="relative min-h-screen">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg-gradient.webp')" }}
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}