import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './BatchManager.css';

const Icons = {
    users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    plus: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    loading: <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></svg>,
    zap: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    user: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
};

const BatchManager = ({ jobId, candidates = [] }) => {
    const [selectedCandidates, setSelectedCandidates] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateBatch, setShowCreateBatch] = useState(false);
    const [batchName, setBatchName] = useState('');
    const [creatingBatch, setCreatingBatch] = useState(false);

    useEffect(() => {
        fetchBatches();
    }, [jobId]);

    const fetchBatches = async () => {
        try {
            const response = await api.get(`/batches/job/${jobId}`);
            setBatches(response.data || []);
        } catch (error) {
            console.error('Error fetching batches:', error);
        }
    };

    const toggleCandidate = (id) => {
        if (selectedCandidates.includes(id)) {
            setSelectedCandidates(selectedCandidates.filter(c => c !== id));
        } else {
            setSelectedCandidates([...selectedCandidates, id]);
        }
    };

    const handleCreateBatch = async () => {
        if (!batchName || selectedCandidates.length === 0) return;

        setCreatingBatch(true);
        try {
            await api.post('/batches', {
                jobId,
                name: batchName,
                candidateIds: selectedCandidates
            });
            setBatchName('');
            setSelectedCandidates([]);
            setShowCreateBatch(false);
            fetchBatches();
        } catch (error) {
            console.error('Error creating batch:', error);
        } finally {
            setCreatingBatch(false);
        }
    };

    return (
        <div className="batch-manager">
            <div className="batch-header">
                <div className="title-group">
                    <h3>{Icons.users} Batch Management</h3>
                    <p>Group candidates for efficient round assignments</p>
                </div>
                <button
                    className="btn btn-primary create-batch-btn"
                    onClick={() => setShowCreateBatch(true)}
                    disabled={selectedCandidates.length === 0}
                >
                    {Icons.plus} Create Batch ({selectedCandidates.length})
                </button>
            </div>

            <div className="batch-content">
                <section className="candidates-list-section">
                    <h4>Available Candidates</h4>
                    <div className="candidate-grid">
                        {candidates.length > 0 ? candidates.map(candidate => (
                            <div
                                key={candidate._id || candidate.userId?._id}
                                className={`candidate-select-card ${selectedCandidates.includes(candidate.userId?._id) ? 'selected' : ''}`}
                                onClick={() => toggleCandidate(candidate.userId?._id)}
                            >
                                <div className="candidate-check">
                                    {selectedCandidates.includes(candidate.userId?._id) && Icons.check}
                                </div>
                                <img
                                    src={candidate.userId?.profile?.photo || 'https://via.placeholder.com/40'}
                                    alt={candidate.userId?.profile?.name}
                                    className="candidate-avatar"
                                />
                                <div className="candidate-info">
                                    <span className="name">{candidate.userId?.profile?.name}</span>
                                    <span className="email">{candidate.userId?.email}</span>
                                </div>
                            </div>
                        )) : (
                            <p className="no-data">No candidates available to batch.</p>
                        )}
                    </div>
                </section>

                <section className="active-batches-section">
                    <h4>Active Batches</h4>
                    <div className="batch-list">
                        {batches.length > 0 ? batches.map(batch => (
                            <div key={batch._id} className="batch-card">
                                <div className="batch-card-header">
                                    <h5>{batch.name}</h5>
                                    <span className="batch-count">{batch.candidateIds?.length} Candidates</span>
                                </div>
                                <div className="batch-status">
                                    <span className={`status-pill ${batch.stage}`}>Stage: {batch.stage}</span>
                                </div>
                                <div className="batch-actions">
                                    <button className="btn btn-sm btn-ghost">Assign Round</button>
                                </div>
                            </div>
                        )) : (
                            <p className="no-data">No batches created yet.</p>
                        )}
                    </div>
                </section>
            </div>

            {showCreateBatch && (
                <div className="batch-modal-overlay">
                    <div className="batch-modal">
                        <h3>Create New Batch</h3>
                        <p>You are creating a batch with {selectedCandidates.length} candidates.</p>
                        <div className="form-group">
                            <label>Batch Name</label>
                            <input
                                type="text"
                                value={batchName}
                                onChange={(e) => setBatchName(e.target.value)}
                                className="input"
                                placeholder="e.g. Technical Finalists - Q1"
                                autoFocus
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowCreateBatch(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCreateBatch}
                                disabled={creatingBatch || !batchName}
                            >
                                {creatingBatch ? Icons.loading : 'Confirm Create Batch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatchManager;
