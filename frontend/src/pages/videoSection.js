import React, { useState, useEffect } from 'react';
import VideoCard from '../components/VideoCard';
import api from '../api';
import './../components/css/components.css';

const VideoSection = () => {
  const [videos, setVideos] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await api.get('/api/videos');
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
    <div className="video-section">
      <h2>Videos</h2>
      
      {/* Upload Button */}
      <button 
        onClick={() => setShowUploadForm(!showUploadForm)}
        style={{ marginBottom: '20px', padding: '10px 20px' }}
      >
        {showUploadForm ? 'Cancel Upload' : 'Upload New Video'}
      </button>

      {/* Upload Form */}
      {showUploadForm && (
        <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc' }}>
          <h3>Upload Video</h3>
          <form onSubmit={handleUpload}>
            <input 
              type="text" 
              placeholder="Title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required
              style={{ marginBottom: '10px', width: '100%', padding: '5px' }}
            />
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ marginBottom: '10px', width: '100%', padding: '5px' }}
            />
            <input 
              type="file" 
              onChange={handleFileChange} 
              required
              accept="video/*"
              style={{ marginBottom: '10px' }}
            />
            <button type="submit" style={{ padding: '10px 20px' }}>Upload Video</button>
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
