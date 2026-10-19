declare module "#app" {
  interface PageMeta {
    /** Header shows only the logo, colour mode and account menu. Child routes inherit it, e.g. all of /admin. */
    minimalHeader?: boolean;
    /** No site footer, e.g. on login and setup. Child routes inherit it, e.g. all of /admin. */
    hideFooter?: boolean;
    /** The page is exactly the viewport height below the header and scrolls inside itself, so the document never scrolls. */
    fillViewport?: boolean;
  }
}

export {};
