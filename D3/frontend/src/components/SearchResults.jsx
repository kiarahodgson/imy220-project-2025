import React from 'react';
import { Link } from 'react-router-dom';

export default function SearchResults({ results = {}, query, scope, loading, error }) {
  const { users = [], projects = [], checkins = [] } = results;

  if (loading) return <p>Searching…</p>;
  if (error) return <p role="alert" className="error">{error}</p>;

  const nothing = !users.length && !projects.length && !checkins.length;
  if (nothing) {
    return <p>No matches found{query ? ` for "${query}"` : ''}.</p>;
  }

  return (
    <div className="search-results">
      {(scope === 'all' || scope === 'users') && users.length > 0 && (
        <section className="card">
          <h3>Users</h3>
          <ul>
            {users.map((user) => (
              <li key={user._id}>
                <Link to={`/profile/${user._id}`}>
                  {user.name || user.username || user.email}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(scope === 'all' || scope === 'projects') && projects.length > 0 && (
        <section className="card">
          <h3>Projects</h3>
          <ul>
            {projects.map((project) => (
              <li key={project._id}>
                <Link to={`/project/${project._id}`}>{project.name || '(untitled project)'}</Link>
                {project.hashtags?.length > 0 && (
                  <span className="helper" style={{ marginLeft: '.5rem' }}>
                    {project.hashtags.map((t) => (
                      <Link
                        key={t}
                        to={`/search?type=projects&q=${encodeURIComponent(t)}`}
                        style={{ marginRight: '.25rem' }}
                      >
                        #{t}
                      </Link>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(scope === 'all' || scope === 'checkins') && checkins.length > 0 && (
        <section className="card">
          <h3>Activity</h3>
          <ul>
            {checkins.map((entry) => {
              const actor = entry.user?.name || entry.user?.username || entry.userId;
              const projectName = entry.project?.name || '(project)';
              const typeLabel = (entry.type || 'check-in').replace(/-/g, ' ');
              const dateLabel = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '';
              return (
                <li key={entry._id} style={{ marginBottom: '.75rem' }}>
                  <div>
                    <strong>{actor}</strong> {typeLabel} <Link to={`/project/${entry.projectId}`}>{projectName}</Link>
                    {entry.version && <span className="badge" style={{ marginLeft: '.5rem' }}>v{entry.version}</span>}
                  </div>
                  {entry.message && <div>{entry.message}</div>}
                  {dateLabel && <div className="helper">{dateLabel}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
