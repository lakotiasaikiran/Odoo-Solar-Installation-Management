const apiOrigin = new URL(process.env.API_ORIGIN || "http://127.0.0.1:3100");
if (!["http:", "https:"].includes(apiOrigin.protocol) || apiOrigin.username || apiOrigin.password ||
    apiOrigin.pathname !== "/" || apiOrigin.search || apiOrigin.hash) {
  throw new Error("API_ORIGIN must be an HTTP(S) origin without credentials or a path");
}

export default {
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: apiOrigin.origin + "/api/:path*" }];
  },
};
