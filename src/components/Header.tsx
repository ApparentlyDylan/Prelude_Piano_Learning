import { Link, NavLink } from "react-router-dom";
import "./header.css";

const links = [
  { to: "/learn", label: "Curriculum" },
  { to: "/read", label: "Read Music" },
  { to: "/pieces", label: "Pieces" },
  { to: "/goals", label: "Goals" },
];

export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="site-header__brand">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="7" fill="var(--ink)" />
            <rect x="7" y="8" width="3.2" height="16" rx="1" fill="var(--bg)" />
            <rect x="11.6" y="8" width="3.2" height="16" rx="1" fill="var(--bg)" />
            <rect x="16.2" y="8" width="3.2" height="16" rx="1" fill="var(--bg)" />
            <rect x="20.8" y="8" width="3.2" height="16" rx="1" fill="var(--bg)" />
            <rect x="9.6" y="8" width="2.4" height="9.5" rx="0.8" fill="var(--accent)" />
            <rect x="18.4" y="8" width="2.4" height="9.5" rx="0.8" fill="var(--accent)" />
          </svg>
          <span>Prelude</span>
        </Link>
        <nav className="site-header__nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `site-header__link${isActive ? " is-active" : ""}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/pieces" className="btn btn--primary btn--sm site-header__cta">
          Start playing
        </Link>
      </div>
    </header>
  );
}
