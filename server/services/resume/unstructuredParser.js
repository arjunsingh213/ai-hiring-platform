const mammoth = require('mammoth');

class UnstructuredParser {
    /**
     * Parse PDF from buffer using Unstructured REST API
     * @param {Buffer} buffer - PDF file buffer
     * @param {string} filename - Original filename
     * @returns {Promise<string>} - Extracted plain text
     */

    /**
     * Parse PDF from buffer using Unstructured API
     * @param {Buffer} buffer - PDF file buffer
     * @param {string} filename - Original filename
     * @returns {Promise<string>} - Extracted plain text
     */
    async parsePDFFromBuffer(buffer, filename = 'resume.pdf') {
        // Try Unstructured API first
        try {
            console.log('[UnstructuredParser] Starting PDF parsing with REST API...');

            const axios = require('axios');
            const FormData = require('form-data');

            // Create form data
            const formData = new FormData();
            formData.append('files', buffer, {
                filename: filename,
                contentType: 'application/pdf'
            });
            formData.append('strategy', 'auto');

            // Call Unstructured API (correct endpoint from user's account)
            const response = await axios.post(
                'https://api.unstructuredapp.io/general/v0/general',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'unstructured-api-key': process.env.UNSTRUCTURED_API_KEY,
                    },
                    maxBodyLength: Infinity,
                    timeout: 30000, // 30 second timeout
                }
            );

            console.log('[UnstructuredParser] API Response:', response.status);

            // Extract text from elements
            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                const cleanText = response.data
                    .map(element => element.text)
                    .filter(Boolean)
                    .join('\n');

                console.log(`[UnstructuredParser] PDF parsed successfully. Text length: ${cleanText.length}`);
                return cleanText;
            }

            console.warn('[UnstructuredParser] No elements in API response, trying fallback...');
            throw new Error('No elements returned from Unstructured API');

        } catch (error) {
            // Log detailed error information
            if (error.response) {
                console.error('[UnstructuredParser] API Error Details:');
                console.error('  Status:', error.response.status);
                console.error('  StatusText:', error.response.statusText);
                console.error('  Data:', JSON.stringify(error.response.data, null, 2));
                console.error('  Headers:', error.response.headers);
            } else {
                console.error('[UnstructuredParser] Unstructured API error:', error.message);
            }

            // Fallback to pdf-parse if Unstructured fails
            console.log('[UnstructuredParser] Falling back to pdf-parse...');
            try {
                const pdf = require('pdf-parse');
                const pdfData = await pdf(buffer);
                const text = pdfData.text || '';
                console.log(`[UnstructuredParser] Fallback successful. Text length: ${text.length}`);
                return text;
            } catch (fallbackError) {
                console.error('[UnstructuredParser] Fallback also failed:', fallbackError.message);
                return ''; // Return empty string to allow graceful continuation
            }
        }
    }

    /**
     * Parse DOCX from buffer using Mammoth
     * @param {Buffer} buffer - DOCX file buffer
     * @returns {Promise<string>} - Extracted plain text
     */
    async parseDOCXFromBuffer(buffer) {
        try {
            console.log('[UnstructuredParser] Starting DOCX parsing...');

            // Use mammoth to extract raw text
            const result = await mammoth.extractRawText({ buffer: buffer });
            const cleanText = result.value;

            console.log(`[UnstructuredParser] DOCX parsed successfully. Text length: ${cleanText.length}`);
            return cleanText;

        } catch (error) {
            console.error('[UnstructuredParser] DOCX parsing error:', error.message);
            throw new Error('Failed to parse DOCX: ' + error.message);
        }
    }

    /**
     * Main parsing method - detects file type and uses appropriate parser
     * @param {Buffer} buffer - File buffer
     * @param {string} mimeType - MIME type of the file
     * @param {string} filename - Original filename
     * @returns {Promise<string>} - Extracted plain text
     */
    async parseResumeFromBuffer(buffer, mimeType, filename = 'resume') {
        try {
            if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
                return await this.parsePDFFromBuffer(buffer, filename);
            } else if (
                mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                filename.endsWith('.docx')
            ) {
                return await this.parseDOCXFromBuffer(buffer);
            } else {
                throw new Error('Unsupported file type: ' + mimeType);
            }
        } catch (error) {
            console.error('[UnstructuredParser] Parse error:', error.message);
            // Return empty string on error to allow graceful fallback
            return '';
        }
    }

    /**
     * Clean and sanitize extracted text
     * @param {string} text - Raw extracted text
     * @returns {string} - Cleaned text
     */
    cleanText(text) {
        if (!text) return '';

        return text
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            // Remove multiple newlines
            .replace(/\n{3,}/g, '\n\n')
            // Trim each line
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .join('\n')
            .trim();
    }
}

module.exports = new UnstructuredParser();
