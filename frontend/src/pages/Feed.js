import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import AudioCard from '../components/AudioCard';
import VideoCard from '../components/VideoCard';
import PhotoCard from '../components/PhotoCard';

const Feed = () => {
    const [audios, setAudios] = useState([]);
    const [videos, setVideos] = useState([]);
    const [photos, setPhotos] = useState([]);

    useEffect(() => {
        const fetchAudio = async () => {
            const res = await api.get('/api/audios');
            setAudios(res.data.audios || []);
        };
        const fetchVideos = async () => {
            const res = await api.get('/api/videos');
            setVideos(res.data.videos || []);
        };
        const fetchPhotos = async () => {
            const res = await api.get('/api/photos');
            setPhotos(res.data.photos || []);
        };
        fetchAudio();
        fetchVideos();
        fetchPhotos();
    }, []);

    const handleAudioDelete = (id) => {
        setAudios(audios.filter(audio => audio.id !== id));
    };

    const handleVideoDelete = (id) => {
        setVideos(videos.filter(video => video.id !== id));
    };

    const handlePhotoDelete = (id) => {
        setPhotos(photos.filter(photo => photo.id !== id));
    };

    return (
        <div className="section-container">
            <div className="feed-header" style={{ width: '100%', maxWidth: '1400px' }}>
                <h2 className="section-title" style={{ margin: 0 }}>Community Feed</h2>
                <Link to="/upload"><button className="post-btn">Upload Content</button></Link>
            </div>
            
            <section className="feed-section">
                <h3>Audio</h3>
                <div className="audio-list">
                    {audios.map(audio => (
                        <AudioCard key={audio.id} audio={audio} onDelete={handleAudioDelete} />
                    ))}
                </div>
            </section>

            <section className="feed-section">
                <h3>Videos</h3>
                <div className="video-grid">
                    {videos.map(video => (
                        <VideoCard key={video.id} video={video} onDelete={handleVideoDelete} />
                    ))}
                </div>
            </section>

            <section className="feed-section">
                <h3>Photos</h3>
                <div className="photo-grid">
                    {photos.map(photo => (
                        <PhotoCard key={photo.id} photo={photo} onDelete={handlePhotoDelete} />
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Feed;
