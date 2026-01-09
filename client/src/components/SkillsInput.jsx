import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './SkillsInput.css';

const SkillsInput = ({ value = [], onChange, placeholder = "Add skills..." }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    // Fetch suggestions from OpenSkills API
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (inputValue.length >= 2) {
                try {
                    // OpenSkills API endpoint
                    const response = await axios.get(
                        `https://api.ope nskillsnetwork.org/skills/search`,
                        {
                            params: {
                                q: inputValue,
                                limit: 10
                            },
                            timeout: 5000
                        }
                    );

                    if (response.data && response.data.skills) {
                        setSuggestions(response.data.skills.slice(0, 10));
                        setShowSuggestions(true);
                    }
                } catch (error) {
                    // Fallback to local filtering if API fails
                    console.log('OpenSkills API unavailable, using local suggestions');
                    const localSkills = getLocalSkillSuggestions(inputValue);
                    setSuggestions(localSkills);
                    setShowSuggestions(localSkills.length > 0);
                }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        };

        const debounceTimer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(debounceTimer);
    }, [inputValue]);

    //Local skill suggestions as fallback
    const getLocalSkillSuggestions = (query) => {
        const commonSkills = [
            'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go',
            'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring Boot',
            'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Cassandra', 'Oracle',
            'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'Git', 'CI/CD',
            'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn',
            'HTML', 'CSS', 'Sass', 'Tailwind CSS', 'Bootstrap',
            'REST API', 'GraphQL', 'Microservices', 'Agile', 'Scrum',
            'Communication', 'Leadership', 'Problem Solving', 'Teamwork', 'Critical Thinking'
        ];

        return commonSkills
            .filter(skill => skill.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10);
    };

    // Handle adding a skill
    const addSkill = (skill) => {
        const trimmedSkill = skill.trim();
        if (trimmedSkill && !value.includes(trimmedSkill)) {
            onChange([...value, trimmedSkill]);
            setInputValue('');
            setSuggestions([]);
            setShowSuggestions(false);
            inputRef.current?.focus();
        }
    };

    // Handle removing a skill
    const removeSkill = (skillToRemove) => {
        onChange(value.filter(skill => skill !== skillToRemove));
    };

    // Handle input key down
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                addSkill(suggestions[selectedIndex].name || suggestions[selectedIndex]);
            } else if (inputValue.trim()) {
                addSkill(inputValue);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev =>
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            // Remove last skill if backspace on empty input
            removeSkill(value[value.length - 1]);
        }
    };

    // Handle clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
                inputRef.current && !inputRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="skills-input-container">
            <div className="skills-input-wrapper">
                {/* Display selected skills as tags */}
                {value.map((skill, index) => (
                    <div key={index} className="skill-tag">
                        {skill}
                        <button
                            type="button"
                            className="skill-remove"
                            onClick={() => removeSkill(skill)}
                            aria-label={`Remove ${skill}`}
                        >
                            ×
                        </button>
                    </div>
                ))}

                {/* Input field */}
                <input
                    ref={inputRef}
                    type="text"
                    className="skills-input-field"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setSelectedIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => inputValue.length >= 2 && setShowSuggestions(true)}
                    placeholder={value.length === 0 ? placeholder : ''}
                />
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div ref={suggestionsRef} className="skills-suggestions">
                    {suggestions.map((suggestion, index) => {
                        const skillName = typeof suggestion === 'string' ? suggestion : suggestion.name;
                        return (
                            <div
                                key={index}
                                className={`skill-suggestion ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => addSkill(skillName)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                {skillName}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SkillsInput;
