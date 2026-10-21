import { StrictMode, Suspense, lazy, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "./index.css";
import { SiteProvider, preloadSite } from "@/lib/site";
import { IntroContext } from "@/lib/intro";
import { SiteLayout } from "@/components/Layout";
import { LoadingScreen, shouldShowIntro } from "@/components/LoadingScreen";
import HomePage from "@/sections/HomePage";

type Mod = { default: ComponentType };
const page = (load: () => Promise<Mod>) => async () => ({ Component: (await load()).default });

// Globbed so the public site still builds/serves if the admin bundle is absent.
const adminModules = import.meta.glob<Mod>("./admin/AdminApp.tsx");

const ErrorPage = lazy(() => import("@/pages/ErrorPage"));
function RootError() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ErrorPage />
    </Suspense>
  );
}
const Blank = () => <div className="min-h-screen bg-black" aria-busy="true" />;

const isAdmin = window.location.pathname.startsWith("/admin");
if (!isAdmin) void preloadSite(); // start fetching before React mounts

const router = createBrowserRouter([
  {
    path: "/admin/*",
    lazy: page(() => {
      const load = adminModules["./admin/AdminApp.tsx"];
      if (!load) throw new Error("Admin panel is not available in this build.");
      return load();
    }),
    errorElement: <RootError />,
    HydrateFallback: Blank,
  },
  {
    // Outside SiteLayout: no nav or footer, so it prints as a single clean page.
    path: "/certificates/:code",
    lazy: page(() => import("@/pages/Certificate")),
    errorElement: <RootError />,
    HydrateFallback: Blank,
  },
  {
    path: "/",
    Component: SiteLayout,
    errorElement: <RootError />,
    HydrateFallback: Blank,
    children: [
      { index: true, Component: HomePage },
      { path: "events", lazy: page(() => import("@/pages/Events")) },
      { path: "events/:slug", lazy: page(() => import("@/pages/EventDetail")) },
      { path: "projects", lazy: page(() => import("@/pages/Projects")) },
      { path: "projects/:slug", lazy: page(() => import("@/pages/ProjectDetail")) },
      { path: "team", lazy: page(() => import("@/pages/Team")) },
      { path: "collaborations", lazy: page(() => import("@/pages/Collaborations")) },
      { path: "gallery", lazy: page(() => import("@/pages/Gallery")) },
      { path: "blog", lazy: page(() => import("@/pages/Blog")) },
      { path: "blog/:slug", lazy: page(() => import("@/pages/PostDetail")) },
      { path: "join", lazy: page(() => import("@/pages/Join")) },
      { path: "contact", lazy: page(() => import("@/pages/Contact")) },
      { path: "*", lazy: page(() => import("@/pages/NotFound")) },
    ],
  },
]);

function App() {
  const [intro, setIntro] = useState(shouldShowIntro);
  if (!intro) document.getElementById("boot")?.remove();
  return (
    <IntroContext.Provider value={!intro}>
      {intro && <LoadingScreen onDone={() => setIntro(false)} />}
      {/* Content underneath stays out of the a11y tree and tab order until the intro is done. */}
      <div inert={intro} aria-hidden={intro || undefined}>
        <RouterProvider router={router} />
      </div>
    </IntroContext.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SiteProvider>
      <App />
    </SiteProvider>
  </StrictMode>,
);
