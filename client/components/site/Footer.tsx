export default function Footer() {
  return (
    <footer className="border-t mt-6">
      <div className="container py-4 text-sm text-muted-foreground flex flex-col md:flex-row items-end justify-between gap-3">
        <p className="leading-tight">© {new Date().getFullYear()} EchoCoder • LUCCCA</p>
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F97c9dee966de4f8898c1b1bdd10f65ec?format=webp&width=800"
          alt="LUCCCA logo"
          className="h-12 w-auto opacity-95 drop-shadow"
          loading="lazy"
        />
      </div>
    </footer>
  );
}
