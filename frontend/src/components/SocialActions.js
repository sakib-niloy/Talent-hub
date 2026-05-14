import React, { useState, useEffect } from 'react';
import api from '../api';
import { FaHeart, FaComment, FaShare } from 'react-icons/fa';
import CommentSection from './CommentSection';
import './css/components.css';

const SocialActions = ({ content_type, content_id }) => {
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    fetchLikes();
  }, [content_type, content_id]);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchLikes = async () => {
    try {
      const res = await api.get(`/api/likes?content_type=${content_type}&content_id=${content_id}`);
      setLikes(res.data.count);
    } catch (err) {
      console.error('Failed to fetch likes');
    }
  };

  const handleLike = async () => {
    try {
      await api.post('/api/likes', { content_type, content_id }, { headers: getHeaders() });
      setIsLiked(true);
      fetchLikes();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to like content');
    }
  };

  return (
    <>
      <div className="social-actions">
        <button className={`action-btn ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
          <FaHeart /> {likes}
        </button>
        <button className="action-btn" onClick={() => setShowComments(true)}>
          <FaComment /> Comment
        </button>
        <button className="action-btn">
          <FaShare /> Share
        </button>
      </div>

      {showComments && (
        <CommentSection 
            contentType={content_type} 
            contentId={content_id} 
            onClose={() => setShowComments(false)} 
        />
      )}
    </>
  );
};

export default SocialActions;
