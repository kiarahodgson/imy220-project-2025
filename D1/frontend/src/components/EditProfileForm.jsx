import React, { useState } from "react";

export default function EditProfileForm({ user, onSave }){
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");

  function handleSubmit(e){
    e.preventDefault();
    onSave?.({ ...user, name, bio });
  }
  return (
    <form onSubmit={handleSubmit} className="card" aria-label="Edit Profile">
      <h3>Edit Profile</h3>
      <label className="label">Name</label>
      <input className="input" value={name} onChange={(e)=>setName(e.target.value)} />
      <label className="label">Bio</label>
      <textarea className="textarea" rows="3" value={bio} onChange={(e)=>setBio(e.target.value)} />
      <button className="btn" type="submit"> Save </button>
    </form>
  );
}
