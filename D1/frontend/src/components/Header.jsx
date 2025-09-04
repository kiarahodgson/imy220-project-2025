import React from "react";
import { Link, NavLink } from "react-router-dom";

export default function Header({ user, onLogout }) {
  return (
    <nav className="navbar" role="navigation" aria-label="Main">
      <Link className="brand" to="/home">
        <img 
            src="/assets/images/mergelogo.png" 
            alt="Merge logo" 
            style={{ height: "40px" }} 
          />
      </Link>


      <div className="navlinks">
        <NavLink to="/home" className="navlink"> Home </NavLink>

        {/* Only show profile link if logged in */}
        {user && (
          <NavLink to={`/profile/${user._id}`} className="navlink">
            {user.username}'s Profile
          </NavLink>
        )}

        {/* Show either login/signup or logout depending on login state */}
        {user ? (
          <button className="navlink" onClick={onLogout}>Log out</button>
        ) : (
          <>
            <NavLink to="/login" className="navlink"> Log in </NavLink>
            <NavLink to="/signup" className="navlink"> Sign up </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
