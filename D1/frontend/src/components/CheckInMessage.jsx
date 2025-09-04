import React from "react";

export default function CheckInMessage({ entry, userName }){
  
  return (
    <div className="card" style={{padding:".75rem"}}>
      <div className="flex" style={{justifyContent:"space-between"}}>
        <strong>{entry.type.replace("-", " ")}</strong>
        <small className="muted">{new Date(entry.timestamp).toLocaleString()}</small>
      </div>

      <div><small> By: {userName}</small></div>
      <p style={{marginTop:".5rem"}}> {entry.message} </p>
    </div>
  );
}
