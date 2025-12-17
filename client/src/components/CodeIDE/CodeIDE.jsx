/**
 * CodeIDE Component
 * In-browser code editor with Monaco Editor for coding assessments
 */

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import api from '../../services/api';
import { useToast } from '../Toast';
import './CodeIDE.css';

const CodeIDE = ({
    language: initialLanguage = 'Python',
    languageId: initialLanguageId = 71,
    problem,
    onComplete,
    onSkip,
    timeLimit = 15 // minutes
}) => {
    const toast = useToast();
    const editorRef = useRef(null);

    // Supported languages with Judge0 IDs
    const SUPPORTED_LANGUAGES = [
        { name: 'Python', id: 71, extension: 'py', monacoId: 'python' },
        { name: 'JavaScript', id: 63, extension: 'js', monacoId: 'javascript' },
        { name: 'Java', id: 62, extension: 'java', monacoId: 'java' },
        { name: 'C++', id: 54, extension: 'cpp', monacoId: 'cpp' },
        { name: 'C', id: 50, extension: 'c', monacoId: 'c' },
        { name: 'C#', id: 51, extension: 'cs', monacoId: 'csharp' },
        { name: 'Go', id: 60, extension: 'go', monacoId: 'go' },
        { name: 'Ruby', id: 72, extension: 'rb', monacoId: 'ruby' },
        { name: 'TypeScript', id: 74, extension: 'ts', monacoId: 'typescript' }
    ];

    // Language-specific starter code templates
    const getStarterCode = (lang, problemDescription = '') => {
        const templates = {
            'Python': `# Your solution here
def solution():
    # Write your code here
    pass

# Test your solution
print(solution())`,
            'JavaScript': `// Your solution here
function solution() {
    // Write your code here
    
}

// Test your solution
console.log(solution());`,
            'Java': `// Your solution here
public class Solution {
    public static void main(String[] args) {
        // Write your code here
        
    }
}`,
            'C++': `// Your solution here
#include <iostream>
using namespace std;

int main() {
    // Write your code here
    
    return 0;
}`,
            'C': `// Your solution here
#include <stdio.h>

int main() {
    // Write your code here
    
    return 0;
}`,
            'C#': `// Your solution here
using System;

class Solution {
    static void Main() {
        // Write your code here
        
    }
}`,
            'Go': `// Your solution here
package main

import "fmt"

func main() {
    // Write your code here
    fmt.Println("Hello")
}`,
            'Ruby': `# Your solution here
def solution
    # Write your code here
    
end

# Test your solution
puts solution`,
            'TypeScript': `// Your solution here
function solution(): void {
    // Write your code here
    
}

// Test your solution
console.log(solution());`
        };
        return templates[lang] || templates['Python'];
    };

    // Fallback to first detected language or passed language - Use first in list
    const initialLang = SUPPORTED_LANGUAGES.find(l =>
        l.name.toLowerCase() === initialLanguage?.toLowerCase()
    ) || SUPPORTED_LANGUAGES.find(l => l.id === initialLanguageId) || SUPPORTED_LANGUAGES[0];

    const [selectedLanguage, setSelectedLanguage] = useState(initialLang);
    const [code, setCode] = useState(problem?.starterCode || getStarterCode(selectedLanguage.name));
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60);
    const [showHints, setShowHints] = useState(false);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [evaluation, setEvaluation] = useState(null);

    // Debug: Log the problem object received
    console.log('[CODE IDE] Problem received:', JSON.stringify(problem, null, 2)?.substring(0, 500));

    // Handle language change
    const handleLanguageChange = (e) => {
        const lang = SUPPORTED_LANGUAGES.find(l => l.name === e.target.value);
        if (lang) {
            setSelectedLanguage(lang);
            setCode(getStarterCode(lang.name));
            toast.info(`Switched to ${lang.name}`);
        }
    };

    // Monaco language is now handled via selectedLanguage.monacoId
    // This legacy mapping is kept for reference but not used
    const monacoLanguageMap = {
        'JavaScript': 'javascript',
        'Python': 'python',
        'Java': 'java',
        'C#': 'csharp',
        'C++': 'cpp',
        'C': 'c',
        'Go': 'go',
        'Ruby': 'ruby',
        'PHP': 'php',
        'TypeScript': 'typescript',
        'Rust': 'rust',
        'Kotlin': 'kotlin'
    };

    // Timer countdown
    useEffect(() => {
        if (timeRemaining <= 0) {
            handleTimeUp();
            return;
        }

        const timer = setInterval(() => {
            setTimeRemaining(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining]);

    // Update code when problem changes
    useEffect(() => {
        if (problem?.starterCode) {
            setCode(problem.starterCode);
        }
    }, [problem]);

    const handleTimeUp = () => {
        toast.warning('Time\'s up! Submitting your current solution...');
        handleSubmit();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEditorMount = (editor) => {
        editorRef.current = editor;
    };

    const runCode = async () => {
        setIsRunning(true);
        setOutput('Running code...\n');

        try {
            const response = await api.post('/code/execute', {
                code,
                language: selectedLanguage.name,
                languageId: selectedLanguage.id
            });

            if (response.success) {
                let outputText = '';
                if (response.compileOutput) {
                    outputText += `Compilation:\n${response.compileOutput}\n\n`;
                }
                if (response.output) {
                    outputText += `Output:\n${response.output}`;
                }
                if (response.stderr) {
                    outputText += `\nErrors:\n${response.stderr}`;
                }
                if (response.time) {
                    outputText += `\n\nExecution time: ${response.time}s`;
                }
                setOutput(outputText || 'No output');
            } else {
                setOutput(`Error: ${response.error || 'Execution failed'}`);
            }
        } catch (error) {
            console.error('Code execution error:', error);
            setOutput(`Error: ${error.message || 'Failed to execute code'}`);
            toast.error('Failed to run code. Please try again.');
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            const response = await api.post('/code/evaluate', {
                code,
                problem,
                language: selectedLanguage.name,
                languageId: selectedLanguage.id
            });

            if (response.success) {
                const score = response.evaluation?.score || 0;
                toast.success(`Solution submitted! Score: ${score}/100`);

                // Call onComplete immediately (no intermediate scorecard)
                onComplete?.({
                    code,
                    language: selectedLanguage.name,
                    score,
                    evaluation: response.evaluation,
                    testsPassed: response.execution?.success,
                    hintsUsed,
                    timeSpent: (timeLimit * 60) - timeRemaining
                });
            } else {
                toast.error('Failed to evaluate solution');
            }
        } catch (error) {
            console.error('Submission error:', error);
            toast.error('Failed to submit code');
        } finally {
            setIsSubmitting(false);
        }
    };

    const showHint = () => {
        if (problem?.hints && hintsUsed < problem.hints.length) {
            setHintsUsed(prev => prev + 1);
            setShowHints(true);
            toast.info(`Hint ${hintsUsed + 1} revealed. (-5 points)`);
        }
    };

    const resetCode = () => {
        setCode(problem?.starterCode || '// Write your code here\n');
        setOutput('');
        setTestResults(null);
        toast.info('Code reset to starter template');
    };

    const timerClass = timeRemaining < 60 ? 'danger' : timeRemaining < 180 ? 'warning' : '';

    return (
        <div className="code-ide">
            {/* Header */}
            <div className="ide-header">
                <div className="problem-info">
                    <span className={`difficulty-badge ${problem?.difficulty || 'easy'}`}>
                        {problem?.difficulty?.toUpperCase() || 'EASY'}
                    </span>
                    <h2>{problem?.title || 'Coding Challenge'}</h2>
                </div>
                <div className="header-controls">
                    <div className={`timer ${timerClass}`}>
                        Time: {formatTime(timeRemaining)}
                    </div>
                    <button className="btn btn-secondary skip-btn" onClick={onSkip}>
                        Skip Coding Test
                    </button>
                </div>
            </div>

            <div className="ide-body">
                {/* Problem Panel */}
                <div className="problem-panel">
                    <div className="problem-description">
                        <h3>Problem Description</h3>
                        <pre>{problem?.description || 'No problem description available.'}</pre>
                    </div>

                    {/* Hints section removed for professionalism */}

                    {/* Test Cases */}
                    {problem?.testCases && (
                        <div className="test-cases">
                            <h3>Test Cases</h3>
                            {problem.testCases.map((tc, i) => (
                                <div key={i} className="test-case">
                                    <div><strong>Input:</strong> {tc.input}</div>
                                    <div><strong>Expected:</strong> {tc.expectedOutput}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Editor Panel */}
                <div className="editor-panel">
                    <div className="editor-header">
                        <select
                            className="language-dropdown"
                            value={selectedLanguage.name}
                            onChange={handleLanguageChange}
                        >
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <option key={lang.id} value={lang.name}>
                                    {lang.name}
                                </option>
                            ))}
                        </select>
                        <div className="editor-actions">
                            <button
                                className="btn btn-small"
                                onClick={resetCode}
                                title="Reset code"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="monaco-container">
                        <Editor
                            height="100%"
                            language={selectedLanguage.monacoId}
                            value={code}
                            onChange={setCode}
                            onMount={handleEditorMount}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineNumbers: 'on',
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                wordWrap: 'on',
                                padding: { top: 10 }
                            }}
                        />
                    </div>

                    {/* Output Panel */}
                    <div className="output-panel">
                        <div className="output-header">
                            <h4>Output</h4>
                            <div className="output-actions">
                                <button
                                    className="btn btn-primary run-btn"
                                    onClick={runCode}
                                    disabled={isRunning}
                                >
                                    {isRunning ? 'Running...' : 'Run Code'}
                                </button>
                                <button
                                    className="btn btn-success submit-btn"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                        <pre className="output-content">{output || 'Click "Run Code" to see output...'}</pre>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default CodeIDE;
