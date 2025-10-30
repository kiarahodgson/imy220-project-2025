//u23530996 Kiara Hodgson

import { API_URL } from '../config';

function resolveUrl(pathOrUrl) {
  // Allow absolute URLs or API-relative paths like "/api/users"
  if (typeof pathOrUrl !== 'string') throw new Error('URL must be a string');
  return pathOrUrl.startsWith('http') ? pathOrUrl : `${API_URL}${pathOrUrl}`;
}

async function parseJsonResponse(res) {
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function getJson(pathOrUrl, options = {}) {
  const url = resolveUrl(pathOrUrl);
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    method: options.method || 'GET',
  });
  return parseJsonResponse(res);
}

export async function postJson(pathOrUrl, body = {}, options = {}) {
  const url = resolveUrl(pathOrUrl);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    ...options,
  });
  return parseJsonResponse(res);
}

export async function postForm(pathOrUrl, formData, options = {}) {
  const url = resolveUrl(pathOrUrl);
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    ...options,
  });
  return parseJsonResponse(res);
}

export async function patchJson(pathOrUrl, body = {}, options = {}) {
  const url = resolveUrl(pathOrUrl);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    ...options,
  });
  return parseJsonResponse(res);
}

export async function deleteJson(pathOrUrl, options = {}) {
  const url = resolveUrl(pathOrUrl);
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return parseJsonResponse(res);
}
