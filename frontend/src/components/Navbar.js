import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaHome, FaImages, FaMusic, FaVideo, FaUserCircle, FaSignOutAlt, FaSignInAlt, FaUserPlus, FaMoon, FaSun } from 'react-icons/fa';
import './css/components.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <FaHome /> TalentHub
      </Link>
      <div className="navbar-links">
        <Link to="/dashboard" className="navbar-link">Dashboard</Link>
        <Link to="/photos" className="navbar-link"><FaImages /> Images</Link>
        <Link to="/music" className="navbar-link"><FaMusic /> Audios</Link>
        <Link to="/videos" className="navbar-link"><FaVideo /> Videos</Link>
        
        <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-color)' }}>
          {isDark ? <FaSun /> : <FaMoon />}
        </button>

        {user ? (
          <>
            <span className="navbar-link"><FaUserCircle /> {user.name}</span>
            <button onClick={logout} className="auth-btn"><FaSignOutAlt /> Logout</button>
          </>
        ) : (
          <>
            <Link to="/signin" className="navbar-link"><FaSignInAlt /> Sign In</Link>
            <Link to="/signup" className="signup-btn"><FaUserPlus /> Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
