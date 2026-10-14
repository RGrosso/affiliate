import type { H3Event } from "h3";

// h3's `readBody` needs Node's `Buffer`, which the browser lacks
export function readJsonBody(event: H3Event): unknown {
  const { body } = event.node.req as unknown as { body: string };
  return JSON.parse(body);
}
