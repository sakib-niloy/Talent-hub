import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import VideoSection from './pages/videoSection';
import AudioSection from './pages/AudioSection';
import PhotoSection from './pages/PhotoSection';
import Feed from './pages/Feed';
// import FeedPage from './components/FeedPage';
import UploadForm from './components/UploadForm';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/signin" element={<Login />} />
          <Route path="/signup" element={<Register />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/videos" element={<VideoSection />} />
          <Route path="/music" element={<AudioSection />} />
          <Route path="/photos" element={<PhotoSection />} />
          <Route path="/upload" element={<UploadForm />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
