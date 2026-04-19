import type { Context } from "hono";
import type { ApiResponse } from "@shared/types";

export function ok<T>(c: Context, data: T, status: 200 | 201 = 200) {
  const body: ApiResponse<T> = { data, error: null };
  return c.json(body, status);
}

export function fail(
  c: Context,
  code: string,
  message: string,
  status: 400 | 404 | 409 | 422 | 500 = 400,
) {
  const body: ApiResponse<never> = { data: null, error: { code, message } };
  return c.json(body, status);
}
