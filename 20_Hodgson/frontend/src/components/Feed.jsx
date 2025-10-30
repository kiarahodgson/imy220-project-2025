//u23530996 Kiara Hodgson
import React from "react";
import ProjectPreview from "./ProjectPreview";

export default function Feed({ projects, resolveOwnerName }){
  return (
    <section>
      <h2>Projects</h2>
      <div className="grid">
        {projects.map(p => (
          <ProjectPreview
            key={p._id || p.id}
            project={p}
            ownerName={resolveOwnerName(p.ownerId || p.owner_id)}
          />
        ))}
      </div>
    </section>
  );
}
