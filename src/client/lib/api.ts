import type {
  ApiResponse,
  ConfigResponse,
  EventsListResponse,
  PublicEvent,
  PublicSermon,
  SermonsListResponse,
} from "@shared/types";

async function req<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: "application/json" } });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.error) {
    const msg = json.error?.message ?? `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return json.data as T;
}

export const api = {
  config: () => req<ConfigResponse>("/api/config"),
  sermons: (params?: { series?: string; speaker?: string; cursor?: number }) => {
    const q = new URLSearchParams();
    if (params?.series) q.set("series", params.series);
    if (params?.speaker) q.set("speaker", params.speaker);
    if (params?.cursor != null) q.set("cursor", String(params.cursor));
    const qs = q.toString();
    return req<SermonsListResponse>(`/api/sermons${qs ? `?${qs}` : ""}`);
  },
  sermon: (id: string) => req<PublicSermon>(`/api/sermons/${encodeURIComponent(id)}`),
  events: () => req<EventsListResponse>("/api/events"),
  event: (id: string) => req<PublicEvent>(`/api/events/${encodeURIComponent(id)}`),
};
