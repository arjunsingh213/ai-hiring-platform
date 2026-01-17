import React, { useState, useEffect, useRef } from 'react';
import { searchJobDomains } from '../data/expandedJobDomains';
import './JobDomainsInput.css'; // We'll assume basic styles or add them inline/to parent

const JobDomainsInput = ({ selectedDomains, onChange, maxDomains = 3 }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);

        if (value.length > 1) {
            const results = searchJobDomains(value);
            // Filter out already selected domains
            const filteredResults = results.filter(
                item => !selectedDomains.includes(item.domain)
            );
            setSuggestions(filteredResults);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelectDomain = (domain) => {
        if (selectedDomains.length >= maxDomains) return;

        onChange([...selectedDomains, domain]);
        setInputValue('');
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleRemoveDomain = (domainToRemove) => {
        onChange(selectedDomains.filter(d => d !== domainToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue) {
            e.preventDefault();
            // Allow adding custom value if no suggestion matched perfectly
            // But usually we prefer they pick from list. 
            // Let's allow custom if list key is pressed but valid.

            // For now, let's just make sure we don't submit form
        }
    };

    // Custom add on enter if it's a valid non-empty string and not in list
    const addCustomDomain = () => {
        if (inputValue.trim() && !selectedDomains.includes(inputValue.trim())) {
            if (selectedDomains.length >= maxDomains) return;
            onChange([...selectedDomains, inputValue.trim()]);
            setInputValue('');
            setShowSuggestions(false);
        }
    };

    return (
        <div className="job-domains-input-wrapper" ref={wrapperRef}>
            <div className="selected-domains-container">
                {selectedDomains.map((domain, index) => (
                    <div key={index} className="domain-chip animate-fade-in">
                        <span>{domain}</span>
                        <button
                            type="button"
                            onClick={() => handleRemoveDomain(domain)}
                            className="remove-domain-btn"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {selectedDomains.length < maxDomains && (
                <div className="domain-autocomplete-container">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => inputValue.length > 1 && setShowSuggestions(true)}
                        placeholder={selectedDomains.length === 0 ? "Search domains (e.g. Software, Marketing)..." : "Add another domain..."}
                        className="input domain-search-input"
                    />

                    {showSuggestions && (suggestions.length > 0 || inputValue.length > 2) && (
                        <div className="domain-suggestions-dropdown">
                            {suggestions.map((item) => (
                                <div
                                    key={item.id}
                                    className="domain-suggestion-item"
                                    onClick={() => handleSelectDomain(item.domain)}
                                >
                                    <div className="domain-name">{item.domain}</div>
                                    <div className="domain-roles">
                                        {item.roles.slice(0, 3).join(', ')}...
                                    </div>
                                </div>
                            ))}

                            {/* Allow adding custom if distinct */}
                            {inputValue.length > 2 && !suggestions.find(s => s.domain.toLowerCase() === inputValue.toLowerCase()) && (
                                <div
                                    className="domain-suggestion-item add-custom"
                                    onClick={addCustomDomain}
                                >
                                    <div className="domain-name">Add "{inputValue}"</div>
                                    <div className="domain-roles">Custom Domain</div>
                                </div>
                            )}

                            {suggestions.length === 0 && inputValue.length > 2 && (
                                <div className="no-suggestions">
                                    No matches found.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="domain-helper-text">
                {selectedDomains.length}/{maxDomains} domains selected
            </div>


        </div>
    );
};

export default JobDomainsInput;
