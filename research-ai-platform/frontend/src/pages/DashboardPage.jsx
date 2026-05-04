import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API_BASE_URL from '../config/api';
import './DashboardPage.css';

void API_BASE_URL;

const FILE_TYPE_COLORS = {
  python: '#3b82f6',
  notebook: '#f59e0b',
  pdf: '#ef4444',
};

const FILE_TYPE_LABELS = {
  python: 'Python',
  notebook: 'Notebook',
  pdf: 'PDF',
};

function useCountUp(target, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (target <= 0) { setCount(0); return; }
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);

  return count;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  const userName = user?.name || 'Engineer';

  const [stats, setStats] = useState({ papers: 0, summaries: 0, explanations: 0, chats: 0 });
  const [recentPapers, setRecentPapers] = useState([]);

  useEffect(() => {
    setStats({
      papers: parseInt(localStorage.getItem(`paperpilot_papers_count_${userId}`) || '0'),
      summaries: parseInt(localStorage.getItem(`paperpilot_summaries_count_${userId}`) || '0'),
      explanations: parseInt(localStorage.getItem(`paperpilot_explanations_count_${userId}`) || '0'),
      chats: parseInt(localStorage.getItem(`paperpilot_chats_count_${userId}`) || '0'),
    });
    const recent = JSON.parse(localStorage.getItem(`paperpilot_recent_papers_${userId}`) || '[]');
    setRecentPapers(recent);
  }, [userId]);

  const papersCount = useCountUp(stats.papers);
  const summariesCount = useCountUp(stats.summaries);
  const explanationsCount = useCountUp(stats.explanations);
  const chatsCount = useCountUp(stats.chats);

  const statCards = [
    { label: 'Pipelines Analyzed', count: papersCount, icon: '∑' },
    { label: 'Overviews Generated', count: summariesCount, icon: '◫' },
    { label: 'Reviews Generated', count: explanationsCount, icon: '✦' },
    { label: 'Debug Queries', count: chatsCount, icon: '⌘' },
  ];

  return (
    <div className="dash-page">
      {/* Welcome */}
      <div className="dash-welcome">
        <h1>{getGreeting()}, {userName}</h1>
        <p>Your ML pipeline analysis history</p>
      </div>

      {/* Stats */}
      <div className="dash-stats-grid">
        {statCards.map((s, i) => (
          <div
            key={i}
            className="dash-stat-card card-enter"
            style={{ animation: `fadeInUp 0.5s ease ${i * 0.1}s both` }}
          >
            <div className="dash-stat-icon">{s.icon}</div>
            <div className="dash-stat-number">{s.count}</div>
            <div className="dash-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Pipelines */}
      <div className="dash-section">
        <h2>Recent Pipelines</h2>
        <p className="dash-section-sub">Continue working on your pipelines</p>
        {recentPapers.length === 0 ? (
          <div className="dash-empty">
            <p>No pipelines yet</p>
            <button className="dash-accent-btn" onClick={() => navigate('/upload')}>
              Analyze Your First Pipeline
            </button>
          </div>
        ) : (
          <div className="dash-papers-grid">
            {recentPapers.slice(0, 5).map((paper, i) => {
              const ft = paper.file_type || 'pdf';
              const ftLabel = FILE_TYPE_LABELS[ft] || 'File';
              const ftColor = FILE_TYPE_COLORS[ft] || '#6b7280';
              return (
                <div
                  key={i}
                  className="dash-paper-card card-enter"
                  style={{ animation: `slideInLeft 0.4s ease ${i * 0.1}s both` }}
                >
                  <div className="dash-paper-info">
                    <div className="dash-paper-top">
                      <span>{paper.filename}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, color: '#fff',
                          background: ftColor, padding: '2px 8px', borderRadius: '8px',
                        }}>{ftLabel}</span>
                        <span className="dash-paper-date">
                          {new Date(paper.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="dash-paper-stats">
                      Words: {paper.total_words?.toLocaleString()}&ensp;|&ensp;Chunks: {paper.total_chunks}
                    </div>
                  </div>
                  <button className="dash-accent-btn" onClick={() => navigate('/upload')}>
                    View Analysis →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
