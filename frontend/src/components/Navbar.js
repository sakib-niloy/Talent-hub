import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './css/components.css'; // Add professional styling here

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar" style={{ background: '#000', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', borderBottom: '1px solid #333' }}>
      <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 'bold', textDecoration: 'none', color: '#fff' }}>TalentHub</Link>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <Link to="/dashboard" style={{ textDecoration: 'none', color: '#ccc' }}>Dashboard</Link>
        <Link to="/photos" style={{ textDecoration: 'none', color: '#ccc' }}>Images</Link>
        <Link to="/music" style={{ textDecoration: 'none', color: '#ccc' }}>Audios</Link>
        <Link to="/videos" style={{ textDecoration: 'none', color: '#ccc' }}>Videos</Link>
        {user ? (
          <>
            <span style={{ fontSize: '0.9rem' }}>{user.name}</span>
            <button onClick={logout} style={{ background: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/signin" style={{ textDecoration: 'none', color: '#fff' }}>Sign In</Link>
            <Link to="/signup" style={{ background: '#6366f1', padding: '0.5rem 1rem', borderRadius: '5px', textDecoration: 'none', color: '#fff' }}>Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
