import React from "react";
import { useParams } from "react-router-dom";
import ProjectView from "../components/ProjectView";
import ProjectFiles from "../components/ProjectFiles";
import ProjectMessages from "../components/ProjectMessages";
import EditProjectForm from "../components/EditProjectForm";

export default function ProjectPage({ projects, users }){
  const { id } = useParams();
  const project = projects.find(p => p.id === id) || projects[0];

  function resolveUserName(uid){
    const u = users?.find(x => x.id === uid);
    return u ? u.name : uid;
  }

  function handleSave(updated){
    console.log("Edit project", updated);
  }

  const ownerName = resolveUserName(project.ownerId);

  return (
    <article>
      <ProjectView project={project} ownerName={ownerName} />
      <div className="grid">
        <ProjectFiles files={project.files} />
        <ProjectMessages messages={project.messages} resolveUserName={resolveUserName} />
      </div>
      <EditProjectForm project={project} onSave={handleSave} />
    </article>
  );
}
