import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaImages, FaMusic, FaVideo } from 'react-icons/fa';
import './../components/css/components.css';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Explore TalentHub</h1>
      <div className="dashboard-grid">
        
        <div className="module-card" onClick={() => navigate('/photos')}>
          <FaImages size={40} color="#6366f1" style={{ marginBottom: '1rem' }} />
          <h2>Images</h2>
          <p>Explore stunning photography and visual arts shared by our community.</p>
        </div>

        <div className="module-card" onClick={() => navigate('/music')}>
          <FaMusic size={40} color="#ec4899" style={{ marginBottom: '1rem' }} />
          <h2>Audios</h2>
          <p>Discover new sounds, music, and audio experiences.</p>
        </div>

        <div className="module-card" onClick={() => navigate('/videos')}>
          <FaVideo size={40} color="#f59e0b" style={{ marginBottom: '1rem' }} />
          <h2>Videos</h2>
          <p>Watch and enjoy trending video content from creators worldwide.</p>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
