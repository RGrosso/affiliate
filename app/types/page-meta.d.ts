declare module "#app" {
  interface PageMeta {
    /** Header shows only the logo, colour mode and account menu. Child routes inherit it, e.g. all of /admin. */
    minimalHeader?: boolean;
  }
}

export {};
