import React, { useState, useEffect } from 'react';
import AudioCard from '../components/AudioCard';
import api from '../api';
import './../components/css/components.css';

const AudioSection = () => {
  const [audios, setAudios] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchAudios();
  }, [showTimeline]);

  const fetchAudios = async () => {
    try {
      const endpoint = showTimeline ? '/api/audios/timeline' : '/api/audios';
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await api.get(endpoint, { headers });
      setAudios(response.data.audios || []);
    } catch (error) {
      console.error('Error fetching audios', error);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    console.log('Uploading audio file:', file);
    console.log('File name:', file?.name);
    console.log('File size:', file?.size);
    console.log('File type:', file?.type);
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('audio', file);

    const headers = {};
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await api.post('/api/audios/upload', formData, { headers });
      console.log('Upload response:', response.data);
      alert('Audio uploaded successfully!');
      setShowUploadForm(false);
      setTitle('');
      setDescription('');
      setFile(null);
      fetchAudios(); // Refresh the list
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response?.data);
      alert('Error uploading: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAudioDelete = (audioId) => {
    setAudios(audios.filter(audio => audio.id !== audioId));
  };

  return (
    <div className="section-container">
      <h2 className="section-title">Music</h2>
      <div className="cta-buttons" style={{ marginBottom: '2rem' }}>
        <button
          className="auth-btn"
          onClick={() => setShowTimeline(!showTimeline)}
        >
          {showTimeline ? 'Show All Audios' : 'Show My Timeline'}
        </button>
        <button
          className="post-btn"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          {showUploadForm ? 'Cancel Upload' : 'Upload New Audio'}
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="upload-form-container">
          <h3>Upload Audio</h3>
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
              accept="audio/*"
            />
            <button type="submit" className="post-btn" style={{ width: '100%' }}>Upload Audio</button>
          </form>
        </div>
      )}

      <div className="audio-list">
        {audios.map((audio) => (
          <AudioCard key={audio.id} audio={audio} onDelete={handleAudioDelete} />
        ))}
      </div>
    </div>
  );
};

export default AudioSection;
