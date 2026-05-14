import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/css/styles.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/auth/google';
  };

  return (
    <div className="landing-container">
      <header className="hero">
        <h1>Welcome to Talent Hub</h1>
        <p>Your creativity, showcased.</p>
        <div className="cta-buttons">
          <button onClick={() => navigate('/signup')}>Sign Up</button>
          <button onClick={() => navigate('/signin')}>Sign In</button>
          <button onClick={handleGoogleLogin} className="google-btn">Continue with Google</button>
          <button onClick={() => navigate('/feed')} className="guest-btn">Guest Mode</button>
        </div>
      </header>
    </div>
  );
};

export default LandingPage;
