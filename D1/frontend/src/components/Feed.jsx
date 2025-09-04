import React from "react";
import ProjectPreview from "./ProjectPreview";

export default function Feed({ projects, resolveOwnerName }){
  return (
    <section>
      <h2>Projects</h2>
      <div className="grid">
        {projects.map(p => (
          <ProjectPreview key={p.id} project={p} ownerName={resolveOwnerName(p.ownerId)} />
        ))}
      </div>
    </section>
  );
}
