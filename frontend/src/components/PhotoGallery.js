import { useState, useEffect } from 'react';
import axios from 'axios';

const PhotoGallery = () => {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await axios.get('/api/photos');
        setPhotos(response.data.photos);
      } catch (error) {
        console.error('Error fetching photos:', error);
      }
    };

    fetchPhotos();
  }, []);

  const handleLike = async (photoId) => {
    try {
      await axios.post(`/api/photos/like/${photoId}`);
      setPhotos(photos.map(photo => (
        photo.id === photoId ? { ...photo, likes: photo.likes + 1 } : photo
      )));
    } catch (error) {
      console.error('Error liking photo:', error);
    }
  };

  return (
    <div>
      {photos.map(photo => (
        <div key={photo.id}>
          <h2>{photo.title}</h2>
          <p>{photo.description}</p>
          <img src={photo.photo_url} alt={photo.title} />
          <p>Likes: {photo.likes}</p>
          <button onClick={() => handleLike(photo.id)}>Like</button>
          {/* Add a comment section here */}
        </div>
      ))}
    </div>
  );
};

export default PhotoGallery;
