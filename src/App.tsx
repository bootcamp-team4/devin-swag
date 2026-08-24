import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.tsx";
import ContactSheetRoute from "./routes/ContactSheetRoute.tsx";
import EditorRoute from "./routes/EditorRoute.tsx";
import GalleryRoute from "./routes/GalleryRoute.tsx";
import NotFoundRoute from "./routes/NotFoundRoute.tsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<EditorRoute />} />
        <Route path="/designs" element={<GalleryRoute />} />
        {/* Dev-only renderer reference page; not linked from the product UI. */}
        <Route path="/contact-sheet" element={<ContactSheetRoute />} />
        <Route path="*" element={<NotFoundRoute />} />
      </Route>
    </Routes>
  );
}
