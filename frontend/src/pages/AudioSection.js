import React, { useState, useEffect } from 'react';
import AudioCard from '../components/AudioCard';
import api from '../api';

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
    <div className="audio-section">
      <h2>Music</h2>
      <button
        onClick={() => setShowTimeline(!showTimeline)}
        style={{ marginBottom: '20px', padding: '10px 20px', marginRight: '10px' }}
      >
        {showTimeline ? 'Show All Audios (Feed)' : 'Show My Timeline'}
      </button>
      {/* Upload Button */}
      <button
        onClick={() => setShowUploadForm(!showUploadForm)}
        style={{ marginBottom: '20px', padding: '10px 20px' }}
      >
        {showUploadForm ? 'Cancel Upload' : 'Upload New Audio'}
      </button>

      {/* Upload Form */}
      {showUploadForm && (
        <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc' }}>
          <h3>Upload Audio</h3>
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
              accept="audio/*"
              style={{ marginBottom: '10px' }}
            />
            <button type="submit" style={{ padding: '10px 20px' }}>Upload Audio</button>
          </form>
        </div>
      )}

      <div className="audio-grid">
        {audios.map((audio) => (
          <AudioCard key={audio.id} audio={audio} onDelete={handleAudioDelete} />
        ))}
      </div>
    </div>
  );
};

export default AudioSection;
