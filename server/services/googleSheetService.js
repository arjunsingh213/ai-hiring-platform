const { google } = require('googleapis');
const User = require('../models/User');

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
];

// Define the columns/headers we expect in the sheet
const HEADERS = [
    'User ID',
    'Full Name',
    'Email',
    'Role',
    'Account Status',
    'Email Verified',
    'Phone',
    'Signup Date',
    'Last Login Date',
    'Total Interviews Attempted',
    'Total Interviews Completed',
    'Average Interview Score',
    'ATP Score',
    'Current Skill Focus',
    'Jobs Posted',
    'Active Jobs',
    'Total Candidates Interviewed',
    'Total Login Count',
    'Last Activity Timestamp',
    'Email Tag',
    'Email Campaign Status',
    'Priority Level',
    'Notes',
    'Created At',
    'Updated At'
];

class GoogleSheetService {
    constructor() {
        this.auth = null;
        this.sheets = null;
        this.spreadsheetId = process.env.GOOGLE_SHEETS_DOCUMENT_ID;
        this.isInitialized = false;

        // Don't initialize in constructor to gracefully handle missing env vars
    }

    /**
     * Initialize the Google Auth client
     */
    async initialize() {
        if (this.isInitialized) return true;

        try {
            const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
            const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

            if (!clientEmail || !privateKey) {
                console.warn('Google Sheets sync is disabled: Missing credentials in .env');
                return false;
            }

            if (!this.spreadsheetId) {
                console.warn('Google Sheets sync is disabled: Missing GOOGLE_SHEETS_DOCUMENT_ID in .env');
                return false;
            }

            this.auth = new google.auth.JWT({
                email: clientEmail,
                key: privateKey,
                scopes: SCOPES
            });

            this.sheets = google.sheets({ version: 'v4', auth: this.auth });

            // Check if sheet has headers
            await this._ensureHeaders();

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize GoogleSheetService:', error);
            return false;
        }
    }

    /**
     * Map a Mongoose User document to a Google Sheet row array
     */
    _mapUserToRow(user) {
        // Safe access helpers
        const profile = user.profile || {};
        const jobSeeker = user.jobSeekerProfile || {};
        const atp = user.aiTalentPassport || {};

        // Calculate average score
        let avgScore = 0;
        if (atp.completedInterviews > 0 && atp.interviewScores?.length > 0) {
            const latestScores = atp.interviewScores.slice(-5);
            avgScore = (latestScores.reduce((acc, curr) => acc + curr.score, 0) / latestScores.length).toFixed(1);
        }

        return [
            user._id?.toString() || '',
            profile.name || '',
            user.email || '',
            user.role || '',
            user.status || 'active',
            user.isVerified ? 'Yes' : 'No',
            profile.mobile || '',
            user.createdAt ? new Date(user.createdAt).toISOString() : '',
            user.lastLogin ? new Date(user.lastLogin).toISOString() : '',

            // Platform Activity
            atp.completedInterviews || 0, // Total Interviews Attempted (rough approximation)
            atp.completedInterviews || 0,
            avgScore || '',
            atp.talentScore || '',
            (jobSeeker.skills || []).join(', '),

            // Recruiter Metrics (placeholder, would require Job counting)
            '', // Jobs Posted
            '', // Active Jobs
            '', // Total Candidates Interviewed

            // Engagement Metrics
            user.totalLogins || 0, // Total Login Count
            user.lastActivity ? new Date(user.lastActivity).toISOString() : '',

            // Email automation
            '', // Email Tag
            'Not Contacted', // Campaign Status
            'Medium', // Priority Level
            '', // Notes

            // Metadata
            user.createdAt ? new Date(user.createdAt).toISOString() : '',
            new Date().toISOString()
        ];
    }

