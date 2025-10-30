//u23530996 Kiara Hodgson
import React from "react";
import { Link } from "react-router-dom";

export default function ProjectPreview({ project, ownerName }){
  return (
    <article className="card" aria-label={`Project ${project.title}`}>
      <header className="flex">
        <h3 style={{marginRight: "auto"}}>{project.title}</h3>
        <span className="badge">{ownerName}</span>
      </header>
      <p>{project.description}</p>
      <div className="flex">
        {project.tags?.map(tag => (<span key={tag} className="badge">{tag}</span>))}
      </div>
      <div style={{marginTop: ".75rem"}}>
        <Link className="btn" to={`/project/${project.id}`}>Open</Link>
      </div>
    </article>
  );
}
