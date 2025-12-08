const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OnboardingDocument = require('../models/OnboardingDocument');
const HiringProcess = require('../models/HiringProcess');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/onboarding-documents');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF, JPG, PNG, DOC, and DOCX files are allowed'));
        }
    }
});

// @route   GET /api/hiring/:hiringId/documents
// @desc    Get all documents for a hiring process
// @access  Private
router.get('/:hiringId/documents', async (req, res) => {
    try {
        const { hiringId } = req.params;

        const documents = await OnboardingDocument.find({ hiringProcessId: hiringId })
            .populate('verifiedBy', 'profile.name')
            .sort({ type: 1 });

        res.json({
            success: true,
            data: documents
        });
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

// @route   POST /api/hiring/:hiringId/documents/upload
// @desc    Upload a document
// @access  Private (Job Seeker only)
router.post('/:hiringId/documents/upload', upload.single('document'), async (req, res) => {
    try {
        const { hiringId } = req.params;
        const { documentId } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Find the document
        const document = await OnboardingDocument.findOne({
            _id: documentId,
            hiringProcessId: hiringId
        });

        if (!document) {
            // Delete uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete old file if exists
        if (document.fileUrl) {
            const oldFilePath = path.join(__dirname, '..', document.fileUrl);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        // Update document
        document.fileUrl = `/uploads/onboarding-documents/${req.file.filename}`;
        document.fileName = req.file.originalname;
        document.fileSize = req.file.size;
        document.fileType = req.file.mimetype;
        document.uploadedAt = new Date();
        document.status = 'uploaded';

        await document.save();

        // Update hiring process progress
        const hiringProcess = await HiringProcess.findById(hiringId);
        if (hiringProcess) {
            const uploadedDocs = await OnboardingDocument.countDocuments({
                hiringProcessId: hiringId,
                status: { $in: ['uploaded', 'verified'] }
            });
            hiringProcess.progress.documentsCompleted = uploadedDocs;
            await hiringProcess.save();
        }

        res.json({
            success: true,
            message: 'Document uploaded successfully',
            data: document
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        // Delete uploaded file on error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

// @route   PUT /api/hiring/:hiringId/documents/:docId/verify
// @desc    Verify a document
// @access  Private (Recruiter only)
router.put('/:hiringId/documents/:docId/verify', async (req, res) => {
    try {
        const { hiringId, docId } = req.params;
        const { verifiedBy, notes } = req.body;

        const document = await OnboardingDocument.findOne({
            _id: docId,
            hiringProcessId: hiringId
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        if (document.status !== 'uploaded') {
            return res.status(400).json({ error: 'Document must be uploaded before verification' });
        }

        document.status = 'verified';
        document.verifiedBy = verifiedBy;
        document.verifiedAt = new Date();
        document.notes = notes;

        await document.save();

        // Check if all required documents are verified
        const requiredDocs = await OnboardingDocument.countDocuments({
            hiringProcessId: hiringId,
            required: true
        });

        const verifiedDocs = await OnboardingDocument.countDocuments({
            hiringProcessId: hiringId,
            required: true,
            status: 'verified'
        });

        // Update hiring process
        const hiringProcess = await HiringProcess.findById(hiringId);
        if (hiringProcess) {
            if (requiredDocs === verifiedDocs) {
                hiringProcess.currentStage = 'documents_complete';
            }
            await hiringProcess.save();
        }

        res.json({
            success: true,
            message: 'Document verified successfully',
            data: document
        });
    } catch (error) {
        console.error('Error verifying document:', error);
        res.status(500).json({ error: 'Failed to verify document' });
    }
});

// @route   PUT /api/hiring/:hiringId/documents/:docId/reject
// @desc    Reject a document
// @access  Private (Recruiter only)
router.put('/:hiringId/documents/:docId/reject', async (req, res) => {
    try {
        const { hiringId, docId } = req.params;
        const { reason, verifiedBy } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const document = await OnboardingDocument.findOne({
            _id: docId,
            hiringProcessId: hiringId
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        document.status = 'rejected';
        document.rejectionReason = reason;
        document.verifiedBy = verifiedBy;
        document.verifiedAt = new Date();

        await document.save();

        res.json({
            success: true,
            message: 'Document rejected',
            data: document
        });
    } catch (error) {
        console.error('Error rejecting document:', error);
        res.status(500).json({ error: 'Failed to reject document' });
    }
});

// @route   DELETE /api/hiring/:hiringId/documents/:docId
// @desc    Delete a document
// @access  Private
router.delete('/:hiringId/documents/:docId', async (req, res) => {
    try {
        const { hiringId, docId } = req.params;

        const document = await OnboardingDocument.findOne({
            _id: docId,
            hiringProcessId: hiringId
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete file from filesystem
        if (document.fileUrl) {
            const filePath = path.join(__dirname, '..', document.fileUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Reset document to pending
        document.fileUrl = null;
        document.fileName = null;
        document.fileSize = null;
        document.fileType = null;
        document.uploadedAt = null;
        document.status = 'pending';
        document.verifiedBy = null;
        document.verifiedAt = null;
        document.rejectionReason = null;

        await document.save();

        // Update hiring process progress
        const hiringProcess = await HiringProcess.findById(hiringId);
        if (hiringProcess) {
            const uploadedDocs = await OnboardingDocument.countDocuments({
                hiringProcessId: hiringId,
                status: { $in: ['uploaded', 'verified'] }
            });
            hiringProcess.progress.documentsCompleted = uploadedDocs;
            await hiringProcess.save();
        }

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

module.exports = router;
