import React, { useState, useEffect } from 'react';
import VideoCard from '../components/VideoCard';
import api from '../api';
import './../components/css/components.css';

const VideoSection = () => {
  const [videos, setVideos] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, [showTimeline]);

  const fetchVideos = async () => {
    try {
      const endpoint = showTimeline ? '/api/videos/timeline' : '/api/videos';
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await api.get(endpoint, { headers });
      setVideos(response.data.videos || []);
    } catch (error) {
      console.error('Error fetching videos', error);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('video', file);

    const headers = {};
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      await api.post('/api/videos/upload', formData, { headers });
      alert('Video uploaded successfully!');
      setShowUploadForm(false);
      setTitle('');
      setDescription('');
      setFile(null);
      fetchVideos(); // Refresh the list
    } catch (error) {
      alert('Error uploading: ' + (error.response?.data?.error || error.message));
      console.error('Error uploading video:', error);
    }
  };

  const handleVideoDelete = (videoId) => {
    setVideos(videos.filter(video => video.id !== videoId));
  };

  return (
    <div className="section-container">
      <h2 className="section-title">Videos</h2>
      
      <div className="cta-buttons" style={{ marginBottom: '2rem' }}>
        <button
          className="auth-btn"
          onClick={() => setShowTimeline(!showTimeline)}
        >
          {showTimeline ? 'Show All Videos' : 'Show My Timeline'}
        </button>
        <button
          className="post-btn"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          {showUploadForm ? 'Cancel Upload' : 'Upload New Video'}
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="upload-form-container">
          <h3>Upload Video</h3>
          <form onSubmit={handleUpload}>
            <input 
              type="text" 
              placeholder="Title" 
              className="themed-input"
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required
            />
            <textarea
              placeholder="Description"
              className="themed-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
            />
            <input 
              type="file" 
              className="themed-input"
              onChange={handleFileChange} 
              required
              accept="video/*"
            />
            <button type="submit" className="post-btn" style={{ width: '100%' }}>Upload Video</button>
          </form>
        </div>
      )}

      <div className="video-grid">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} onDelete={handleVideoDelete} />
        ))}
      </div>
    </div>
  );
};

export default VideoSection;
