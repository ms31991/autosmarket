export function getRouteSeo(pathname, t) {
  const path = pathname.split("?")[0] || "/";

  const privatePrefixes = [
    "/login",
    "/register",
    "/admin",
    "/messages",
    "/settings",
    "/add-vehicle",
    "/edit-vehicle",
    "/my-vehicles",
    "/my-favourites",
    "/favourites",
    "/userprofile",
    "/select-vehicle",
    "/advertise",
    "/payment",
  ];

  if (privatePrefixes.some((prefix) => path.startsWith(prefix))) {
    return {
      title: SITE_FALLBACK(path, t),
      description: t("seoP1"),
      noindex: true,
    };
  }

  if (path === "/") {
    return {
      title: t("seoTitle"),
      description: t("seoP1"),
      noindex: false,
    };
  }

  if (path === "/vehicles") {
    return {
      title: t("allVehicles"),
      description: t("vehiclesAllDesc"),
      noindex: false,
    };
  }

  if (path === "/vehicles-for-sale") {
    return {
      title: t("forSale"),
      description: t("vehiclesAllDesc"),
      noindex: false,
    };
  }

  if (path === "/vehicles-for-rent") {
    return {
      title: t("forRent"),
      description: t("vehiclesAllDesc"),
      noindex: false,
    };
  }

  if (path === "/privacy") {
    return { title: t("privacyFull"), description: t("seoP1"), noindex: false };
  }
  if (path === "/terms") {
    return { title: t("termsFull"), description: t("seoP1"), noindex: false };
  }
  if (path === "/cookies") {
    return { title: t("cookiesFull"), description: t("seoP1"), noindex: false };
  }
  if (path === "/refunds") {
    return { title: t("refundsFull"), description: t("seoP1"), noindex: false };
  }
  if (path === "/about") {
    return { title: t("aboutUs"), description: t("seoP2"), noindex: false };
  }
  if (path === "/contact") {
    return { title: t("contact"), description: t("seoP1"), noindex: false };
  }
  if (path === "/guidelines") {
    return { title: t("guidelines"), description: t("seoP1"), noindex: false };
  }
  if (path === "/faq") {
    return { title: t("faq"), description: t("faqLead"), noindex: false };
  }
  if (path === "/how-it-works") {
    return { title: t("howItWorks"), description: t("hiwLead"), noindex: false };
  }
  if (path === "/guides" || path.startsWith("/guides/")) {
    return { title: t("guides"), description: t("guidesLead"), noindex: false };
  }

  if (/^\/vehicles\/[^/]+$/.test(path)) {
    return { skip: true };
  }

  return {
    title: "AutoMarket",
    description: t("seoP1"),
    noindex: false,
  };
}

function SITE_FALLBACK(path, t) {
  if (path.startsWith("/add-vehicle")) return t("addTitle");
  if (path.startsWith("/login")) return t("navLogin");
  if (path.startsWith("/register")) return t("navRegister");
  if (path.startsWith("/messages")) return t("navInbox");
  return "AutoMarket";
}
