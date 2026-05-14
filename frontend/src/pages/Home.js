import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home">
      <h1>Welcome to Talent Hub</h1>
      <p>Showcase your talents in videos, audios, and photography. Connect with others and explore amazing content!</p>
      <ul>
        <li><Link to="/music">Music Section</Link></li>
        <li><Link to="/videos">Video Section</Link></li>
        <li><Link to="/photos">Photo Section</Link></li>
        {/* Link to the user's feed */}
        <li><Link to="/feed">Go to Your Feed</Link></li>
      </ul>
    </div>
  );
};

export default Home;
