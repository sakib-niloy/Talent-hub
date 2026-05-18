import React, { useState, useEffect } from 'react';
import PhotoCard from '../components/PhotoCard';
import api from '../api';
import './../components/css/components.css';

const PhotoSection = () => {
  const [photos, setPhotos] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, [showTimeline]);

  const fetchPhotos = async () => {
    try {
      const endpoint = showTimeline ? '/api/photos/timeline' : '/api/photos';
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await api.get(endpoint, { headers });
      setPhotos(response.data.photos || []);
    } catch (error) {
      console.error('Error fetching photos', error);
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
    formData.append('photo', file);

    const headers = {};
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      await api.post('/api/photos/upload', formData, { headers });
      alert('Photo uploaded successfully!');
      setShowUploadForm(false);
      setTitle('');
      setDescription('');
      setFile(null);
      fetchPhotos(); // Refresh the list
    } catch (error) {
      alert('Error uploading: ' + (error.response?.data?.error || error.message));
      console.error('Error uploading photo:', error);
    }
  };

  const handlePhotoDelete = (photoId) => {
    setPhotos(photos.filter(photo => photo.id !== photoId));
  };

  return (
    <div className="section-container">
      <h2 className="section-title">Photography</h2>
      
      <div className="cta-buttons" style={{ marginBottom: '2rem' }}>
        <button
          className="auth-btn"
          onClick={() => setShowTimeline(!showTimeline)}
        >
          {showTimeline ? 'Show All Photos' : 'Show My Timeline'}
        </button>
        <button
          className="post-btn"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          {showUploadForm ? 'Cancel Upload' : 'Upload New Photo'}
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="upload-form-container">
          <h3>Upload Photo</h3>
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
              accept="image/*"
            />
            <button type="submit" className="post-btn" style={{ width: '100%' }}>Upload Photo</button>
          </form>
        </div>
      )}

      <div className="photo-grid">
        {photos.length > 0 ? (
          photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} onDelete={handlePhotoDelete} />
          ))
        ) : (
          <p>No photos to display.</p>
        )}
      </div>
    </div>
  );
};

export default PhotoSection;