    /**
     * Ensure the target sheet has the correct headers
     */
    async _ensureHeaders() {
        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Sheet1!A1:Z1'
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0 || rows[0].length === 0) {
                // Sheet is empty, write headers
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: 'Sheet1!A1:Y1',
                    valueInputOption: 'RAW',
                    requestBody: {
                        values: [HEADERS]
                    }
                });

                // Format headers (bold)
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    requestBody: {
                        requests: [
                            {
                                repeatCell: {
                                    range: {
                                        sheetId: 0,
                                        startRowIndex: 0,
                                        endRowIndex: 1,
                                        startColumnIndex: 0,
                                        endColumnIndex: HEADERS.length
                                    },
                                    cell: {
                                        userEnteredFormat: {
                                            textFormat: { bold: true },
                                            backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                                        }
                                    },
                                    fields: 'userEnteredFormat(backgroundColor,textFormat)'
                                }
                            }
                        ]
                    }
                });
            }
        } catch (error) {
            console.error('Error ensuring Google Sheets headers:', error);
            // Non-fatal
        }
    }

    /**
     * Append a new user row to the end of the sheet
     */
    async appendUserRow(user) {
        if (!await this.initialize()) return;

        try {
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Sheet1!A:A',
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values: [this._mapUserToRow(user)]
                }
            });
        } catch (error) {
            console.error('GoogleSheetService Error appending row:', error.message);
        }
    }

    /**
     * Sync a single user (determines if append or update is needed)
     * Matches using Email
     */
    async syncUser(userDocument) {
        // Execute asynchronously without awaiting to prevent blocking the main thread
        this._syncUserLogic(userDocument).catch(err => {
            console.error('GoogleSheetService background sync error:', err.message);
        });
    }

    /**
     * Internal async logic for syncing
     */
    async _syncUserLogic(user) {
        if (!await this.initialize()) return;
        if (!user || !user.email) return;

        try {
            // Find row by email
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Sheet1!A:C' // A=ID, B=Name, C=Email
            });

            const rows = response.data.values || [];
            let rowIndex = -1;

            // Find matching email (skipping header)
            for (let i = 1; i < rows.length; i++) {
                if (rows[i][2] === user.email) {
                    rowIndex = i;
                    break;
                }
            }

            if (rowIndex === -1) {
                // Not found, append
                await this.appendUserRow(user);
            } else {
                // Found, update the specific row (rowIndex is 0-based, Sheets is 1-based)
                // We add 1 because Sheets is 1-based, so row 1 in array = row 2 in Sheets
                const sheetRow = rowIndex + 1;

                // Fetch the existing row first to preserve admin-editable columns (Tag, Campaign Status, Priority, Notes)
                // These are columns T, U, V, W (indices 19, 20, 21, 22)
                const existingRowData = await this.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: `Sheet1!T${sheetRow}:W${sheetRow}`
                });

                const newRowData = this._mapUserToRow(user);

                // Overwrite the mapped array with existing values if they exist
                if (existingRowData.data.values && existingRowData.data.values[0]) {
                    const existingCols = existingRowData.data.values[0];
                    if (existingCols[0]) newRowData[19] = existingCols[0];
                    if (existingCols[1]) newRowData[20] = existingCols[1];
                    if (existingCols[2]) newRowData[21] = existingCols[2];
                    if (existingCols[3]) newRowData[22] = existingCols[3];
                }

                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `Sheet1!A${sheetRow}:Y${sheetRow}`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: [newRowData]
                    }
                });
            }
        } catch (error) {
            console.error('GoogleSheetService syncUser error:', error.message);
        }
    }

    /**
     * Helper to export current sheet data for Admin
     * Note: Sheets API allows exporting as CSV/PDF via Drive API, 
     * but we don't have Drive auth scope. We can just export the raw data
     * and convert to CSV string on the server.
     */
    async exportSheetAsCSV() {
        if (!await this.initialize()) {
            throw new Error('Google Sheets API not configured or missing credentials');
        }

        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: 'Sheet1!A:Z'
        });

        const rows = response.data.values || [];

        // Convert array to CSV string safely handling commas and quotes
        const csvString = rows.map(row => {
            return row.map(cell => {
                const cellStr = cell ? String(cell) : '';
                // Escape quotes and wrap in quotes if contains comma or newline
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\\n') || cellStr.includes('\\r') || cellStr.includes('\n') || cellStr.includes('\r')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',');
        }).join('\n');

        return csvString;
    }
}

// Export single instance (Singleton pattern)
module.exports = new GoogleSheetService();
