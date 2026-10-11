/**
 * api.js
 * Centralized API client service for all Flask endpoints with automatic proxy and direct fallback.
 */

const API_BASE = '/api';
const DIRECT_API = 'http://127.0.0.1:5000/api';

async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    return res;
  } catch (err) {
    // If relative proxy path fails, retry directly against the backend server
    try {
      const fallbackRes = await fetch(`${DIRECT_API}${endpoint}`, options);
      return fallbackRes;
    } catch (fallbackErr) {
      throw new Error('Unable to connect to backend service. Please ensure the backend is running on port 5000.');
    }
  }
}

export async function fetchHealth() {
  const res = await apiFetch('/health');
  if (!res.ok) throw new Error('Failed to connect to backend service.');
  return await res.json();
}

export async function submitPrediction(pollutantData) {
  const res = await apiFetch('/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pollutantData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.details ? data.details.join(', ') : (data.error || 'Prediction failed.'));
  }
  return data;
}

export async function fetchPredictionHistory(limit = 30) {
  const res = await apiFetch(`/history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch prediction history.');
  return await res.json();
}

export async function fetchModelMetrics() {
  const res = await apiFetch('/metrics');
  if (!res.ok) throw new Error('Failed to retrieve model metrics.');
  return await res.json();
}

export async function fetchForecast(city = 'Delhi', days = 7) {
  const res = await apiFetch(`/forecast?city=${encodeURIComponent(city)}&days=${days}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate forecast.');
  }
  return data;
}

export async function fetchDatasetSummary() {
  const res = await apiFetch('/dataset-summary');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Dataset summary unavailable.');
  }
  return data;
}

export async function uploadDatasetFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiFetch('/upload', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Upload failed.');
  }
  return data;
}
