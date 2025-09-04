import React from "react";
import { Link } from "react-router-dom";

export default function SplashPage(){
  return (
    <div className="splash">
      <header className="splash-top">
       
        <div className="splash-brand">
          <img src="/assets/images/mergelogo.png" alt="MERGE" />
          <span className="visually-hidden"> MERGE </span>
        </div>

        <nav className="top-actions" aria-label="Auth actions">
          <Link className="pill pill-ghost" to="/login">Log in</Link>
          <Link className="pill pill-gradient" to="/signup">Sign up</Link>
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
            <Link className="cta-large" to="/signup"> Start project </Link>
          </div>

        </section>
      </main>
    </div>
  );
}
