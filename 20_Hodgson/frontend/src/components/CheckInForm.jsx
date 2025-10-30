//u23530996 Kiara Hodgson
import React, { useEffect, useState } from 'react';

export default function CheckInForm({
  onSubmit,
  disabled = false,
  currentStatus = 'checked-in',
  currentVersion = '',
  allowedActions = [],
  existingFiles = [],
}) {
  const [type, setType] = useState('check-in');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [removeSet, setRemoveSet] = useState(new Set());
  const [version, setVersion] = useState(currentVersion || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setVersion(currentVersion || '');
  }, [currentVersion]);

  useEffect(() => {
    if (Array.isArray(allowedActions) && allowedActions.length > 0) {
      setType(allowedActions[0]);
      return;
    }
    if ((currentStatus || 'checked-in') === 'checked-in') setType('check-out');
    else setType('check-in');
  }, [currentStatus, allowedActions]);

  const isCheckout = type === 'check-out';
  const isNote = type === 'note';
  const isCheckin = type === 'check-in';

  function validate() {
    if (isCheckout) return true; // message optional on checkout
    if (!message.trim()) {
      setError(isNote ? 'Please enter a note.' : 'Please describe your changes.');
      return false;
    }
    return true;
  }

  async function handleSubmit(evt) {
    evt.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;

    try {
      setLoading(true);
      await onSubmit?.({
        type,
        message: message.trim(),
        version: version.trim(),
        files,
        removeFiles: Array.from(removeSet),
      });
      setSuccess('Activity recorded.');
      setMessage('');
    } catch (err) {
      setError(err?.message || 'Failed to record activity');
    } finally {
      setLoading(false);
    }
  }

  const isDisabled = disabled || loading;
  const statusLabel = currentStatus.replace(/-/g, ' ');
  const onlyCheckOut = (Array.isArray(allowedActions) && allowedActions.length > 0)
    ? (allowedActions.length === 1 && allowedActions[0] === 'note')
      ? false
      : (allowedActions.length === 2 && allowedActions.includes('check-out') && allowedActions.includes('note'))
    : (currentStatus || 'checked-in') === 'checked-in';

  function computeBumps(curr) {
    const parts = String(curr || '0.0.0').split('.').map((n) => parseInt(n, 10));
    const [maj, min, pat] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
    const nextPatch = `${maj}.${min}.${pat + 1}`;
    const nextMinor = `${maj}.${min + 1}.0`;
    const nextMajor = `${maj + 1}.0.0`;
    return { nextPatch, nextMinor, nextMajor };
  }

  return (
    <form className="card" aria-label="Project activity" onSubmit={handleSubmit}>
      <h3>Log Activity</h3>

      <div className="helper" style={{ marginBottom: '.5rem' }}>
        Current status: <strong>{statusLabel || 'n/a'}</strong> • Version: {currentVersion || 'n/a'}
      </div>

      <label className="label" htmlFor="checkin-type">Activity</label>
      <select
        id="checkin-type"
        className="select"
        value={type}
        onChange={(e) => setType(e.target.value)}
        disabled={isDisabled}
      >
        {Array.isArray(allowedActions) && allowedActions.length > 0 ? (
          allowedActions.map((act) => (
            <option key={act} value={act}>{act.replace(/-/g, ' ')}</option>
          ))
        ) : (
          (onlyCheckOut ? (
            <>
              <option value="check-out">Check out</option>
              <option value="note">Note</option>
            </>
          ) : (
            <>
              <option value="check-in">Check in</option>
              <option value="check-out">Check out</option>
              <option value="note">Note</option>
            </>
          ))
        )}
      </select>

      <label className="label" htmlFor="checkin-message">{isCheckout ? 'Optional note' : 'Message'}</label>
      <textarea
        id="checkin-message"
        className="textarea"
        rows="3"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={isDisabled}
        placeholder={isCheckout ? 'Optional note about what you plan to change...' : (isNote ? 'Share a note...' : 'Describe what changed...')}
      />

      {isCheckin && (
        <div>
          <label className="label" htmlFor="checkin-version">Version</label>
          <input
            id="checkin-version"
            className="input"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            disabled={isDisabled}
            placeholder="e.g. 1.0.1"
          />
          <div className="flex">
            {(() => {
              const { nextPatch, nextMinor, nextMajor } = computeBumps(currentVersion);
              return (
                <>
                  <button
                    type="button"
                    className="btn"
                    disabled={isDisabled}
                    onClick={() => setVersion(nextPatch)}
                  >
                    Patch {nextPatch}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={isDisabled}
                    onClick={() => setVersion(nextMinor)}
                  >
                    Minor {nextMinor}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={isDisabled}
                    onClick={() => setVersion(nextMajor)}
                  >
                    Major {nextMajor}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {isCheckin && (
        <div>
          <label className="label" htmlFor="checkin-files">Upload files</label>
          <input
            id="checkin-files"
            className="input"
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            disabled={isDisabled}
          />
        </div>
      )}

      {isCheckin && Array.isArray(existingFiles) && existingFiles.length > 0 && (
        <div style={{ marginTop: '.5rem' }}>
          <label className="label">Remove existing files</label>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {existingFiles.map((f) => {
              const name = typeof f === 'string' ? f : (f?.name || f?.filename || f?.path || '');
              if (!name) return null;
              const checked = removeSet.has(name);
              return (
                <li key={name}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setRemoveSet((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(name); else next.delete(name);
                          return next;
                        });
                      }}
                      disabled={isDisabled}
                    />
                    <span>{name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button className="btn" type="submit" disabled={isDisabled}>
        {loading ? 'Saving…' : 'Save activity'}
      </button>

      {error && <p className="error" role="alert">{error}</p>}
      {success && <p className="helper" role="status">{success}</p>}
    </form>
  );
}
