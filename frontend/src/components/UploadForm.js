import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const UploadForm = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [type, setType] = useState('photo');
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Submitting upload');
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        if (type === 'photo') formData.append('photo', file);
        if (type === 'audio') formData.append('audio', file);
        if (type === 'video') formData.append('video', file);

        // Use full backend URL
        let endpoint = 'http://localhost:5000/api/photos/upload';
        if (type === 'audio') endpoint = 'http://localhost:5000/api/audios/upload';
        if (type === 'video') endpoint = 'http://localhost:5000/api/videos/upload';

        const headers = {};
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        axios.post(endpoint, formData, { headers })
            .then(response => {
                alert(response.data.message || 'Upload successful!');
                navigate('/feed');
            })
            .catch(error => {
                alert('Error uploading: ' + (error.response?.data?.error || error.message));
                console.error('Error uploading:', error);
            });
    };

    return (
        <div className="section-container">
            <h1 className="section-title">Upload Content</h1>
            <div className="upload-form-container">
                <form onSubmit={handleSubmit}>
                    <label style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Content Type</label>
                    <select 
                        value={type} 
                        onChange={e => setType(e.target.value)}
                        className="themed-input"
                        style={{ cursor: 'pointer' }}
                    >
                        <option value="photo">Photo</option>
                        <option value="audio">Audio</option>
                        <option value="video">Video</option>
                    </select>
                    
                    <input 
                        type="text" 
                        placeholder="Title" 
                        className="themed-input"
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        required
                    />
                    
                    <textarea
                        placeholder="Description"
                        className="themed-textarea"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="5"
                    />
                    
                    <input 
                        type="file" 
                        className="themed-input"
                        onChange={handleFileChange} 
                        required 
                    />
                    
                    <button type="submit" className="post-btn" style={{ width: '100%', marginTop: '1rem' }}>
                        Start Upload
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UploadForm;
