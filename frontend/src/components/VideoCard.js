import React from 'react';
import { useAuth } from '../context/AuthContext';
import SocialActions from './SocialActions';
import CommentSection from './CommentSection';
import './css/components.css';

const VideoCard = ({ video, onDelete }) => {
  const { user } = useAuth();

  return (
    <div className="card-container video-card">
      <video controls src={`http://localhost:5000${video.video_url}`} className="card-video" />
      <div className="card-info">
        <h3>{video.title}</h3>
        <p>{video.description}</p>
        <SocialActions content_type="video" content_id={video.id} />
        {user?.is_admin && (
          <button onClick={() => onDelete(video.id)} className="admin-delete">Delete</button>
        )}
      </div>
    </div>
  );
};

export default VideoCard;
