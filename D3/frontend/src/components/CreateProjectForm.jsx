import React, { useState } from "react";

const toHashtagArray = (input) =>
  input
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);

export default function CreateProjectForm({ onCreate }){
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(){
    const e = {};
    if (!name.trim()) e.name = "Project name is required.";
    if (description.trim().length < 10) e.description = "Description should be at least 10 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev){
    ev.preventDefault();
    setMessage("");
    if (!validate()) return;
    try{
      setLoading(true);
      await onCreate?.({
        name: name.trim(),
        description: description.trim(),
        type: type.trim(),
        hashtags: toHashtagArray(hashtags),
        imageUrl: imageUrl.trim(),
        imageFile: imageFile || null,
      });
      setName("");
      setDescription("");
      setType("");
      setHashtags("");
      setImageUrl("");
      setImageFile(null);
      setErrors({});
      setMessage("Project created successfully.");
    }catch(err){
      setMessage(err.message || "Failed to create project");
    }finally{
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Create Project" className="card">
      <h3>Create Project</h3>

      <label className="label" htmlFor="project-name">Project Name</label>
      <input id="project-name" className="input" value={name} onChange={(e)=>setName(e.target.value)} />
      {errors.name && <div className="error">{errors.name}</div>}

      <label className="label" htmlFor="project-type">Project Type</label>
      <input id="project-type" className="input" value={type} onChange={(e)=>setType(e.target.value)} placeholder="e.g. Web App" />

      <label className="label" htmlFor="project-description">Description</label>
      <textarea
        id="project-description"
        className="textarea"
        rows="3"
        value={description}
        onChange={(e)=>setDescription(e.target.value)}
      />
      {errors.description && <div className="error">{errors.description}</div>}

      <label className="label" htmlFor="project-hashtags">Hashtags</label>
      <input
        id="project-hashtags"
        className="input"
        value={hashtags}
        onChange={(e)=>setHashtags(e.target.value)}
        placeholder="#react, #nodejs"
      />

      <label className="label" htmlFor="project-image">Image URL</label>
      <input
        id="project-image"
        className="input"
        value={imageUrl}
        onChange={(e)=>setImageUrl(e.target.value)}
        placeholder="https://example.com/project.png"
      />

      <label className="label" htmlFor="project-image-file">Or upload image (max 5MB)</label>
      <input
        id="project-image-file"
        className="input"
        type="file"
        accept="image/*"
        onChange={(e) => setImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
      />

      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create"}
      </button>
      {message && <p className="helper" role="status">{message}</p>}
    </form>
  );
}
