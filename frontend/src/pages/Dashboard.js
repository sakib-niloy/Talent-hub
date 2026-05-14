import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/css/styles.css';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container" style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-dark)', minHeight: '100vh' }}>
      <h1 style={{ color: 'var(--text-light)', marginBottom: '3rem' }}>Explore Your Talent Hub</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        <div className="module-card" onClick={() => navigate('/photos')} style={{ cursor: 'pointer', background: 'white', padding: '2rem', borderRadius: '15px', color: 'black' }}>
          <h2 style={{ color: 'var(--accent-photo)' }}>Images</h2>
          <p>Explore stunning photography and visual arts.</p>
        </div>

        <div className="module-card" onClick={() => navigate('/music')} style={{ cursor: 'pointer', background: '#181818', padding: '2rem', borderRadius: '15px', color: 'white' }}>
          <h2 style={{ color: 'var(--accent-audio)' }}>Audios</h2>
          <p>Discover new sounds and audio experiences.</p>
        </div>

        <div className="module-card" onClick={() => navigate('/videos')} style={{ cursor: 'pointer', background: '#0f0f0f', padding: '2rem', borderRadius: '15px', color: 'white' }}>
          <h2 style={{ color: 'var(--accent-video)' }}>Videos</h2>
          <p>Watch and enjoy trending video content.</p>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
