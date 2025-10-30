import React from "react";
import { Link } from "react-router-dom";
import SignUpForm from "./SignUpForm";

export default function SignUpPage(){
  return (
    <main className="container">
      <SignUpForm />
      <p style={{marginTop:"1rem"}}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </main>
  );
}
