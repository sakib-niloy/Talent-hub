import React from 'react';
import { useAuth } from '../context/AuthContext';
import SocialActions from './SocialActions';
import CommentSection from './CommentSection';
import { assetUrl } from '../config';
import './css/components.css';

const AudioCard = ({ audio, onDelete }) => {
  const { user } = useAuth();

  return (
    <div className="card-container audio-card">
      <div className="card-info">
        <h3>{audio.title}</h3>
        <p>{audio.description}</p>
        <audio controls src={assetUrl(audio.audio_url)} className="audio-player" />
        <SocialActions content_type="audio" content_id={audio.id} />
        {user?.is_admin && (
          <button onClick={() => onDelete(audio.id)} className="admin-delete">Delete</button>
        )}
      </div>
    </div>
  );
};

export default AudioCard;
