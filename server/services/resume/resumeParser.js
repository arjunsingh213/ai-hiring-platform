const pdfjsLib = require('pdfjs-dist');
const mammoth = require('mammoth');
const fs = require('fs').promises;

class ResumeParser {
    /**
     * Parse resume file (PDF or DOCX)
     */
    async parseResume(filePath, fileType) {
        try {
            let rawText = '';

            if (fileType === 'application/pdf') {
                rawText = await this.parsePDF(filePath);
            } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                rawText = await this.parseDOCX(filePath);
            } else {
                throw new Error('Unsupported file type');
            }

            // Extract structured data from raw text
            const parsedData = await this.extractData(rawText);

            return {
                rawText,
                ...parsedData
            };
        } catch (error) {
            console.error('Error parsing resume:', error);
            throw new Error('Failed to parse resume');
        }
    }

    /**
     * Parse PDF file
     */
    async parsePDF(filePath) {
        try {
            const dataBuffer = await fs.readFile(filePath);
            const data = new Uint8Array(dataBuffer);
            const loadingTask = pdfjsLib.getDocument({ data });
            const pdfDocument = await loadingTask.promise;

            let fullText = '';

            for (let i = 1; i <= pdfDocument.numPages; i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }

            return fullText;
        } catch (error) {
            console.error('Error parsing PDF:', error);
            throw error;
        }
    }

    /**
     * Parse DOCX file
     */
    async parseDOCX(filePath) {
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } catch (error) {
            console.error('Error parsing DOCX:', error);
            throw error;
        }
    }

    /**
     * Extract structured data from raw text
     */
    async extractData(text) {
        const data = {
            skills: this.extractSkills(text),
            experience: this.extractExperience(text),
            education: this.extractEducation(text),
            projects: this.extractProjects(text),
            certifications: this.extractCertifications(text),
            languages: this.extractLanguages(text)
        };

        return data;
    }

    /**
     * Extract skills from text
     */
    extractSkills(text) {
        const skillKeywords = [
            // Programming languages
            'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go', 'Rust', 'TypeScript',
            // Web technologies
            'HTML', 'CSS', 'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'ASP.NET',
            // Databases
            'MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Oracle', 'SQL Server', 'SQLite', 'DynamoDB',
            // Cloud & DevOps
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'CI/CD', 'Terraform',
            // Mobile
            'React Native', 'Flutter', 'iOS', 'Android', 'Xamarin',
            // Data Science
            'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn',
            // Other
            'REST API', 'GraphQL', 'Microservices', 'Agile', 'Scrum', 'JIRA', 'Linux', 'Windows'
        ];

        const foundSkills = [];
        const lowerText = text.toLowerCase();

        for (const skill of skillKeywords) {
            if (lowerText.includes(skill.toLowerCase())) {
                foundSkills.push(skill);
            }
        }

        return [...new Set(foundSkills)]; // Remove duplicates
    }

    /**
     * Extract work experience
     */
    extractExperience(text) {
        const experiences = [];
        const lines = text.split('\n');

        // Look for common experience section headers
        const experienceHeaders = ['experience', 'work history', 'employment', 'professional experience'];
        let inExperienceSection = false;
        let currentExperience = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim().toLowerCase();

            // Check if we're entering experience section
            if (experienceHeaders.some(header => line.includes(header))) {
                inExperienceSection = true;
                continue;
            }

            // Check if we're leaving experience section
            if (inExperienceSection && (line.includes('education') || line.includes('skills') || line.includes('projects'))) {
                inExperienceSection = false;
                if (currentExperience) {
                    experiences.push(currentExperience);
                }
                break;
            }

            if (inExperienceSection && lines[i].trim()) {
                // Try to identify company and position
                if (this.looksLikeJobTitle(lines[i])) {
                    if (currentExperience) {
                        experiences.push(currentExperience);
                    }
                    currentExperience = {
                        position: lines[i].trim(),
                        company: lines[i + 1]?.trim() || '',
                        duration: this.extractDuration(lines[i + 2] || ''),
                        description: ''
                    };
                } else if (currentExperience) {
                    currentExperience.description += lines[i].trim() + ' ';
                }
            }
        }

        if (currentExperience) {
            experiences.push(currentExperience);
        }

        return experiences;
    }

    /**
     * Extract education
     */
    extractEducation(text) {
        const education = [];
        const lines = text.split('\n');

        const educationHeaders = ['education', 'academic', 'qualification'];
        let inEducationSection = false;

        const degreeKeywords = ['bachelor', 'master', 'phd', 'b.tech', 'm.tech', 'b.sc', 'm.sc', 'mba', 'degree'];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim().toLowerCase();

            if (educationHeaders.some(header => line.includes(header))) {
                inEducationSection = true;
                continue;
            }

            if (inEducationSection && (line.includes('experience') || line.includes('skills') || line.includes('projects'))) {
                break;
            }

            if (inEducationSection && degreeKeywords.some(keyword => line.includes(keyword))) {
                const yearMatch = lines[i].match(/\b(19|20)\d{2}\b/);
                education.push({
                    degree: lines[i].trim(),
                    institution: lines[i + 1]?.trim() || '',
                    year: yearMatch ? parseInt(yearMatch[0]) : null,
                    field: this.extractField(lines[i])
                });
            }
        }

        return education;
    }

    /**
     * Extract projects
     */
    extractProjects(text) {
        const projects = [];
        const lines = text.split('\n');

        const projectHeaders = ['projects', 'personal projects', 'academic projects'];
        let inProjectSection = false;
        let currentProject = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim().toLowerCase();

            if (projectHeaders.some(header => line.includes(header))) {
                inProjectSection = true;
                continue;
            }

            if (inProjectSection && (line.includes('experience') || line.includes('education') || line.includes('skills'))) {
                if (currentProject) {
                    projects.push(currentProject);
                }
                break;
            }

            if (inProjectSection && lines[i].trim() && lines[i].match(/^[A-Z]/)) {
                if (currentProject) {
                    projects.push(currentProject);
                }
                currentProject = {
                    name: lines[i].trim(),
                    description: lines[i + 1]?.trim() || '',
                    technologies: this.extractSkills(lines[i] + ' ' + (lines[i + 1] || ''))
                };
            }
        }

        if (currentProject) {
            projects.push(currentProject);
        }

        return projects;
    }

    /**
     * Extract certifications
     */
    extractCertifications(text) {
        const certifications = [];
        const certKeywords = ['certified', 'certification', 'certificate', 'aws', 'azure', 'google cloud', 'cisco'];

        const lines = text.split('\n');
        for (const line of lines) {
            if (certKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
                certifications.push(line.trim());
            }
        }

        return certifications;
    }

    /**
     * Extract languages
     */
    extractLanguages(text) {
        const languages = [];
        const languageKeywords = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'hindi', 'arabic'];

        const lowerText = text.toLowerCase();
        for (const lang of languageKeywords) {
            if (lowerText.includes(lang)) {
                languages.push(lang.charAt(0).toUpperCase() + lang.slice(1));
            }
        }

        return [...new Set(languages)];
    }

    /**
     * Helper: Check if line looks like a job title
     */
    looksLikeJobTitle(line) {
        const jobTitles = ['engineer', 'developer', 'manager', 'analyst', 'designer', 'consultant', 'architect', 'lead', 'senior', 'junior'];
        const lowerLine = line.toLowerCase();
        return jobTitles.some(title => lowerLine.includes(title));
    }

    /**
     * Helper: Extract duration from text
     */
    extractDuration(text) {
        const durationMatch = text.match(/(\d{4})\s*-\s*(\d{4}|present)/i);
        if (durationMatch) {
            return `${durationMatch[1]} - ${durationMatch[2]}`;
        }
        return text.trim();
    }

    /**
     * Helper: Extract field of study
     */
    extractField(text) {
        const fields = ['computer science', 'engineering', 'business', 'mathematics', 'physics', 'chemistry', 'biology'];
        const lowerText = text.toLowerCase();

        for (const field of fields) {
            if (lowerText.includes(field)) {
                return field.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            }
        }

        return '';
    }
}

module.exports = new ResumeParser();
