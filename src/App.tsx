import { BrowserRouter, Route, Routes } from "react-router";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<h1>Cognition Merch Designer</h1>} />
        <Route path="/designs" element={<h1>Saved designs</h1>} />
      </Routes>
    </BrowserRouter>
  );
}
