import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ErrorView, Loading } from "@/components/StatusView";
import { formatDate } from "@/lib/utils";

function nextServiceLabel(times: { day: string; time: string; name: string }[]) {
  if (times.length === 0) return null;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = new Date().getDay();
  const sorted = [...times].sort((a, b) => {
    const da = (days.indexOf(a.day) - today + 7) % 7;
    const db = (days.indexOf(b.day) - today + 7) % 7;
    return da - db;
  });
  return sorted[0];
}

export function Home() {
  const config = useQuery({ queryKey: ["config"], queryFn: api.config });
  const sermonList = useQuery({
    queryKey: ["sermons", {}],
    queryFn: () => api.sermons(),
  });

  const featured = sermonList.data?.sermons[0];
  const next = config.data ? nextServiceLabel(config.data.serviceInfo.serviceTimes) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
      {config.data?.liveStream.isLive && config.data.liveStream.embedUrl && (
        <Link
          href="/"
          className="block rounded-2xl bg-brand-500 text-cream-50 px-5 py-4 shadow-sm hover:bg-brand-600 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="font-semibold">We're live now</span>
            <span className="text-cream-200 text-sm">{config.data.liveStream.title ?? "Tap to watch"}</span>
          </div>
        </Link>
      )}

      <section className="rounded-3xl bg-brand-500 text-cream-50 px-6 py-12 md:py-16 md:px-10 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <p className="uppercase tracking-wider text-xs text-cream-200">Refuge Community Church</p>
          <h1 className="mt-2 text-4xl md:text-5xl">A place to belong.</h1>
          <p className="mt-4 text-cream-200">
            Join us in person or online. New here? We'd love to meet you.
          </p>

          {config.isLoading && <p className="mt-6 text-cream-200 text-sm">Loading service times…</p>}
          {next && (
            <p className="mt-6 text-lg">
              <span className="text-cream-200">Next service: </span>
              <span className="font-semibold">
                {next.day} at {next.time} · {next.name}
              </span>
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/about">
              <Button variant="secondary">Plan a visit</Button>
            </Link>
            <Link href="/give">
              <Button variant="outline" className="border-cream-200 text-cream-50 hover:bg-brand-600">
                Give
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-2xl text-brand-700">Featured Sermon</h2>
          <Link href="/sermons" className="text-sm text-brand-600 hover:underline">
            All sermons →
          </Link>
        </div>

        {sermonList.isLoading && <Loading />}
        {sermonList.error && <ErrorView error={sermonList.error} />}
        {featured && (
          <Link href={`/sermons/${featured.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardBody>
                <p className="text-xs uppercase tracking-wider text-ink-muted">
                  {formatDate(featured.preachedOn)}
                  {featured.series ? ` · ${featured.series}` : ""}
                </p>
                <h3 className="mt-1 text-2xl text-brand-700">{featured.title}</h3>
                <p className="text-ink-muted">{featured.speaker}</p>
                {featured.description && (
                  <p className="mt-3 text-sm text-ink line-clamp-2">{featured.description}</p>
                )}
              </CardBody>
            </Card>
          </Link>
        )}
      </section>
    </div>
  );
}
