import { Route, Routes } from "react-router-dom";
import EditorRoute from "./routes/EditorRoute.tsx";
import GalleryRoute from "./routes/GalleryRoute.tsx";

export default function App() {
  return (
    <div className="min-h-dvh bg-paper text-ink flex flex-col">
      <header className="border-b border-rule px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Cognition Merch Designer</h1>
      </header>
      <main className="flex-1 px-6 py-6">
        <Routes>
          <Route path="/" element={<EditorRoute />} />
          <Route path="/designs" element={<GalleryRoute />} />
        </Routes>
      </main>
      <footer className="border-t border-rule px-6 py-3 text-sm text-muted">
        Designs are saved in this browser only. Downloads are mockups, not production artwork.
      </footer>
    </div>
  );
}
