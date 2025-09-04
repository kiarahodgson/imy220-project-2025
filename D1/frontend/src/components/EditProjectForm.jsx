import React, { useState } from "react";

export default function EditProjectForm({ project, onSave }){
  const [title, setTitle] = useState(project?.title || "");
  const [description, setDescription] = useState(project?.description || "");

  function handleSubmit(e){
    e.preventDefault();
    onSave?.({ ...project, title, description });
  }
  return (
    <form onSubmit={handleSubmit} className="card" aria-label="Edit Project">
      <h3>Edit Project</h3>
      <label className="label">Title</label>
      <input className="input" value={title} onChange={(e)=>setTitle(e.target.value)} />
      <label className="label">Description</label>
      <textarea className="textarea" rows="3" value={description} onChange={(e)=>setDescription(e.target.value)} />
      <button className="btn" type="submit">Save</button>
    </form>
  );
}
