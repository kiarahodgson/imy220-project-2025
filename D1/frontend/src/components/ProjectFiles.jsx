import React from "react";

export default function ProjectFiles({ files = [] }){
  return (
    <section className="card">
      <h3>Files</h3>
      <ul>
        {files.map(f => <li key={f}>{f}</li>)}
      </ul>
    </section>
  );
}
