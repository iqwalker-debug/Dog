export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="py-16 text-center text-ink-muted text-sm" role="status">
      {label}
    </div>
  );
}

export function ErrorView({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="py-16 text-center">
      <p className="text-brand-700 font-medium">Couldn't load this page</p>
      <p className="text-ink-muted text-sm mt-1">{msg}</p>
    </div>
  );
}

export function Empty({ label }: { label: string }) {
  return <div className="py-16 text-center text-ink-muted">{label}</div>;
}
