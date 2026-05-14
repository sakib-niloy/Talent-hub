import React, { useState, useEffect } from 'react';
import PhotoCard from '../components/PhotoCard';
import api from '../api';

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
    <div className="photo-section">
      <h2>Photography</h2>
      <button
        onClick={() => setShowTimeline(!showTimeline)}
        style={{ marginBottom: '20px', padding: '10px 20px', marginRight: '10px' }}
      >
        {showTimeline ? 'Show All Photos (Feed)' : 'Show My Timeline'}
      </button>
      {/* Upload Button */}
      <button
        onClick={() => setShowUploadForm(!showUploadForm)}
        style={{ marginBottom: '20px', padding: '10px 20px' }}
      >
        {showUploadForm ? 'Cancel Upload' : 'Upload New Photo'}
      </button>

      {/* Upload Form */}
      {showUploadForm && (
        <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc' }}>
          <h3>Upload Photo</h3>
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
              accept="image/*"
              style={{ marginBottom: '10px' }}
            />
            <button type="submit" style={{ padding: '10px 20px' }}>Upload Photo</button>
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
