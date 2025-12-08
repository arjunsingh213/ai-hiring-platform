import React, { useState, useRef, useEffect } from 'react';
import './CommentInput.css';

const CommentInput = ({ postId, onSubmit, onCancel, isOpen }) => {
    const [comment, setComment] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (comment.trim()) {
            onSubmit(comment.trim());
            setComment('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const handleCancel = () => {
        setComment('');
        onCancel();
    };

    if (!isOpen) return null;

    return (
        <div className="comment-input-container">
            <div className="comment-input-wrapper">
                <textarea
                    ref={inputRef}
                    className="comment-input"
                    placeholder="Write a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                />
                <div className="comment-input-actions">
                    <button
                        className="comment-btn comment-btn-cancel"
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="comment-btn comment-btn-post"
                        onClick={handleSubmit}
                        disabled={!comment.trim()}
                    >
                        Post
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentInput;
