//u23530996 Kiara Hodgson
import React from "react";

export default function SearchInput({ value, onChange, placeholder = "Search..." }){
  return (
    <div className="card">
      <label className="label" htmlFor="search">Search</label>
      <input id="search" className="input" value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} />
      <small className="helper">Search input only.</small>
    </div>
  );
}