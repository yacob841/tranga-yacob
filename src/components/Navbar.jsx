import React, { useState, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { ActivitySquare, BookOpen, Search, Settings, Server, Menu, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const { theme } = useTheme();
  const loc = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItem = (to, label, icon) => {
    const active = loc.pathname.startsWith(to);
    return (
      <Link to={to} className={`flex items-center gap-3 px-4 py-2 rounded-md ${active ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-white/2"}`} onClick={() => setIsMobileMenuOpen(false)}>
        {icon}
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <header className={`flex items-center justify-between p-4 shadow-lg`} style={{ backgroundColor: 'var(--color-surface)', borderBottomColor: 'var(--color-muted)' }}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-gradient-to-r from-primary to-accent text-white">
          <BookOpen size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tranga</h1>
          <div className="text-sm text-muted">Manga tracker & downloader</div>
        </div>
      </div>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-2">
        {navItem("/watchlist", "Watchlist", <BookOpen size={18} />)}
        {navItem("/search", "Search", <Search size={18} />)}
        {navItem("/jobs", "Jobs", <Server size={18} />)}
        {navItem("/settings", "Settings", <Settings size={18} />)}
      </nav>

      {/* Mobile Menu Button */}
      <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2">
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Dropdown */}
      <div className={`md:hidden fixed top-20 left-0 right-0 bg-var-surface p-4 shadow-lg border-b z-[9999] ${isMobileMenuOpen ? 'block' : 'hidden'}`} style={{ backgroundColor: 'var(--color-surface)' }}>
        {navItem("/watchlist", "Watchlist", <BookOpen size={18} />)}
        {navItem("/search", "Search", <Search size={18} />)}
        {navItem("/jobs", "Jobs", <Server size={18} />)}
        {navItem("/settings", "Settings", <Settings size={18} />)}
      </div>
    </header>
  );
}