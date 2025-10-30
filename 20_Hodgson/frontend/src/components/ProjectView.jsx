//u23530996 Kiara Hodgson
import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function ProjectView({ project, ownerName }){
  if (!project) return <p>Project not found.</p>;
  const tags = project.tags || project.hashtags || [];
  const status = project.status ? project.status.replace(/-/g, " ") : "";
  const locked = project.status === 'checked-out' && project.lockedBy;
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
    <section className="card">
      <h2>{project.title || project.name}</h2>
      <p><small className="muted">Owner: {ownerName}</small></p>
      {project.type && <p><small className="muted">Type: {project.type}</small></p>}
      {status && <p><small className="muted">Status: {status}</small></p>}
      {typeof project.downloadCount === 'number' && (
        <p><small className="muted">Downloads: {project.downloadCount}</small></p>
      )}
      {project.imageUrl && (
        <img
          src={project.imageUrl}
          alt={`${project.title || project.name} preview`}
          onClick={() => setShowPreview(true)}
          style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', borderRadius: '12px', marginBottom: '.75rem', cursor: 'zoom-in' }}
        />
      )}
      {locked && (
        <p><small className="muted">Locked by: {project.lockedBy}</small></p>
      )}
      <p>{project.description}</p>
      <div className="flex">
        {tags.map((t) => (
          <Link
            key={t}
            to={`/search?type=projects&q=${encodeURIComponent(t)}`}
            className="badge"
          >
            #{t}
          </Link>
        ))}
      </div>
    </section>
    {showPreview && project.imageUrl && (
      <div
        onClick={() => setShowPreview(false)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        <img
          src={project.imageUrl}
          alt={`${project.title || project.name} full`}
          style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}
        />
      </div>
    )}
    </>
  );
}
