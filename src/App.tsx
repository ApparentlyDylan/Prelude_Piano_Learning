import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";

const Learn = lazy(() => import("./pages/Learn").then((m) => ({ default: m.Learn })));
const LessonPage = lazy(() => import("./pages/LessonPage").then((m) => ({ default: m.LessonPage })));
const Read = lazy(() => import("./pages/Read").then((m) => ({ default: m.Read })));
const Pieces = lazy(() => import("./pages/Pieces").then((m) => ({ default: m.Pieces })));
const PiecePage = lazy(() => import("./pages/PiecePage").then((m) => ({ default: m.PiecePage })));
const Goals = lazy(() => import("./pages/Goals").then((m) => ({ default: m.Goals })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>
        <Suspense fallback={<div className="route-loading" aria-label="Loading" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:lessonId" element={<LessonPage />} />
            <Route path="/read" element={<Read />} />
            <Route path="/pieces" element={<Pieces />} />
            <Route path="/pieces/:pieceId" element={<PiecePage />} />
            <Route path="/goals" element={<Goals />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
