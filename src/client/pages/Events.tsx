import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Empty, ErrorView, Loading } from "@/components/StatusView";
import { formatDate, formatTime } from "@/lib/utils";

export function Events() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["events"],
    queryFn: api.events,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl text-brand-700">Events</h1>

      <div className="mt-6 space-y-3">
        {isLoading && <Loading />}
        {error && <ErrorView error={error} />}
        {data && data.events.length === 0 && <Empty label="Nothing on the calendar right now." />}
        {data?.events.map((e) => (
          <Link key={e.id} href={`/events/${e.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardBody>
                <p className="text-xs uppercase tracking-wider text-ink-muted">
                  {formatDate(e.startsAt, { weekday: "short" })} · {formatTime(e.startsAt)}
                </p>
                <h3 className="text-lg text-brand-700">{e.title}</h3>
                {e.location && <p className="text-ink-muted text-sm">{e.location}</p>}
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
