import React from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import CommentSection from './CommentSection';
import './css/components.css';

const PhotoCard = ({ photo, onDelete }) => {
  const { user } = useAuth();

  const handleLike = async () => {
    if (!user) return alert('Please sign in to like.');
    const token = localStorage.getItem('token');
    try {
      await api.post(`/api/likes`, { content_type: 'photo', content_id: photo.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.reload();
    } catch (err) {
      alert('Error liking photo: ' + (err.response?.data?.error || 'Server Error'));
    }
  };

  const handleDelete = async () => {
    if (!user || !user.is_admin) return;
    try {
      await api.delete(`/api/admin/content/photo/${photo.id}`);
      onDelete(photo.id);
    } catch (err) {
      alert('Error deleting photo');
    }
  };

  return (
    <div className="photo-card" style={{border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden'}}>
      <img src={`http://localhost:5000${photo.photo_url}`} alt={photo.title} style={{width: '100%', height: '300px', objectFit: 'cover'}} />
      <div className="card-info" style={{padding: '1rem'}}>
        <h3 style={{margin: '0 0 0.5rem'}}>{photo.title}</h3>
        <p>{photo.description}</p>
        <div className="actions" style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
          <button onClick={handleLike} style={{background: 'var(--accent-photo)', color: 'white'}}>Like ({photo.likes})</button>
          {user?.is_admin && <button onClick={handleDelete} className="admin-delete">Delete</button>}
        </div>
        <CommentSection contentType="photo" contentId={photo.id} />
      </div>
    </div>
  );
};

export default PhotoCard;
