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
    language = 'javascript',
    languageId = 63,
    problem,
    onComplete,
    onSkip,
    timeLimit = 15 // minutes
}) => {
    const toast = useToast();
    const editorRef = useRef(null);

    const [code, setCode] = useState(problem?.starterCode || '// Write your code here\n');
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60);
    const [showHints, setShowHints] = useState(false);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [evaluation, setEvaluation] = useState(null);

    // Language to Monaco language mapping
    const monacoLanguage = {
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
    }[language] || 'javascript';

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
                language,
                languageId
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
                language,
                languageId
            });

            if (response.success) {
                setEvaluation(response.evaluation);
                setTestResults({
                    passed: response.execution?.success && !response.execution?.stderr,
                    output: response.execution?.output,
                    error: response.execution?.stderr
                });

                const score = response.evaluation?.score || 0;

                toast.success(`Solution submitted! Score: ${score}/100`);

                // Complete after showing results
                setTimeout(() => {
                    onComplete?.({
                        code,
                        language,
                        score,
                        evaluation: response.evaluation,
                        testsPassed: response.execution?.success,
                        hintsUsed,
                        timeSpent: (timeLimit * 60) - timeRemaining
                    });
                }, 3000);
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
                        ⏱️ {formatTime(timeRemaining)}
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
                        <h3>📋 Problem Description</h3>
                        <pre>{problem?.description || 'No problem description available.'}</pre>
                    </div>

                    {/* Hints Section */}
                    {problem?.hints && problem.hints.length > 0 && (
                        <div className="hints-section">
                            <button
                                className="hint-btn"
                                onClick={showHint}
                                disabled={hintsUsed >= problem.hints.length}
                            >
                                💡 Get Hint ({problem.hints.length - hintsUsed} remaining)
                            </button>

                            {showHints && (
                                <div className="hints-list">
                                    {problem.hints.slice(0, hintsUsed).map((hint, i) => (
                                        <div key={i} className="hint-item">
                                            <strong>Hint {i + 1}:</strong> {hint}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Test Cases */}
                    {problem?.testCases && (
                        <div className="test-cases">
                            <h3>🧪 Test Cases</h3>
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
                        <span className="language-badge">{language}</span>
                        <div className="editor-actions">
                            <button
                                className="btn btn-small"
                                onClick={resetCode}
                                title="Reset code"
                            >
                                🔄 Reset
                            </button>
                        </div>
                    </div>

                    <div className="monaco-container">
                        <Editor
                            height="100%"
                            language={monacoLanguage}
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
                            <h4>📤 Output</h4>
                            <div className="output-actions">
                                <button
                                    className="btn btn-primary run-btn"
                                    onClick={runCode}
                                    disabled={isRunning}
                                >
                                    {isRunning ? '⏳ Running...' : '▶️ Run Code'}
                                </button>
                                <button
                                    className="btn btn-success submit-btn"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? '⏳ Submitting...' : '✅ Submit'}
                                </button>
                            </div>
                        </div>
                        <pre className="output-content">{output || 'Click "Run Code" to see output...'}</pre>
                    </div>
                </div>
            </div>

            {/* Evaluation Results Modal */}
            {evaluation && (
                <div className="evaluation-modal">
                    <div className="evaluation-content">
                        <h2>🎉 Solution Evaluated!</h2>

                        <div className="score-circle">
                            <span className="score">{evaluation.score || 0}</span>
                            <span className="max-score">/100</span>
                        </div>

                        <div className="evaluation-details">
                            <div className="eval-item">
                                <strong>Correctness:</strong>
                                <p>{evaluation.correctness}</p>
                            </div>
                            <div className="eval-item">
                                <strong>Code Quality:</strong>
                                <p>{evaluation.codeQuality}</p>
                            </div>
                            <div className="eval-item">
                                <strong>Efficiency:</strong>
                                <p>{evaluation.efficiency}</p>
                            </div>
                        </div>

                        {evaluation.suggestions && evaluation.suggestions.length > 0 && (
                            <div className="suggestions">
                                <h4>💡 Suggestions for Improvement:</h4>
                                <ul>
                                    {evaluation.suggestions.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p className="feedback">{evaluation.overallFeedback}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodeIDE;
