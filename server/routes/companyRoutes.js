const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * @route   GET /api/companies/search
 * @desc    Search companies using Clearbit Autocomplete API (FREE, no API key needed)
 * @access  Public
 */
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({
                success: true,
                data: { companies: [] }
            });
        }

        // Clearbit Autocomplete API - FREE, no API key required
        const apiUrl = 'https://autocomplete.clearbit.com/v1/companies/suggest';

        console.log('Searching Clearbit for:', q);

        const response = await axios.get(apiUrl, {
            params: { query: q },
            timeout: 10000,
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log('Clearbit response:', response.data?.length || 0, 'companies found');

        // Clearbit returns array directly: [{name, domain, logo}, ...]
        const companies = (response.data || []).map(company => ({
            name: company.name,
            domain: company.domain,
            logo: company.logo,
            // Derive additional info from domain
            website: company.domain ? `https://${company.domain}` : ''
        }));

        console.log(`Found ${companies.length} companies for "${q}"`);

        res.json({
            success: true,
            data: {
                companies,
                total: companies.length
            }
        });

    } catch (error) {
        console.error('Clearbit API error:', error.message);

        // If API fails, return empty with warning
        res.json({
            success: true,
            data: {
                companies: [],
                apiError: true,
                message: 'Company validation service temporarily unavailable'
            }
        });
    }
});

/**
 * @route   GET /api/companies/validate
 * @desc    Validate a specific company name using Clearbit
 * @access  Public
 */
router.get('/validate', async (req, res) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Company name is required'
            });
        }

        const apiUrl = 'https://autocomplete.clearbit.com/v1/companies/suggest';

        const response = await axios.get(apiUrl, {
            params: { query: name },
            timeout: 10000
        });

        const companies = response.data || [];

        // Check if any company matches closely
        const exactMatch = companies.find(c =>
            c.name.toLowerCase() === name.toLowerCase()
        );

        const closeMatches = companies.filter(c =>
            c.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(c.name.toLowerCase())
        );

        res.json({
            success: true,
            data: {
                isValid: !!exactMatch || closeMatches.length > 0,
                exactMatch: exactMatch ? {
                    name: exactMatch.name,
                    domain: exactMatch.domain,
                    logo: exactMatch.logo
                } : null,
                suggestions: closeMatches.slice(0, 5).map(c => ({
                    name: c.name,
                    domain: c.domain,
                    logo: c.logo
                }))
            }
        });

    } catch (error) {
        console.error('Company validation error:', error.message);

        res.json({
            success: true,
            data: {
                isValid: true,
                apiError: true,
                message: 'Validation service unavailable'
            }
        });
    }
});

module.exports = router;
