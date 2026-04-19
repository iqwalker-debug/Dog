import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ErrorView, Loading } from "@/components/StatusView";
import { formatDate, formatTime } from "@/lib/utils";

function toGoogleCalendar(e: {
  title: string;
  description: string | null;
  startsAt: number;
  endsAt: number;
  location: string | null;
  address: string | null;
}) {
  const fmt = (ms: number) =>
    new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${fmt(e.startsAt)}/${fmt(e.endsAt)}`,
  });
  if (e.description) params.set("details", e.description);
  const loc = [e.location, e.address].filter(Boolean).join(", ");
  if (loc) params.set("location", loc);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["event", id],
    queryFn: () => api.event(id),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorView error={error} />;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/events" className="text-sm text-brand-600 hover:underline">
        ← All events
      </Link>

      {data.imageUrl && (
        <img
          src={data.imageUrl}
          alt=""
          className="mt-4 w-full rounded-2xl object-cover aspect-[16/9]"
        />
      )}

      <header className="mt-6">
        <p className="text-xs uppercase tracking-wider text-ink-muted">
          {formatDate(data.startsAt, { weekday: "long" })} · {formatTime(data.startsAt)}
          {" – "}
          {formatTime(data.endsAt)}
        </p>
        <h1 className="mt-1 text-3xl text-brand-700">{data.title}</h1>
        {data.location && <p className="text-ink-muted">{data.location}</p>}
        {data.address && <p className="text-ink-muted text-sm">{data.address}</p>}
      </header>

      {data.description && (
        <p className="mt-6 text-ink whitespace-pre-line leading-relaxed">{data.description}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <a href={toGoogleCalendar(data)} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary">Add to calendar</Button>
        </a>
        {data.ctaUrl && data.ctaLabel && (
          <a href={data.ctaUrl} target="_blank" rel="noopener noreferrer">
            <Button>{data.ctaLabel}</Button>
          </a>
        )}
      </div>
    </div>
  );
}
