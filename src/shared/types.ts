export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } };

export type ServiceTime = { day: string; time: string; name: string };

export type PublicServiceInfo = {
  serviceTimes: ServiceTime[];
  address: string;
  city: string;
  state: string;
  zip: string;
  mapUrl: string | null;
  phone: string | null;
  email: string | null;
};

export type PublicLiveStream = {
  isLive: boolean;
  embedUrl: string | null;
  title: string | null;
};

export type ConfigResponse = {
  serviceInfo: PublicServiceInfo;
  liveStream: PublicLiveStream;
};

export type PublicSermon = {
  id: string;
  title: string;
  speaker: string;
  series: string | null;
  description: string | null;
  scripture: string | null;
  preachedOn: number;
  audioUrl: string | null;
  videoUid: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
};

export type SermonsListResponse = {
  sermons: PublicSermon[];
  nextCursor: number | null;
};

export type PublicEvent = {
  id: string;
  title: string;
  description: string | null;
  startsAt: number;
  endsAt: number;
  location: string | null;
  address: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
};

export type EventsListResponse = {
  events: PublicEvent[];
};
