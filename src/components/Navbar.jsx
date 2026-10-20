import { Link, NavLink } from "react-router-dom";
import { Landmark } from "lucide-react";

export default function Navbar() {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="MonuVista home">
        <span className="brand-mark">
          <Landmark size={28} strokeWidth={1.7} />
        </span>
        <span>
          <strong>MONUVISTA</strong>
          <small>Discover. Learn. Preserve.</small>
        </span>
      </Link>

      <nav className="main-nav" aria-label="Primary navigation">
        <NavLink to="/">Home</NavLink>
        <a href="/#monuments">Monuments</a>
        <a href="/#explore">Explore</a>
        <a href="/#stories">Stories</a>
        <a href="/#about">About Us</a>
      </nav>

    </header>
  );
}
