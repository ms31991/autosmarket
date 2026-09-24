import { useEffect } from "react";

export function useAuthViewportLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    const apply = () => {
      const height = Math.round(
        window.visualViewport?.height || window.innerHeight
      );
      html.style.setProperty("--auth-vh", `${height}px`);
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      window.scrollTo(0, 0);
    };

    apply();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", apply);
    viewport?.addEventListener("scroll", apply);
    window.addEventListener("orientationchange", apply);

    return () => {
      viewport?.removeEventListener("resize", apply);
      viewport?.removeEventListener("scroll", apply);
      window.removeEventListener("orientationchange", apply);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.removeProperty("--auth-vh");
    };
  }, []);
}
