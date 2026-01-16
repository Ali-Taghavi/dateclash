import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dateclash.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/private/", "/api/admin/"],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/private/", "/api/admin/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/private/", "/api/admin/"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/private/", "/api/admin/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
