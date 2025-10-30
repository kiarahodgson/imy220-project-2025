import React from "react";

export default function ProjectFiles({ projectId, files = [] }){
  const items = files.map((file) => {
    if (!file) return null;
    if (typeof file === 'string') return { id: file, name: file, size: 0, downloads: 0 };
    const name = file.name || file.filename || file.path || 'file';
    return {
      id: file.id || name,
      name,
      size: file.size || 0,
      downloads: file.downloadCount || 0,
    };
  }).filter(Boolean);

  return (
    <section className="card">
      <h3>Files</h3>
      {items.length === 0 ? (
        <p>No files uploaded yet.</p>
      ) : (
        <ul>
          {items.map((f) => (
            <li key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                {f.name}
                {f.size ? <span className="helper" style={{ marginLeft: '.5rem' }}>{Math.round(f.size/1024)} KB</span> : null}
                {typeof f.downloads === 'number' ? <span className="helper" style={{ marginLeft: '.5rem' }}>{f.downloads} downloads</span> : null}
              </span>
              <a className="btn secondary" href={`/api/projects/${projectId}/files/${encodeURIComponent(f.name)}`}>Download</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
