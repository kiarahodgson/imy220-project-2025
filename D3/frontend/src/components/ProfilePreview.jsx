import React from "react";

export default function ProfilePreview({ user }){
  return (
    <article className="card" aria-label={`Profile ${user.name}`}>
      <h4>{user.name}</h4>
      <p><small className="muted">{user.email}</small></p>
      <p>{user.bio}</p>
    </article>
  );
}
