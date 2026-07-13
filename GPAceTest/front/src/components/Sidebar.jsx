import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getDisplayName, getInitials, clearSession } from "../services/session";
import { DashboardIcon, PlannerIcon, TargetIcon, LogoutIcon, MenuIcon, CloseIcon } from "./Icons";
import "./Sidebar.css";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { to: "/courses", label: "Course Planner", icon: PlannerIcon },
  { to: "/fgo", label: "FGO Planner", icon: TargetIcon }
];

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = getDisplayName();
  const initials = getInitials(displayName);

  const handleLogout = () => {
    clearSession();
    window.location.href = "/login";
  };

  return (
    <header className="sidebar">
      <div className="sidebar-top-row">
        <Link to="/dashboard" className="logo">
          <img src={`${process.env.PUBLIC_URL}/logo192.png`} alt="GPAce" className="logo-icon" />
          <h2>GPAce</h2>
        </Link>

        <button
          type="button"
          className="sidebar-mobile-toggle"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <nav className={`nav-menu ${mobileOpen ? "nav-menu-open" : ""}`}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`nav-item ${location.pathname === to ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            <Icon width={18} height={18} />
            <span className="nav-label">{label}</span>
          </Link>
        ))}
      </nav>

      <div className={`user-profile ${mobileOpen ? "user-profile-open" : ""}`}>
        <div className="profile-avatar">{initials}</div>
        <div className="profile-info">
          <div className="profile-name">{displayName}</div>
          <Link className="profile-link" to="/profile" onClick={() => setMobileOpen(false)}>View Profile</Link>
        </div>
        <button className="logout-button" type="button" onClick={handleLogout}>
          <LogoutIcon width={16} height={16} />
          <span>Log out</span>
        </button>
      </div>
    </header>
  );
}
