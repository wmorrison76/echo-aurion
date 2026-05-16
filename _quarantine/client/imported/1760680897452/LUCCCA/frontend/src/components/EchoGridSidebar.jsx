// File: components/EchoGridSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  BookOpen,
  ChefHat,
  Martini,
  ShoppingCart,
  Boxes,
  Users,
  Clock,
  HelpCircle,
  Settings,
  Network,
} from "lucide-react";
import "../styles/EchoGridSidebar.css"; // External CSS for TRON effects


const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: <Home /> },
  { to: "/kitchen", label: "Kitchen Library", icon: <BookOpen /> },
  { to: "/pastry", label: "Baking & Pastry", icon: <ChefHat /> },
  { to: "/mixology", label: "Mixology", icon: <Cocktail /> },
  { to: "/purchasing", label: "Purchasing", icon: <ShoppingCart /> },
  { to: "/inventory", label: "Inventory", icon: <Boxes /> },
  { to: "/crm", label: "CRM", icon: <Users /> },
  { to: "/schedules", label: "Schedules", icon: <Clock /> },
  { to: "/support", label: "Support", icon: <HelpCircle /> },
  { to: "/settings", label: "Settings", icon: <Settings /> },
  { to: "/chefnet", label: "ChefNet", icon: <Network /> },
];

const EchoGridSidebar = ({ isOpen, toggleSidebar, isDarkMode, toggleDarkMode }) => {
  return (
    <div className="sidebar-container">
      <div className="echo-header">
        <div className="projected-holo">LUCCCA SYSTEM</div>
        <div className="echo-tagline">Chef William • EchoGrid</div>
        <div className="quote-flare">
          "This is not a sidebar. This is a control ring — wrapped in light, precision, and purpose."
        </div>
      </div>

      <nav className="echo-nav">
        {navItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "nav-link active-link" : "nav-link"
            }
          >
            <span className="icon-wrapper">{item.icon}</span>
            <span className="label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="echo-footer">
        <div className="beam-toggle" title="Flip Sidebar Mode" onClick={toggleSidebar} />
        <div className="footer-holo">✨ ECHO GRID SIDEBAR — vTRON-X.0</div>
      </div>

      {/* SVG Grid Background */}
      <div className="grid-overlay" />
    </div>
  );
};

export default EchoGridSidebar;
