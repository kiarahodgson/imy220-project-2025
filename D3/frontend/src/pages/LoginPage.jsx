import React from "react";
import { Link } from "react-router-dom";
import LoginForm from "./LoginForm";

export default function LoginPage(){
  return (
    <main className="container">
      <LoginForm />
      <p style={{marginTop:"1rem"}}>
        Don’t have an account? <Link to="/signup">Sign up</Link>
      </p>
    </main>
  );
}
