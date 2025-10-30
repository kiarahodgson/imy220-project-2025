import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";

export default function Header({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const closeTimer = useRef(null);

  const toggleMenu = () => setMenuOpen((v) => !v);
  const closeMenu = () => setMenuOpen(false);
  const openMenu = () => setMenuOpen(true);
  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const delayedClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setMenuOpen(false), 180);
  };

  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => {
      document.removeEventListener('click', onDocClick);
      cancelClose();
    };
  }, []);

  return (
    <nav className="navbar" role="navigation" aria-label="Main">
      <Link className="brand" to={user ? "/home" : "/"}>
        <img 
            src="/assets/images/mergelogo.png" 
            alt="Merge logo" 
            style={{ height: "40px" }} 
          />
      </Link>


      <div className="navlinks">
        <NavLink to="/home" className="navlink"> Home </NavLink>

        {user && (
          <NavLink to="/search" className="navlink"> Search </NavLink>
        )}

        {user ? (
          <div
            className="navlink"
            ref={menuRef}
            onMouseEnter={() => { cancelClose(); openMenu(); }}
            onMouseLeave={delayedClose}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <NavLink
              to={`/profile/${user._id}`}
              className="navlink"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: 0 }}
            >
              <span>My Profile</span>
            </NavLink>
            <button
              type="button"
              onClick={toggleMenu}
              aria-haspopup="menu"
              aria-expanded={menuOpen ? 'true' : 'false'}
              title="Profile menu"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '1px solid var(--pink-200, #fce1ec)',
                background: '#fff',
                padding: 0,
                cursor: 'pointer'
              }}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={`${user.username || user.name || 'User'} avatar`}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    background: '#eee',
                    color: '#555'
                  }}
                >
                  {(user.username || user.name || '?').slice(0,1).toUpperCase()}
                </span>
              )}
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label="Profile menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  minWidth: 180,
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 12,
                  boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
                  padding: '10px 12px',
                  zIndex: 1000
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                  Signed in as <strong>{user.username || user.name}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => { closeMenu(); onLogout && onLogout(); }}
                  className="navlink"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    padding: '8px 0',
                    cursor: 'pointer',
                    color: '#d33'
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
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
