import React from "react";
import CheckInMessage from "./CheckInMessage";

export default function ProjectMessages({ messages = [], resolveUserName }){
  return (
    <section className="card">
      <h3>Project Messages</h3>
      {messages.length === 0 && <p>No messages yet.</p>}
      {messages.map(m => (
        <CheckInMessage key={m.id} entry={m} userName={resolveUserName(m.userId)} />
      ))}
    </section>
  );
}
