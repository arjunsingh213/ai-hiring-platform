import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../jobseeker/MessagingPage.css';

const RecruiterMessages = () => {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            const response = await api.get(`/messages/conversations/${userId}`);
            setConversations(response.data || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        }
    };

    const fetchMessages = async (conversationId) => {
        try {
            const response = await api.get(`/messages/conversation/${conversationId}`);
            setMessages(response.data || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleSelectConversation = (conversation) => {
        setSelectedConversation(conversation);
        fetchMessages(conversation._id);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        try {
            await api.post('/messages', {
                senderId: userId,
                receiverId: selectedConversation.participants.find(p => p !== userId),
                content: newMessage
            });
            setNewMessage('');
            fetchMessages(selectedConversation._id);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <div className="messaging-page">
            <h1>Messages</h1>
            <div className="messaging-container card">
                <div className="conversations-list">
                    <div className="conversations-header">
                        <h3>Conversations</h3>
                    </div>
                    {conversations.length === 0 ? (
                        <div className="empty-state">
                            <p>No conversations yet</p>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv._id}
                                className={`conversation-item ${selectedConversation?._id === conv._id ? 'active' : ''}`}
                                onClick={() => handleSelectConversation(conv)}
                            >
                                <div className="conversation-avatar">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" fill="var(--primary)" />
                                        <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="white" />
                                        <path d="M6 18C6 15.7909 7.79086 14 10 14H14C16.2091 14 18 15.7909 18 18V19H6V18Z" fill="white" />
                                    </svg>
                                </div>
                                <div className="conversation-info">
                                    <h4>{conv.otherUser?.profile?.name || 'Candidate'}</h4>
                                    <p className="text-muted">{conv.lastMessage?.content?.substring(0, 30)}...</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="messages-panel">
                    {selectedConversation ? (
                        <>
                            <div className="messages-header">
                                <h3>{selectedConversation.otherUser?.profile?.name || 'Candidate'}</h3>
                                <p className="text-muted">{selectedConversation.otherUser?.jobSeekerProfile?.profession}</p>
                            </div>
                            <div className="messages-list">
                                {messages.map((msg) => (
                                    <div
                                        key={msg._id}
                                        className={`message ${msg.senderId === userId ? 'sent' : 'received'}`}
                                    >
                                        <div className="message-content">
                                            <p>{msg.content}</p>
                                            <span className="message-time">
                                                {new Date(msg.createdAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="message-input">
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button className="btn btn-primary" onClick={handleSendMessage}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" />
                                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            <h3>Select a conversation</h3>
                            <p>Choose a candidate to start messaging</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecruiterMessages;
