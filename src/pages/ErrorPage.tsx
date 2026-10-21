import { isRouteErrorResponse, useRouteError } from "react-router";
import { usePageMeta } from "@/lib/seo";
import { Refresh } from "@/components/icons";

/** Route error element. Rendered outside the site layout, so it is self-contained. */
export default function ErrorPage() {
  const error = useRouteError();
  usePageMeta("Something went wrong");

  let heading = "Something went wrong";
  let detail = "An unexpected error stopped this page from loading. Please try again.";
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      heading = "Page not found";
      detail = "The page you were looking for doesn't exist or has moved.";
    } else {
      heading = `Error ${error.status}`;
      detail = error.statusText || detail;
    }
  } else if (error instanceof Error && /dynamically imported module|Loading chunk|Failed to fetch/i.test(error.message)) {
    detail = "A newer version of the site is available, or your connection dropped. Reloading should fix it.";
  }

  if (import.meta.env.DEV && error) console.error(error);

  return (
    <main id="main" className="relative flex min-h-screen items-center overflow-hidden bg-canvas px-4 py-24 text-fg">
      <div className="tech-grid mask-fade-b pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-xl text-center" role="alert">
        <p className="eyebrow mb-4">Life Robo</p>
        <h1 className="headline">{heading}</h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-muted">{detail}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            <Refresh size={18} /> Try again
          </button>
          <a href="/" className="btn btn-ghost">
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
