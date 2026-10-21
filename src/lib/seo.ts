import { useEffect } from "react";

/** Client-side title/description updates for SPA navigation (the Worker handles first paint + crawlers). */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    if (title) document.title = title.includes("Life Robo") ? title : `${title} — Life Robo`;
    if (description) {
      let m = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!m) {
        m = document.createElement("meta");
        m.name = "description";
        document.head.appendChild(m);
      }
      m.content = description;
    }
  }, [title, description]);
}
