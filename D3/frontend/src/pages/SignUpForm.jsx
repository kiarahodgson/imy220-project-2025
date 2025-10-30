import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function SignUpForm(){
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function validate(){
    const e = {};
    if (!name.trim()) e.name = "Name is required.";
    if (!username.trim()) e.username = "Username is required.";
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
      setLoading(true);

      const { user, token } = await api.signup({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });

      localStorage.setItem("merge_user", JSON.stringify(user));
      localStorage.setItem("merge_token", token ?? "");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("merge-auth-changed", { detail: { user, token } }));
      }

      navigate("/home");
    }catch(err){
      setMessage(err.message || "Sign up failed");
    }
    finally{
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" aria-label="Sign Up">
      <h3>Sign Up</h3>
      <label className="label" htmlFor="name">Name</label>
      <input
        id="name"
        name="name"
        className="input"
        value={name}
        onChange={(e)=>setName(e.target.value)}
        autoComplete="name"
      />
      {errors.name && <div className="error">{errors.name}</div>}

      <label className="label" htmlFor="username">Username</label>
      <input
        id="username"
        name="username"
        className="input"
        value={username}
        onChange={(e)=>setUsername(e.target.value)}
        autoComplete="username"
      />
      {errors.username && <div className="error">{errors.username}</div>}

      <label className="label" htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        className="input"
        type="email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        autoComplete="email"
      />
      {errors.email && <div className="error">{errors.email}</div>}

      <label className="label" htmlFor="signup-password">Password</label>
      <input
        id="signup-password"
        name="password"
        className="input"
        type="password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
        autoComplete="new-password"
      />
      {errors.password && <div className="error">{errors.password}</div>}

      <label className="label" htmlFor="signup-confirmPassword">Confirm Password</label>
      <input
        id="signup-confirmPassword"
        name="confirmPassword"
        className="input"
        type="password"
        value={confirmPassword}
        onChange={(e)=>setConfirmPassword(e.target.value)}
        autoComplete="new-password"
      />
      {errors.confirmPassword && <div className="error">{errors.confirmPassword}</div>}

      <button className="btn secondary" type="submit" disabled={loading}>
        {loading ? "Creating Account…" : "Create Account"}
      </button>
      {message && <p className="helper">{message}</p>}
    </form>
  );
}
