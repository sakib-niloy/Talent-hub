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
        <div>
            <Link to="/upload"><button>Upload</button></Link>
            <h2>Audio</h2>
            <div>
                {audios.map(audio => (
                    <AudioCard key={audio.id} audio={audio} onDelete={handleAudioDelete} />
                ))}
            </div>
            <h2>Videos</h2>
            <div>
                {videos.map(video => (
                    <VideoCard key={video.id} video={video} onDelete={handleVideoDelete} />
                ))}
            </div>
            <h2>Photos</h2>
            <div>
                {photos.map(photo => (
                    <PhotoCard key={photo.id} photo={photo} onDelete={handlePhotoDelete} />
                ))}
            </div>
        </div>
    );
};

export default Feed;
