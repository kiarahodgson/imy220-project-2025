import React from "react";
import { useParams } from "react-router-dom";
import ProfilePreview from "../components/ProfilePreview";
import EditProfileForm from "../components/EditProfileForm";
import CreateProjectForm from "../components/CreateProjectForm";
import ProjectPreview from "../components/ProjectPreview";

export default function ProfilePage({ users, projects, currentUser }){
  const { id } = useParams();
  const user = users.find(u => u.id === id) || currentUser || users[0];

  const userProjects = projects.filter(p => p.ownerId === user.id);

  function handleProfileSave(updated){
   
    console.log("Profile save", updated);
  }

  function handleCreateProject(newProject){
    console.log("Create project", newProject);
  }

  return (
    <section>
      <section className="card">
        <h2>{user.name}</h2>
        <p><small className="muted">{user.email}</small></p>
        <p>{user.bio}</p>
      </section>

      <EditProfileForm user={user} onSave={handleProfileSave} />

      <CreateProjectForm onCreate={handleCreateProject} />

      <h3>Your Projects</h3>
      <div className="grid">
        {userProjects.map(p => (
          <ProjectPreview key={p.id} project={p} ownerName={user.name} />
        ))}
      </div>

      <h3>Friends</h3>
      <div className="grid">
        {["u2","u3"].map(fid => {
          const f = users.find(u => u.id === fid);
          return f ? <ProfilePreview key={f.id} user={f} /> : null;
        })}
      </div>
    </section>
  );
}
