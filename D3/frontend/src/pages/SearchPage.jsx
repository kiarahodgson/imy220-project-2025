import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import SearchInput from '../components/SearchInput';
import SearchResults from '../components/SearchResults';

const scopes = [
  { value: 'all', label: 'Everything' },
  { value: 'users', label: 'Users' },
  { value: 'projects', label: 'Projects' },
  { value: 'checkins', label: 'Activity' },
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(() => params.get('q') || '');
  const [scope, setScope] = useState(() => params.get('type') || 'all');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSearch = useCallback(async (searchText, searchScope) => {
    setLoading(true);
    setError('');
    try {
      const resp = await api.search({ q: searchText, type: searchScope });
      setResults(resp);
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const qVal = params.get('q') || '';
    const scopeVal = params.get('type') || 'all';
    setQuery(qVal);
    setScope(scopeVal);
    runSearch(qVal, scopeVal);
  }, [params, runSearch]);

  function handleSubmit(ev) {
    ev.preventDefault();
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (query) next.set('q', query);
      else next.delete('q');
      next.set('type', scope || 'all');
      return next;
    });
  }

  return (
    <div className="search-bg full-bleed">
      <div className="container">
        <main className="search-page">
          <h1 className="page-title">Search</h1>

          <form onSubmit={handleSubmit} className="card search-form" style={{ marginBottom: '1rem' }}>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search users, projects, or activity…"
            />

            <label className="label" htmlFor="search-scope">Filter</label>
            <select
              id="search-scope"
              className="select"
              value={scope}
              onChange={(ev) => setScope(ev.target.value)}
            >
              {scopes.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <button className="btn" type="submit" style={{ marginTop: '.5rem' }}>Search</button>
          </form>

          <SearchResults
            results={results}
            query={query}
            scope={scope}
            loading={loading}
            error={error}
          />
        </main>
      </div>
    </div>
  );
}
