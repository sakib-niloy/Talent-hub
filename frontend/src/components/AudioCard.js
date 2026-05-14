import React from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import CommentSection from './CommentSection';
import './css/components.css';

const AudioCard = ({ audio, onDelete }) => {
  const { user } = useAuth();

  const handleLike = async () => {
    if (!user) return alert('Please sign in to like.');
    const token = localStorage.getItem('token');
    try {
      await api.post(`/api/likes`, { content_type: 'audio', content_id: audio.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.reload();
    } catch (err) {
      alert('Error liking audio: ' + (err.response?.data?.error || 'Server Error'));
    }
  };

  const handleDelete = async () => {
    if (!user || !user.is_admin) return;
    try {
      await api.delete(`/api/admin/content/audio/${audio.id}`);
      onDelete(audio.id);
    } catch (err) {
      alert('Error deleting audio');
    }
  };

  return (
    <div className="audio-card" style={{padding: '1rem', background: '#181818', borderRadius: '12px', margin: '0.5rem'}}>
      <div className="spotify-vibe">
        <h3 style={{margin: '0 0 0.5rem', color: 'var(--accent-audio)'}}>{audio.title}</h3>
        <p style={{fontSize: '0.9rem', color: '#b3b3b3'}}>{audio.description}</p>
        <audio controls src={`http://localhost:5000${audio.audio_url}`} style={{width: '100%', marginTop: '0.5rem'}} />
        <div className="actions" style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
          <button onClick={handleLike} style={{background: 'var(--accent-audio)', color: 'black', border: 'none', padding: '0.5rem 1rem', borderRadius: '20px'}}>Like ({audio.likes})</button>
          {user?.is_admin && <button onClick={handleDelete} className="admin-delete" style={{border: 'none', padding: '0.5rem 1rem', borderRadius: '20px'}}>Delete</button>}
        </div>
        <CommentSection contentType="audio" contentId={audio.id} />
      </div>
    </div>
  );
};

export default AudioCard;
