import React, { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api'; // Ensure you have this or use fetch
import { useToast } from './Toast'; // Ensure you have this Toast component
import './ContactForm.css'; // We'll need to create this CSS file

const ContactForm = ({ userEndpoint = false }) => {
    const [formData, setFormData] = useState({
        name: localStorage.getItem('userName') || '',
        email: localStorage.getItem('userEmail') || '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState('idle'); // idle, sending, success, error
    const toast = useToast();

    // Use built-in fetch if api service isn't available or compatible
    const submitContact = async (data) => {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${baseUrl}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...data,
                role: localStorage.getItem('userRole') || 'visitor'
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to send');
        return result;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');

        try {
            await submitContact(formData);
            setStatus('success');
            toast.success('Message sent! We\'ll get back to you soon.');
            setFormData(prev => ({ ...prev, subject: '', message: '' }));
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            console.error('Contact error:', error);
            setStatus('error');
            toast.error('Failed to send message. Please try again.');
        }
    };

    return (
        <div className="contact-form-container">
            <motion.div
                className="contact-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="form-header">
                    <h3>Get in Touch</h3>
                    <p>Have questions or feedback? We'd love to hear from you.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Your Name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Subject</label>
                        <select
                            value={formData.subject}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            required
                        >
                            <option value="">Select a topic...</option>
                            <option value="General Inquiry">General Inquiry</option>
                            <option value="Technical Support">Technical Support</option>
                            <option value="Billing">Billing Issue</option>
                            <option value="Feature Request">Feature Request</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Message</label>
                        <textarea
                            value={formData.message}
                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                            placeholder="How can we help you?"
                            rows={5}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className={`submit-btn ${status}`}
                        disabled={status === 'sending' || status === 'success'}
                    >
                        {status === 'sending' ? (
                            <span className="force-flex">
                                <span className="spinner"></span> Sending...
                            </span>
                        ) : status === 'success' ? (
                            <span className="force-flex">
                                ✓ Sent Successfully
                            </span>
                        ) : (
                            <span className="force-flex">
                                Send Message
                            </span>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default ContactForm;
