// Provide a minimal Location-compatible mock and cast it so TS doesn't complain.
(globalThis as unknown as { location: Location }).location = {
  href: "http://localhost/",
  hostname: "localhost",
  protocol: "http:",
  host: "localhost:8080",
  pathname: "/",
  origin: "http://localhost",
  search: "",
  hash: "",
  port: "8080",
  // methods on Location
  assign: (_url?: string) => {},
  reload: () => {},
  replace: (_url?: string) => {},
  toString: () => "http://localhost/",
} as unknown as Location;
