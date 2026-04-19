import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { AppBindings } from "../env";
import { db } from "../lib/db";
import { ok, fail } from "../lib/response";
import { serviceInfo, liveStreamConfig } from "@db/schema";
import type { ConfigResponse, ServiceTime } from "@shared/types";

const app = new Hono<AppBindings>();

app.get("/", async (c) => {
  const d = db(c.env.DB);

  const [info, stream] = await Promise.all([
    d.select().from(serviceInfo).where(eq(serviceInfo.id, 1)).get(),
    d.select().from(liveStreamConfig).where(eq(liveStreamConfig.id, 1)).get(),
  ]);

  if (!info) {
    return fail(c, "not_configured", "Service info has not been set up yet.", 404);
  }

  let serviceTimes: ServiceTime[] = [];
  try {
    serviceTimes = JSON.parse(info.serviceTimes);
  } catch {
    return fail(c, "bad_config", "service_times is not valid JSON.", 500);
  }

  const body: ConfigResponse = {
    serviceInfo: {
      serviceTimes,
      address: info.address,
      city: info.city,
      state: info.state,
      zip: info.zip,
      mapUrl: info.mapUrl,
      phone: info.phone,
      email: info.email,
    },
    liveStream: {
      isLive: Boolean(stream?.isLive),
      embedUrl: stream?.embedUrl ?? null,
      title: stream?.title ?? null,
    },
  };

  return ok(c, body);
});

export default app;
