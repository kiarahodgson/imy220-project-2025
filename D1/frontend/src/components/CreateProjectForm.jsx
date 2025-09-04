import React, { useState } from "react";

export default function CreateProjectForm({ onCreate }){
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});

  function validate(){
    const e = {};
    if (!title.trim()) e.title = "Title is required.";
    if (description.trim().length < 10) e.description = "Description should be at least 10 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev){
    ev.preventDefault();
    if (!validate()) return;
    onCreate?.({ title: title.trim(), description: description.trim() });
    setTitle(""); setDescription(""); setErrors({});
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Create Project" className="card">
      <h3>Create Project</h3>
      <label className="label">Title</label>
      <input className="input" value={title} onChange={(e)=>setTitle(e.target.value)} />
      {errors.title && <div className="error">{errors.title}</div>}

      <label className="label">Description</label>
      <textarea className="textarea" rows="3" value={description} onChange={(e)=>setDescription(e.target.value)} />
      {errors.description && <div className="error">{errors.description}</div>}

      <button className="btn" type="submit">Create</button>
    </form>
  );
}
