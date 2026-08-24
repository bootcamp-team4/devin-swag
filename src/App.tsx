import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.tsx";
import EditorRoute from "./routes/EditorRoute.tsx";
import GalleryRoute from "./routes/GalleryRoute.tsx";
import NotFoundRoute from "./routes/NotFoundRoute.tsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<EditorRoute />} />
        <Route path="/designs" element={<GalleryRoute />} />
        <Route path="*" element={<NotFoundRoute />} />
      </Route>
    </Routes>
  );
}
