//u23530996 Kiara Hodgson
import React, { useEffect, useState } from "react";

export default function EditProfileForm({ user, onSave, disabled = false }) {
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setBio(user?.bio || "");
    setAvatarUrl(user?.avatarUrl || "");
  }, [user?._id, user?.name, user?.bio]);

  async function handleSubmit(e){
    e.preventDefault();
    if (disabled) return;
    setMessage("");
    setError("");
    try {
      setSaving(true);
      await onSave?.({ name: name.trim(), bio: bio, avatarUrl: avatarUrl.trim() });
      setMessage("Profile updated.");
    } catch (err) {
      setError(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  const isDisabled = disabled || saving;

  return (
    <form onSubmit={handleSubmit} className="card" aria-label="Edit Profile" style={{ marginTop: '1rem' }}>
      <h3>Edit Profile</h3>
      <label className="label">Name</label>
      <input
        className="input"
        value={name}
        onChange={(e)=>setName(e.target.value)}
        disabled={isDisabled}
      />
      <label className="label">Avatar Image URL</label>
      <input
        className="input"
        value={avatarUrl}
        onChange={(e)=>setAvatarUrl(e.target.value)}
        disabled={isDisabled}
        placeholder="https://..."
      />
      <label className="label">Bio</label>
      <textarea
        className="textarea"
        rows="3"
        value={bio}
        onChange={(e)=>setBio(e.target.value)}
        disabled={isDisabled}
      />
      <button className="btn" type="submit" disabled={isDisabled}>
        {saving ? "Saving…" : "Save"}
      </button>
      {message && <p className="helper" role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
