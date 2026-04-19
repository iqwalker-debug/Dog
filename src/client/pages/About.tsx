import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/Card";
import { ErrorView, Loading } from "@/components/StatusView";

export function About() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["config"],
    queryFn: api.config,
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorView error={error} />;
  if (!data) return null;

  const { serviceInfo } = data;
  const fullAddress = `${serviceInfo.address}, ${serviceInfo.city}, ${serviceInfo.state} ${serviceInfo.zip}`;
  const mapUrl =
    serviceInfo.mapUrl ??
    `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <header>
        <h1 className="text-3xl text-brand-700">About</h1>
        <p className="text-ink-muted mt-2">
          Refuge Community Church is a gathering of ordinary people following Jesus together.
        </p>
      </header>

      <Card>
        <CardBody>
          <h2 className="text-xl text-brand-700">Service times</h2>
          <ul className="mt-3 space-y-2">
            {serviceInfo.serviceTimes.map((s, i) => (
              <li key={i} className="flex items-baseline justify-between">
                <span className="text-ink">{s.name}</span>
                <span className="text-ink-muted text-sm">
                  {s.day} · {s.time}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-xl text-brand-700">Visit us</h2>
          <p className="mt-2 text-ink">{serviceInfo.address}</p>
          <p className="text-ink-muted">
            {serviceInfo.city}, {serviceInfo.state} {serviceInfo.zip}
          </p>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-brand-600 hover:underline text-sm"
          >
            Open in Maps →
          </a>
        </CardBody>
      </Card>

      {(serviceInfo.phone || serviceInfo.email) && (
        <Card>
          <CardBody>
            <h2 className="text-xl text-brand-700">Contact</h2>
            <div className="mt-2 space-y-1 text-ink">
              {serviceInfo.phone && (
                <p>
                  <a href={`tel:${serviceInfo.phone}`} className="hover:underline">
                    {serviceInfo.phone}
                  </a>
                </p>
              )}
              {serviceInfo.email && (
                <p>
                  <a href={`mailto:${serviceInfo.email}`} className="hover:underline">
                    {serviceInfo.email}
                  </a>
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
