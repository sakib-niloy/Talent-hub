import React from 'react';
import { useAuth } from '../context/AuthContext';
import SocialActions from './SocialActions';
import CommentSection from './CommentSection';
import './css/components.css';

const PhotoCard = ({ photo, onDelete }) => {
  const { user } = useAuth();

  return (
    <div className="card-container">
      <img src={`http://localhost:5000${photo.photo_url}`} alt={photo.title} className="card-image" />
      <div className="card-info">
        <h3>{photo.title}</h3>
        <p>{photo.description}</p>
        <SocialActions content_type="photo" content_id={photo.id} />
        {user?.is_admin && (
          <button onClick={() => onDelete(photo.id)} className="admin-delete">Delete</button>
        )}
      </div>
    </div>
  );
};

export default PhotoCard;
