import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { usePaper } from '../contexts/PaperContext';
import { uploadPaper } from '../api/client';
import PageLoader from '../components/PageLoader';
import './UploadPage.css';

const FILE_TYPE_LABELS = {
  python: 'Python',
  notebook: 'Notebook',
  pdf: 'PDF',
};

const FILE_TYPE_COLORS = {
  python: '#3b82f6',
  notebook: '#f59e0b',
  pdf: '#ef4444',
};

const DIMENSION_LABELS = {
  data_preprocessing: 'Data Preprocessing',
  model_architecture: 'Model Architecture',
  training_loop: 'Training Loop',
  evaluation_metrics: 'Evaluation Metrics',
  deployment_readiness: 'Deployment Ready',
};

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: '🔴' },
  WARNING: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: '🟡' },
  INFO: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: '🟢' },
};

function ScoreCircle({ score }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const target = Math.max(0, score || 0);

    const tick = (now) => {
      const progress = Math.min((now - start) / 1500, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(target * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [score]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = animatedScore >= 80 ? '#10b981' : animatedScore >= 60 ? '#f59e0b' : animatedScore >= 40 ? '#f97316' : '#ef4444';

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="70" y="65" textAnchor="middle" fill={color} fontSize="36" fontWeight="800">{animatedScore}</text>
        <text x="70" y="88" textAnchor="middle" fill="var(--text-muted)" fontSize="13">/100</text>
      </svg>
      <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 600, color }}>
        {animatedScore >= 80 ? 'Excellent Pipeline' : animatedScore >= 60 ? 'Good Pipeline' : animatedScore >= 40 ? 'Needs Improvement' : 'Critical Issues'}
      </div>
    </div>
  );
}

