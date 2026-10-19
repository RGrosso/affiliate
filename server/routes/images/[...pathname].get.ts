import { blob } from "hub:blob";

export default defineEventHandler(async event => {
  const { pathname } = getRouterParams(event);

  if (!pathname) {
    throw createError({ statusCode: 404, statusMessage: "Image not found" });
  }

  setHeader(event, "Content-Security-Policy", "default-src 'none';");
  return blob.serve(event, pathname);
});
