/**
 * AutocompleteInput Component
 * Provides autocomplete suggestions with "Other" option for custom input
 */

import React, { useState, useRef, useEffect } from 'react';
import './AutocompleteInput.css';

const AutocompleteInput = ({
    name,
    value,
    onChange,
    suggestions = [],
    searchFunction, // Optional: custom search function (like aishe-institutions-list)
    placeholder = '',
    label,
    required = false,
    error,
    allowOther = true, // Allow "Other" option for custom input
    otherValue = '', // Value for custom "Other" input
    onOtherChange, // Handler for "Other" input
    minChars = 2
}) => {
    const [inputValue, setInputValue] = useState(value || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [isOther, setIsOther] = useState(value === 'Other');
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Handle clicks outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update input when value prop changes
    useEffect(() => {
        setInputValue(value || '');
        setIsOther(value === 'Other');
    }, [value]);

    // Filter suggestions based on input - with debounce to prevent infinite loops
    useEffect(() => {
        if (inputValue.length < minChars) {
            // Only update if there are currently suggestions
            if (filteredSuggestions.length > 0) {
                setFilteredSuggestions([]);
            }
            return;
        }

        let results = [];

        if (searchFunction) {
            // Use custom search function (for aishe-institutions-list)
            try {
                results = searchFunction(inputValue, 8) || [];
            } catch (e) {
                console.error('Search function error:', e);
                results = [];
            }
        } else if (suggestions && suggestions.length > 0) {
            // Filter from provided suggestions array
            const query = inputValue.toLowerCase();
            results = suggestions
                .filter(s => typeof s === 'string' && s.toLowerCase().includes(query))
                .sort((a, b) => {
                    const aStarts = a.toLowerCase().startsWith(query);
                    const bStarts = b.toLowerCase().startsWith(query);
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                    return a.localeCompare(b);
                })
                .slice(0, 8);
        }

        // Add "Other" option if allowed and no exact match
        if (allowOther && inputValue.length >= minChars && results.length > 0) {
            const hasExactMatch = results.some(
                r => (typeof r === 'string' ? r : r?.name)?.toLowerCase() === inputValue.toLowerCase()
            );
            if (!hasExactMatch) {
                results.push({ isOtherOption: true, name: 'Other (Enter custom value)' });
            }
        }

        setFilteredSuggestions(results);
        // Intentionally NOT including 'suggestions' in deps to prevent infinite loop
        // The suggestions array is static and passed from parent
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputValue, searchFunction, allowOther, minChars]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setShowSuggestions(true);
        setActiveSuggestionIndex(0);

        // If they're typing, clear the "Other" state
        if (isOther) {
            setIsOther(false);
            onChange({ target: { name, value: newValue } });
        }
    };

    const handleSuggestionClick = (suggestion) => {
        if (suggestion.isOtherOption) {
            // User selected "Other"
            setIsOther(true);
            setInputValue('Other');
            onChange({ target: { name, value: 'Other' } });
        } else {
            // Normal suggestion
            const value = typeof suggestion === 'string' ? suggestion : suggestion.name;
            setInputValue(value);
            setIsOther(false);
            onChange({ target: { name, value } });
        }
        setShowSuggestions(false);
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions || filteredSuggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestionIndex(prev =>
                prev < filteredSuggestions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredSuggestions[activeSuggestionIndex]) {
                handleSuggestionClick(filteredSuggestions[activeSuggestionIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleFocus = () => {
        if (inputValue.length >= minChars) {
            setShowSuggestions(true);
        }
    };

    const getSuggestionDisplay = (suggestion) => {
        if (suggestion.isOtherOption) {
            return suggestion.name;
        }
        if (typeof suggestion === 'string') {
            return suggestion;
        }
        // For AISHE institutions: show name with state
        if (suggestion.state) {
            return `${suggestion.name} (${suggestion.district || suggestion.state})`;
        }
        return suggestion.name;
    };

    return (
        <div className="autocomplete-wrapper" ref={wrapperRef}>
            {label && (
                <label className="form-label">
                    {label} {required && '*'}
                </label>
            )}

            <input
                ref={inputRef}
                type="text"
                name={name}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                placeholder={placeholder}
                className={`input autocomplete-input ${error ? 'input-error' : ''}`}
                required={required}
                autoComplete="off"
            />

            {showSuggestions && filteredSuggestions.length > 0 && (
                <ul className="autocomplete-suggestions">
                    {filteredSuggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            className={`suggestion-item ${index === activeSuggestionIndex ? 'active' : ''} ${suggestion.isOtherOption ? 'other-option' : ''}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                        >
                            {suggestion.isOtherOption ? (
                                <span className="other-label">
                                    ➕ {suggestion.name}
                                </span>
                            ) : (
                                getSuggestionDisplay(suggestion)
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* Custom input field that appears when "Other" is selected */}
            {isOther && allowOther && onOtherChange && (
                <input
                    type="text"
                    value={otherValue}
                    onChange={(e) => onOtherChange(e.target.value)}
                    placeholder="Enter your custom value..."
                    className="input other-input"
                    autoFocus
                />
            )}

            {error && <span className="error-message">{error}</span>}
        </div>
    );
};

export default AutocompleteInput;
