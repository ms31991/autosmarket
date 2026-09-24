import { useEffect } from "react";

import { SITE_LOGO, SITE_NAME } from "../config/site";

const SITE = SITE_NAME;
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
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function SeoHead({
  title,
  description,
  image,
  noindex = false,
  jsonLd,
}) {
  useEffect(() => {
    const fullTitle = title
      ? title.includes(SITE)
        ? title
        : `${title} | ${SITE}`
      : SITE;
    const desc =
      description ||
      "Buy, sell and rent vehicles on AutoMarket.";
    const imageUrl = absoluteUrl(image || DEFAULT_IMAGE);
    const canonical =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;

    document.title = fullTitle;
    upsertMeta("name", "description", desc);
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    upsertMeta("property", "og:site_name", SITE);
    upsertMeta("property", "og:type", jsonLd?.["@type"] === "Vehicle" ? "website" : "website");
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", imageUrl);
    upsertLink("canonical", canonical);
    upsertJsonLd(jsonLd);
  }, [title, description, image, noindex, JSON.stringify(jsonLd)]);

  return null;
}

export function organizationJsonLd(settings = {}) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const email = settings.supportEmail;
  const privacy = settings.privacyEmail;
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: settings.legalName || SITE,
    url: origin || undefined,
    logo: absoluteUrl(SITE_LOGO),
    email: email || undefined,
    description:
      "Marketplace for buying, selling and renting vehicles.",
    contactPoint: privacy
      ? {
          "@type": "ContactPoint",
          email: privacy,
          contactType: "customer support",
        }
      : undefined,
  };
}
