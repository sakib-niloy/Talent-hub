import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import './css/components.css';

const CommentSection = ({ contentType, contentId, onClose }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        fetchComments();
    }, [contentType, contentId]);

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchComments = async () => {
        try {
            const res = await api.get(`/api/comments?content_type=${contentType}&content_id=${contentId}`);
            setComments(res.data.comments);
        } catch (err) {
            console.error('Error fetching comments');
        }
    };

    const handleComment = async () => {
        if (!user) return alert('Please sign in');
        try {
            await api.post('/api/comments', { 
                content_type: contentType, 
                content_id: Number(contentId), 
                comment: newComment 
            }, { headers: getHeaders() });
            setNewComment('');
            fetchComments();
        } catch (err) {
            console.error('Error adding comment:', err);
            alert('Error adding comment: ' + (err.response?.data?.error || 'Server Error'));
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3>Comments</h3>
                <ul className="comment-list">
                    {comments.map(c => (
                        <li key={c.id} className="comment-item">
                            <strong>{c.user?.name || 'Anonymous'}:</strong> {c.comment}
                        </li>
                    ))}
                </ul>
                <div className="comment-input-area">
                    <input 
                        value={newComment} 
                        onChange={e => setNewComment(e.target.value)} 
                        placeholder="Write a comment..." 
                        className="comment-input" 
                    />
                    <button onClick={handleComment} className="post-btn">Post</button>
                </div>
            </div>
        </div>
    );
};

export default CommentSection;
