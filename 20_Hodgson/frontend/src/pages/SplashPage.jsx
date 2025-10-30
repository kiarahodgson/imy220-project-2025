//u23530996 Kiara Hodgson

import React from "react";
import { Link } from "react-router-dom";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";

export default function SplashPage(){
  return (
    <div className="splash">
      <header className="splash-top">
       
        <div className="splash-brand">
          <img src="/assets/images/mergelogo.png" alt="MERGE" />
          <span className="visually-hidden"> MERGE </span>
        </div>

        <nav className="top-actions" aria-label="Auth actions">
          <a className="pill pill-ghost" href="#login">Log in</a>
          <a className="pill pill-gradient" href="#signup">Sign up</a>
        </nav>
      </header>

      
      <main className="splash-hero container">
        <section className="splash-copy">
          <p className="lede">
            Level up your workflow and master the art of the Merge -
            collaboration and creation can be easy.
          </p>
          <p className="lede">
            Host your projects, track every change, connect with collaborators,
            and keep work in sync, all in one place.
          </p>

          <div className="splash-meta">
            <strong>60k+ users</strong>
            <span>Join the club</span>
          </div>
        </section>

        <section className="splash-right">
          <h1 className="hero-title">
            You synthesize,<br/>we synergize.
          </h1>

          <div className="cta-row">
            <a className="cta-large" href="#signup"> Start project </a>
          </div>

        </section>
      </main>

      <main className="container" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
          <section id="login" aria-label="Login">
            <LoginForm />
          </section>
          <section id="signup" aria-label="Sign Up">
            <SignUpForm />
          </section>
        </div>
      </main>
    </div>
  );
  
}
