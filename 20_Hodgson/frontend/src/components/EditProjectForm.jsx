//u23530996 Kiara Hodgson
import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function EditProjectForm({ project, onSave, disabled }){
  const [title, setTitle] = useState(project?.title || project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [imageFile, setImageFile] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(project?.title || project?.name || "");
    setDescription(project?.description || "");
  }, [project?._id, project?.title, project?.name, project?.description]);

  async function handleSubmit(e){
    e.preventDefault();
    if (disabled) return;
    setMessage("");
    try {
      setSaving(true);
      // Upload image first if provided 
      if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024) throw new Error("Image must be 5MB or less");
        await api.uploadProjectImage(project._id, imageFile);
      }
      await onSave?.({ ...project, title, description });
      setMessage("Project updated.");
    } catch (error) {
      setMessage(error.message || "Failed to update project");
    } finally {
      setSaving(false);
    }
  }

  const isDisabled = disabled || saving;

  return (
    <form onSubmit={handleSubmit} className="card" aria-label="Edit Project">
      <h3>Edit Project</h3>
      <label className="label">Title</label>
      <input
        className="input"
        value={title}
        onChange={(e)=>setTitle(e.target.value)}
        disabled={isDisabled}
      />
      <label className="label">Description</label>
      <textarea
        className="textarea"
        rows="3"
        value={description}
        onChange={(e)=>setDescription(e.target.value)}
        disabled={isDisabled}
      />
      <label className="label" htmlFor="project-image-upload">Project Image (max 5MB)</label>
      <input
        id="project-image-upload"
        className="input"
        type="file"
        accept="image/*"
        onChange={(e) => setImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
        disabled={isDisabled}
      />
      <button className="btn" type="submit" disabled={isDisabled}>
        {saving ? "Saving…" : "Save"}
      </button>
      {message && <p className="helper">{message}</p>}
    </form>
  );
}
