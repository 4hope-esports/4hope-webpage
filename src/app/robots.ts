import type { MetadataRoute } from "next";
import { getSiteUrl, isIndexableEnv } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  if (!isIndexableEnv()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/login", "/register", "/profile", "/*?token="] },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
