import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import MonumentDetails from "./pages/MonumentDetails.jsx";
import Explorer3D from "./pages/Explorer3D.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/monuments/:id" element={<MonumentDetails />} />
        <Route path="/monuments/:id/3d" element={<Explorer3D />} />
      </Routes>
      <Footer />
    </div>
  );
}
