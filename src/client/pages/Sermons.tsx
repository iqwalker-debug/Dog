import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Empty, ErrorView, Loading } from "@/components/StatusView";
import { formatDate, formatDuration } from "@/lib/utils";

export function Sermons() {
  const [series, setSeries] = useState<string>("");
  const [speaker, setSpeaker] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["sermons", { series, speaker }],
    queryFn: () => api.sermons({ series: series || undefined, speaker: speaker || undefined }),
  });

  const { seriesOptions, speakerOptions } = useMemo(() => {
    const s = new Set<string>();
    const p = new Set<string>();
    for (const row of data?.sermons ?? []) {
      if (row.series) s.add(row.series);
      p.add(row.speaker);
    }
    return { seriesOptions: [...s].sort(), speakerOptions: [...p].sort() };
  }, [data]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl text-brand-700">Sermons</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={series}
          onChange={(e) => setSeries(e.target.value)}
          className="rounded-full bg-cream-50 border border-cream-300 px-4 h-10 text-sm"
        >
          <option value="">All series</option>
          {seriesOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
          className="rounded-full bg-cream-50 border border-cream-300 px-4 h-10 text-sm"
        >
          <option value="">All speakers</option>
          {speakerOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <Loading />}
        {error && <ErrorView error={error} />}
        {data && data.sermons.length === 0 && <Empty label="No sermons published yet." />}
        {data?.sermons.map((s) => (
          <Link key={s.id} href={`/sermons/${s.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardBody className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-ink-muted">
                    {formatDate(s.preachedOn)}
                    {s.series ? ` · ${s.series}` : ""}
                  </p>
                  <h3 className="text-lg text-brand-700">{s.title}</h3>
                  <p className="text-ink-muted text-sm">{s.speaker}</p>
                </div>
                {formatDuration(s.durationSeconds) && (
                  <span className="text-xs text-ink-muted shrink-0 pt-1">
                    {formatDuration(s.durationSeconds)}
                  </span>
                )}
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
