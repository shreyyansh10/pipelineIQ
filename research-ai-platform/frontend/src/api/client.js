import axios from 'axios';
import API_BASE_URL from '../config/api';

/**
 * Axios client pre-configured to talk to the API Gateway.
 * In dev mode, Vite's proxy handles forwarding to localhost:8000.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Paper endpoints ──────────────────────────────────────────
export const uploadPaper = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/upload-paper', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── AI endpoints ─────────────────────────────────────────────
export const summarizePaper = (paperId, text) =>
  apiClient.post('/summarize', { paper_id: paperId, text });

export const explainPaper = (paperId, text, level = 'beginner') =>
  apiClient.post('/explain', { paper_id: paperId, text, level });

export const chatWithPaper = (paperId, question, context = null) =>
  apiClient.post('/chat', { paper_id: paperId, question, context });

// ── Citation endpoints ───────────────────────────────────────
export const getCitations = (paperTitle) =>
  apiClient.get(`/citations/${encodeURIComponent(paperTitle)}`);

export default apiClient;
