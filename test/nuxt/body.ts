import type { H3Event } from "h3";

/** The JSON body of a request in a `registerEndpoint` handler. h3's `readBody` needs Node's `Buffer`, which the browser doesn't have. */
export function readJsonBody(event: H3Event): unknown {
  const { body } = event.node.req as unknown as { body: string };
  return JSON.parse(body);
}
