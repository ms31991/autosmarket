import { useEffect } from "react";

import { SITE_ALT_NAME, SITE_BRAND, SITE_LOGO, SITE_URL } from "../config/site";
import { canonicalUrl } from "./canonical";

const DEFAULT_IMAGE = SITE_LOGO;

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(data) {
  const id = "seo-jsonld";
  let el = document.getElementById(id);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function absoluteUrl(path) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function SeoHead({
  title,
  description,
  image,
  noindex = false,
  jsonLd,
  canonicalPath,
}) {
  const jsonText = JSON.stringify(jsonLd ?? null);
  useEffect(() => {
    const path =
      canonicalPath ||
      (typeof window !== "undefined" ? window.location.pathname : "/");
    const fullTitle = title
      ? title.includes(SITE_BRAND) || title.includes(SITE_ALT_NAME)
        ? title
        : `${title} | ${SITE_BRAND}`
      : `${SITE_BRAND} (${SITE_ALT_NAME})`;
    const desc =
      description ||
      `${SITE_BRAND} (${SITE_ALT_NAME}) is an online marketplace for buying, selling and renting vehicles.`;
    const imageUrl = absoluteUrl(image || DEFAULT_IMAGE);
    const canonical = canonicalUrl(path);

    document.title = fullTitle;
    upsertMeta("name", "description", desc);
    upsertMeta(
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow"
    );
    upsertMeta("property", "og:site_name", SITE_BRAND);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:locale", "sq_AL");
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", imageUrl);
    upsertLink("canonical", canonical);
    upsertJsonLd(jsonLd);
  }, [title, description, image, noindex, canonicalPath, jsonText, jsonLd]);

  return null;
}

export function organizationJsonLd(settings = {}) {
  const email = settings.supportEmail;
  const privacy = settings.privacyEmail;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE_BRAND,
        alternateName: [SITE_ALT_NAME, "autosmarket.me"],
        legalName: settings.legalName || undefined,
        url: SITE_URL,
        logo: absoluteUrl(SITE_LOGO),
        email: email || undefined,
        description: `${SITE_BRAND}, also known as ${SITE_ALT_NAME}, is an online vehicle marketplace for buying, selling and renting cars.`,
        contactPoint: privacy
          ? {
              "@type": "ContactPoint",
              email: privacy,
              contactType: "customer support",
            }
          : undefined,
      },
      {
        "@type": "WebSite",
        name: SITE_BRAND,
        alternateName: SITE_ALT_NAME,
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/vehicles?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function breadcrumbJsonLd(items = []) {
  const list = Array.isArray(items) ? items.filter((item) => item?.name) : [];
  if (!list.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: list.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path ? canonicalUrl(item.path) : undefined,
    })),
  };
}
