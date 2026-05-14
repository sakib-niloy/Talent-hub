import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './css/Login.css'; // Reusing login css for similar styling

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password2: '',
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { signup } = useAuth();

    const { name, email, password, password2 } = formData;

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        if (password !== password2) {
            setError('Passwords do not match');
        } else {
            try {
                const response = await signup(email, password, name);
                console.log('User registered:', response.user);
                navigate('/feed');
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to register');
                console.error(err);
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2 className="login-title">Sign Up</h2>
                <p className="login-subtitle">Create your Talent Hub account</p>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={onSubmit}>
                    <div className="input-group">
                        <label htmlFor="name">Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={name}
                        onChange={onChange}
                        required
                    />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={onChange}
                        required
                    />
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={password}
                        onChange={onChange}
                        required
                    />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password2">Confirm Password</label>
                        <input
                            type="password"
                            id="password2"
                            name="password2"
                            value={password2}
                            onChange={onChange}
                            required
                        />
                    </div>
                    <button type="submit" className="login-button">Sign Up</button>
                </form>
                <p className="signup-link">
                    Already have an account? <Link to="/signin">Sign In</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;