import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { ErrorView, Loading } from "@/components/StatusView";
import { formatDate } from "@/lib/utils";

export function SermonDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["sermon", id],
    queryFn: () => api.sermon(id),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorView error={error} />;
  if (!data) return null;

  const streamUrl = data.videoUid
    ? `https://customer-placeholder.cloudflarestream.com/${data.videoUid}/iframe`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/sermons" className="text-sm text-brand-600 hover:underline">
        ← All sermons
      </Link>

      <header className="mt-4">
        <p className="text-xs uppercase tracking-wider text-ink-muted">
          {formatDate(data.preachedOn)}
          {data.series ? ` · ${data.series}` : ""}
        </p>
        <h1 className="mt-1 text-3xl text-brand-700">{data.title}</h1>
        <p className="text-ink-muted">{data.speaker}</p>
        {data.scripture && (
          <p className="mt-2 text-sm text-brand-600 italic">{data.scripture}</p>
        )}
      </header>

      <div className="mt-6">
        {streamUrl && (
          <div className="aspect-video rounded-2xl overflow-hidden bg-black">
            <iframe
              src={streamUrl}
              title={data.title}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        )}
        {!streamUrl && data.audioUrl && (
          <Card>
            <CardBody>
              <audio controls src={data.audioUrl} className="w-full" preload="metadata">
                Your browser does not support audio playback.
              </audio>
            </CardBody>
          </Card>
        )}
        {!streamUrl && !data.audioUrl && (
          <p className="text-ink-muted text-sm">Media for this sermon isn't available yet.</p>
        )}
      </div>

      {data.description && (
        <p className="mt-6 text-ink whitespace-pre-line leading-relaxed">{data.description}</p>
      )}
    </div>
  );
}
