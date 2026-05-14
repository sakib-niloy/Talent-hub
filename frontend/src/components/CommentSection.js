import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const CommentSection = ({ contentType, contentId }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        api.get(`/api/comments?content_type=${contentType}&content_id=${contentId}`)
            .then(res => setComments(res.data.comments))
            .catch(err => console.error(err));
    }, [contentType, contentId]);

    const handleComment = async () => {
        if (!user) return alert('Please sign in');
        const token = localStorage.getItem('token');
        try {
            await api.post('/api/comments', { content_type: contentType, content_id: contentId, comment: newComment }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewComment('');
            // Simple refresh
            window.location.reload();
        } catch (err) {
            alert('Error adding comment');
        }
    };

    return (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #333', padding: '1rem 0' }}>
            <h4>Comments</h4>
            {comments.map(c => (
                <div key={c.id} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    <strong>{c.user?.name || 'Anonymous'}:</strong> {c.comment}
                </div>
            ))}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." style={{ flex: 1, padding: '0.5rem' }} />
                <button onClick={handleComment} style={{ padding: '0.5rem' }}>Post</button>
            </div>
        </div>
    );
};

export default CommentSection;
