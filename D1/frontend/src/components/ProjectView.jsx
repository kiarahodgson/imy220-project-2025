import React from "react";

export default function ProjectView({ project, ownerName }){
  if (!project) return <p>Project not found.</p>;
  return (
    <section className="card">
      <h2>{project.title}</h2>
      <p><small className="muted">Owner: {ownerName}</small></p>
      <p>{project.description}</p>
      <div className="flex">{project.tags?.map(t => <span key={t} className="badge">{t}</span>)}</div>
    </section>
  );
}
