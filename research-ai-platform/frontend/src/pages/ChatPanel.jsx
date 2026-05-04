import { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import PaperContext from '../contexts/PaperContext';
import { useAuth } from '../contexts/AuthContext';
import PageLoader from '../components/PageLoader';
import './ChatPanel.css';

export default function ChatPanel() {
  const { paperId, filename } = useContext(PaperContext);
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, { paper_id: paperId, question });
      setMessages((prev) => [...prev, { role: 'assistant', text: response.data.answer }]);
      const cCount = parseInt(localStorage.getItem(`paperpilot_chats_count_${userId}`) || '0');
      localStorage.setItem(`paperpilot_chats_count_${userId}`, String(cCount + 1));
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: `Error: ${err.response?.data?.detail || err.message || 'Failed to get response.'}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!paperId) {
    return (
      <div className="chat-page">
        <div className="no-paper-card">
          <h2>No pipeline uploaded yet. Please go to Analyze page first.</h2>
          <button className="chat-go-upload-btn" onClick={() => navigate('/upload')}>
            Go to Analyze
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h1>Debug Assistant</h1>
        <p>Ask questions about your ML pipeline</p>
      </div>

      <div className="active-paper-bar">
        Debugging: <strong>{filename}</strong>
      </div>

      <div className="chat-window">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Ask a question about your pipeline to get started.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            <span className="bubble-role">{msg.role === 'user' ? 'You' : 'AI'}</span>
            <p>{msg.text}</p>
          </div>
        ))}
        {loading && (
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-input-bar">
        <input
          type="text"
          placeholder="Ask about your pipeline... e.g. 'Why is my model overfitting?'"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
