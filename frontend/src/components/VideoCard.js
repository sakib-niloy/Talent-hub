import React from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import CommentSection from './CommentSection';
import './css/components.css';

const VideoCard = ({ video, onDelete }) => {
  const { user } = useAuth();

  const handleLike = async () => {
    if (!user) return alert('Please sign in to like.');
    const token = localStorage.getItem('token');
    try {
      await api.post(`/api/likes`, { content_type: 'video', content_id: video.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.reload();
    } catch (err) {
      alert('Error liking video: ' + (err.response?.data?.error || 'Server Error'));
    }
  };

  const handleDelete = async () => {
    if (!user || !user.is_admin) return;
    try {
      await api.delete(`/api/admin/content/video/${video.id}`);
      onDelete(video.id);
    } catch (err) {
      alert('Error deleting video');
    }
  };

  return (
    <div className="video-card" style={{marginBottom: '2rem', background: '#1a1a1a', borderRadius: '12px', overflow: 'hidden'}}>
      <div className="youtube-vibe">
        <video controls src={`http://localhost:5000${video.video_url}`} style={{width: '100%', aspectRatio: '16/9'}} />
        <div className="card-info" style={{padding: '1rem'}}>
          <h3 style={{margin: '0 0 0.5rem'}}>{video.title}</h3>
          <p style={{color: '#aaa'}}>{video.description}</p>
          <div className="actions" style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
            <button onClick={handleLike} style={{background: 'var(--accent-video)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px'}}>Like ({video.likes})</button>
            {user?.is_admin && <button onClick={handleDelete} className="admin-delete" style={{border: 'none', padding: '0.5rem 1rem', borderRadius: '4px'}}>Delete</button>}
          </div>
          <CommentSection contentType="video" contentId={video.id} />
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