function DimensionBar({ label, score }) {
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(score || 0));
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const color = filled >= 80 ? '#10b981' : filled >= 60 ? '#f59e0b' : filled >= 40 ? '#f97316' : '#ef4444';
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color }}>{filled}/100</span>
      </div>
      <div style={{
        height: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${filled}%`, height: '100%', borderRadius: '4px',
          background: `linear-gradient(90deg, ${color}, ${color === '#ef4444' ? '#f97316' : '#34d399'})`, transition: 'width 1s ease',
        }} />
      </div>
    </div>
  );
}

function IssueCard({ issue }) {
  const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.INFO;
  return (
    <div className="issue-card" style={{
      background: config.bg, border: `1px solid ${config.border}`,
      borderRadius: '8px', padding: '14px 16px', marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: '#fff',
          background: config.color, padding: '2px 8px', borderRadius: '4px',
        }}>{issue.severity}</span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{issue.title}</span>
      </div>
      {issue.location && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          📍 Location: <code style={{ background: 'var(--bg-surface)', padding: '1px 4px', borderRadius: '3px' }}>{issue.location}</code>
        </div>
      )}
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '4px 0' }}>
        {issue.description}
      </p>
      {issue.fix && (
        <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>Fix</div>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{issue.fix}</div>
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Pipeline overview
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // Review levels
  const [selectedLevel, setSelectedLevel] = useState('beginner');
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState(null);

  // Pipeline analysis
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

  const { setPaper } = usePaper();
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  const navigate = useNavigate();

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setAnalysis(null);
    setSummary('');
    setExplanation('');
    try {
      const response = await uploadPaper(file);
      const data = response.data;
      setResult(data);
      setPaper({ paperId: data.paper_id, filename: data.filename, totalWords: data.total_words, totalChunks: data.total_chunks });
      const pCount = parseInt(localStorage.getItem(`paperpilot_papers_count_${userId}`) || '0');
      localStorage.setItem(`paperpilot_papers_count_${userId}`, String(pCount + 1));
      const recent = JSON.parse(localStorage.getItem(`paperpilot_recent_papers_${userId}`) || '[]');
      recent.unshift({
        paper_id: data.paper_id,
        filename: data.filename,
        file_type: data.file_type || 'pdf',
        total_words: data.total_words,
        total_chunks: data.total_chunks,
        uploaded_at: new Date().toISOString(),
      });
      localStorage.setItem(`paperpilot_recent_papers_${userId}`, JSON.stringify(recent.slice(0, 5)));
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Is the Paper Service running?');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!result?.paper_id) return;
    setSummarizing(true);
    setSummaryError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/summarize`, { paper_id: result.paper_id });
      setSummary(response.data?.summary || 'No overview returned.');
      const sCount = parseInt(localStorage.getItem(`paperpilot_summaries_count_${userId}`) || '0');
      localStorage.setItem(`paperpilot_summaries_count_${userId}`, String(sCount + 1));
    } catch (err) {
      setSummaryError(err.response?.data?.detail || 'Failed to generate overview.');
      setSummary('');
    } finally {
      setSummarizing(false);
    }
  };

  const handleGenerateExplanation = async () => {
    if (!result?.paper_id) return;
    setExplaining(true);
    setExplainError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/explain`, { paper_id: result.paper_id, level: selectedLevel });
      setExplanation(response.data?.explanation || 'No review returned.');
      const eCount = parseInt(localStorage.getItem(`paperpilot_explanations_count_${userId}`) || '0');
      localStorage.setItem(`paperpilot_explanations_count_${userId}`, String(eCount + 1));
    } catch (err) {
      setExplainError(err.response?.data?.detail || 'Failed to generate review.');
      setExplanation('');
    } finally {
      setExplaining(false);
    }
  };

  const handleAnalyze = async () => {
    if (!result?.paper_id) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/analyze`, {
        paper_id: result.paper_id,
        file_type: result.file_type || 'python',
      });
      setAnalysis(response.data?.analysis || null);
    } catch (err) {
      setAnalyzeError(err.response?.data?.detail || 'Failed to analyze pipeline.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Download Report
  const downloadReport = () => {
    if (!analysis) return;
    const overallScore = analysis.overall_score || 0;
    const reportContent = generateReportHTML(analysis, result?.filename || 'unknown', overallScore);
    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline-report-${result?.filename || 'analysis'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReportHTML = (analysis, filename, score) => {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Pipeline Analysis Report - ${filename}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
        h1 { color: #10b981; }
        h2 { color: #1a1a1a; border-bottom: 2px solid #10b981; padding-bottom: 8px; }
        .score { font-size: 72px; font-weight: bold; color: ${score > 70 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444'}; }
        .critical { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 8px 0; border-radius: 4px; }
        .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin: 8px 0; border-radius: 4px; }
        .info { background: #f0fdf4; border-left: 4px solid #10b981; padding: 12px; margin: 8px 0; border-radius: 4px; }
        .dimension { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .generated { color: #6b7280; font-size: 12px; margin-top: 40px; }
    </style>
</head>
<body>
    <h1>PipelineIQ Analysis Report</h1>
    <p>File: <strong>${filename}</strong></p>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    <h2>Pipeline Health Score</h2>
    <div class="score">${score}/100</div>
    
    <h2>Dimension Scores</h2>
    ${Object.entries(analysis).filter(([k]) =>
        ['data_preprocessing', 'model_architecture', 'training_loop', 'evaluation_metrics', 'deployment_readiness'].includes(k)
    ).map(([key, val]) => `
        <div class="dimension">
            <span>${key.replace(/_/g, ' ').toUpperCase()}</span>
            <span>${val?.score || 0}/100</span>
        </div>
    `).join('')}
    
    <h2>Issues Found</h2>
    ${['data_preprocessing', 'model_architecture', 'training_loop', 'evaluation_metrics', 'deployment_readiness'].map(section =>
        (analysis[section]?.issues || []).map(issue => `
            <div class="${issue.severity?.toLowerCase() || 'info'}">
                <strong>${issue.severity}: ${issue.title}</strong>
                <p>${issue.description}</p>
                <p><strong>Fix:</strong> ${issue.fix}</p>
            </div>
        `).join('')
    ).join('')}
    
    <h2>Top 3 Priorities</h2>
    <ol>
        ${(analysis.top_3_priorities || []).map(p => `<li>${p}</li>`).join('')}
    </ol>
    
    <p class="generated">Generated by PipelineIQ</p>
</body>
</html>`;
  };

  const fileType = result?.file_type || 'pdf';
  const fileTypeLabel = FILE_TYPE_LABELS[fileType] || 'File';
  const fileTypeColor = FILE_TYPE_COLORS[fileType] || '#6b7280';

  const levelLabels = { beginner: 'Junior Review', intermediate: 'Senior Review', expert: 'Principal Review' };
  const levelPillStyle = (level) => ({
    padding: '8px 20px',
    borderRadius: '20px',
    border: selectedLevel === level ? 'none' : '1px solid var(--border-color)',
    background: selectedLevel === level ? 'var(--accent)' : 'transparent',
    color: selectedLevel === level ? '#fff' : 'var(--text-primary)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  });

  // Collect all issues by severity
  const allIssues = analysis ? ['data_preprocessing', 'model_architecture', 'training_loop', 'evaluation_metrics', 'deployment_readiness']
    .flatMap(section => (analysis[section]?.issues || []).map(i => ({ ...i, section }))) : [];
  const criticalIssues = allIssues.filter(i => i.severity === 'CRITICAL');
  const warningIssues = allIssues.filter(i => i.severity === 'WARNING');
  const infoIssues = allIssues.filter(i => i.severity === 'INFO');

  return (
    <div className="upload-page">
      <div className="upload-header">
        <h1>Analyze ML Pipeline</h1>
        <p>Upload your ML code for production-grade review</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr', gap: '24px', alignItems: 'start' }}>
        {/* ── LEFT COLUMN ── */}
        <div>
          {/* Drop zone */}
          <div
            className={`drop-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input id="file-input" type="file" accept=".py,.ipynb,.pdf" onChange={handleFileChange} hidden />
            {file ? (
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <div className="drop-prompt">
                <p style={{ fontSize: '18px' }}>📁 Drop your ML file here</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Supports .py, .ipynb, .pdf</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>or click to browse</p>
              </div>
            )}
          </div>

          <button className="upload-btn" onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? 'Processing...' : 'Upload & Extract'}
          </button>

          {error && <div className="error-msg">{error}</div>}

          {result && (
            <>
              {/* File info card */}
              <div className="result-card" style={{ marginTop: '16px' }}>
                <h2 style={{ marginBottom: '12px' }}>📄 File Info</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>File:</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{result.filename}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Type:</div>
                  <div>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, color: '#fff',
                      background: fileTypeColor, padding: '2px 10px',
                      borderRadius: '10px',
                    }}>{fileTypeLabel}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Words:</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{result.total_words?.toLocaleString()}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Chunks:</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{result.total_chunks}</div>
                </div>
              </div>

              {/* Pipeline Overview */}
              <div className="upload-section-card card-enter" style={{ marginTop: '16px' }}>
                <h2 className="section-title">Pipeline Overview</h2>
                <button className="upload-btn" onClick={handleGenerateSummary} disabled={summarizing} style={{ marginTop: 0 }}>
                  {summarizing ? 'Generating...' : 'Generate Overview'}
                </button>
                {summarizing && <PageLoader text="Generating overview..." />}
                {summaryError && <div className="error-msg">{summaryError}</div>}
                {summary && (
                  <div className="result-preview" style={{ marginTop: '16px' }}>
                    <pre style={{ fontSize: '14px', lineHeight: '1.6' }}>{summary}</pre>
                  </div>
                )}
              </div>

              {/* Review Level */}
              <div className="upload-section-card card-enter" style={{ marginTop: '16px' }}>
                <h2 className="section-title">Review Level</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
                  Select a review level for your pipeline code.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {['beginner', 'intermediate', 'expert'].map((level) => (
                    <button key={level} type="button" style={levelPillStyle(level)} onClick={() => setSelectedLevel(level)}>
                      {levelLabels[level]}
                    </button>
                  ))}
                </div>
                <button className="upload-btn" onClick={handleGenerateExplanation} disabled={explaining} style={{ marginTop: 0 }}>
                  {explaining ? 'Generating...' : 'Generate Review'}
                </button>
                {explaining && <PageLoader text="Generating review..." />}
                {explainError && <div className="error-msg">{explainError}</div>}
                {explanation && (
                  <div className="result-preview" style={{ marginTop: '16px' }}>
                    <h3 style={{ marginBottom: '8px', color: 'var(--accent)' }}>
                      {levelLabels[selectedLevel]} ({selectedLevel} level)
                    </h3>
                    <pre style={{ fontSize: '14px', lineHeight: '1.6' }}>{explanation}</pre>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT COLUMN (Analysis) ── */}
        {result && (
          <div>
            {/* Analyze Button */}
            <button
              className="upload-btn analyze-btn"
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                width: '100%', marginTop: 0, marginBottom: '16px',
                background: analyzing ? 'var(--border)' : 'linear-gradient(135deg, #10b981, #059669)',
                fontSize: '15px', padding: '14px',
              }}
            >
              {analyzing ? '⏳ Analyzing your pipeline...' : '🔬 Analyze Pipeline'}
            </button>

            {analyzing && (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                background: 'var(--bg-card)', borderRadius: '12px',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{
                  width: '48px', height: '48px', margin: '0 auto 16px',
                  border: '3px solid var(--border-color)', borderTopColor: 'var(--accent)',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                  Running production-grade analysis...
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                  This may take 15-30 seconds
                </p>
              </div>
            )}

            {analyzeError && <div className="error-msg">{analyzeError}</div>}

            {analysis && !analysis.raw && (
              <>
                {/* Health Score */}
                <div className="result-card card-enter" style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <h2 style={{ marginBottom: '16px' }}>Pipeline Health Score</h2>
                  <ScoreCircle score={analysis.overall_score || 0} />
                </div>

                {/* Dimension Scores */}
                <div className="result-card card-enter" style={{ marginBottom: '16px' }}>
                  <h2 style={{ marginBottom: '16px' }}>Dimension Scores</h2>
                  {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                    <DimensionBar key={key} label={label} score={analysis[key]?.score || 0} />
                  ))}
                </div>

                {/* Issues Found */}
                <div className="result-card card-enter" style={{ marginBottom: '16px' }}>
                  <h2 style={{ marginBottom: '16px' }}>Issues Found</h2>

                  {criticalIssues.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>
                        🔴 CRITICAL ({criticalIssues.length} {criticalIssues.length === 1 ? 'issue' : 'issues'})
                      </h3>
                      {criticalIssues.map((issue, i) => <IssueCard key={`c${i}`} issue={issue} />)}
                    </div>
                  )}

                  {warningIssues.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>
                        🟡 WARNING ({warningIssues.length} {warningIssues.length === 1 ? 'issue' : 'issues'})
                      </h3>
                      {warningIssues.map((issue, i) => <IssueCard key={`w${i}`} issue={issue} />)}
                    </div>
                  )}

                  {infoIssues.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                        🟢 INFO ({infoIssues.length} {infoIssues.length === 1 ? 'issue' : 'issues'})
                      </h3>
                      {infoIssues.map((issue, i) => <IssueCard key={`i${i}`} issue={issue} />)}
                    </div>
                  )}

                  {allIssues.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                      No issues detected — great pipeline! 🎉
                    </p>
                  )}
                </div>

                {/* Top 3 Priorities */}
                {analysis.top_3_priorities && analysis.top_3_priorities.length > 0 && (
                  <div className="result-card card-enter" style={{ marginBottom: '16px' }}>
                    <h2 style={{ marginBottom: '12px' }}>🎯 Top 3 Priorities</h2>
                    <ol style={{ paddingLeft: '20px', margin: 0 }}>
                      {analysis.top_3_priorities.map((p, i) => (
                        <li key={i} style={{
                          fontSize: '14px', color: 'var(--text-secondary)',
                          lineHeight: 1.6, marginBottom: '6px',
                        }}>{p}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Summary */}
                {analysis.summary && (
                  <div className="result-card card-enter" style={{ marginBottom: '16px' }}>
                    <h2 style={{ marginBottom: '8px' }}>Assessment</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {analysis.summary}
                    </p>
                  </div>
                )}

                {/* Download Report Button */}
                <button
                  className="upload-btn download-btn"
                  onClick={downloadReport}
                  style={{
                    width: '100%', marginTop: 0,
                    background: 'transparent',
                    border: '1px solid var(--accent)',
                    color: 'var(--accent)',
                  }}
                >
                  📥 Download Report
                </button>
              </>
            )}

            {/* Raw analysis fallback */}
            {analysis && analysis.raw && (
              <div className="result-card card-enter">
                <h2 style={{ marginBottom: '8px' }}>Analysis Result</h2>
                <pre style={{ fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{analysis.raw}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
