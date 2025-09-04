import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SignUpForm(){
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  function validate(){
    const e = {};
    if (!name.trim()) e.name = "Name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address.";
    if (password.length < 6) e.password = "Password must be at least 6 characters.";
    if (confirmPassword !== password) e.confirmPassword = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev){
    ev.preventDefault();
    setMessage("");
    if (!validate()) return;
    try{
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Sign up failed");

      
      localStorage.setItem("merge_user", JSON.stringify(data.user));
      localStorage.setItem("merge_token", data.token);

      
      navigate("/home");
    }catch(err){
      setMessage(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" aria-label="Sign Up">
      <h3>Sign Up</h3>
      <label className="label">Name</label>
      <input className="input" value={name} onChange={(e)=>setName(e.target.value)} />
      {errors.name && <div className="error">{errors.name}</div>}

      <label className="label">Email</label>
      <input className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      {errors.email && <div className="error">{errors.email}</div>}

      <label className="label">Password</label>
      <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      {errors.password && <div className="error">{errors.password}</div>}

      <label className="label">Confirm Password</label>
      <input className="input" type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} />
      {errors.confirmPassword && <div className="error">{errors.confirmPassword}</div>}

      <button className="btn secondary" type="submit">Create Account</button>
      {message && <p className="helper">{message}</p>}
    </form>
  );
}
