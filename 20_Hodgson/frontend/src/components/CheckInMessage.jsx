//u23530996 Kiara Hodgson
import React from "react";

export default function CheckInMessage({ entry, userName }){
  const type = (entry?.type || 'check-in').replace(/-/g, ' ');
  const dateInput = entry?.createdAt || entry?.timestamp;
  const timestamp = dateInput ? new Date(dateInput) : null;
  const dateLabel = timestamp && !Number.isNaN(timestamp) ? timestamp.toLocaleString() : '';

  return (
    <div className="card" style={{padding:".75rem"}}>
      <div className="flex" style={{justifyContent:"space-between"}}>
        <strong>{type}</strong>
        {dateLabel && <small className="muted">{dateLabel}</small>}
      </div>

      <div><small> By: {userName}</small></div>
      {entry?.version && (
        <div><small className="muted">Version: {entry.version}</small></div>
      )}
      <p style={{marginTop:".5rem"}}> {entry?.message || '(no message provided)'} </p>
    </div>
  );
}
