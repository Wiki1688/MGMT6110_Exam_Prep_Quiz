import React, { useEffect, useState } from 'react';

/** Shows "New version available — tap to refresh" when a new service worker takes over. */
export default function UpdateToast() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(true);
    window.addEventListener('mgmt6110:update', on);
    if (window.__mgmt6110UpdateReady) setShow(true);
    return () => window.removeEventListener('mgmt6110:update', on);
  }, []);
  if (!show) return null;
  const refresh = () => {
    window.dispatchEvent(new Event('mgmt6110:flush')); // save everything first
    window.location.reload();
  };
  return (
    <button className="update-toast" onClick={refresh} role="status">
      <span aria-hidden>✨</span> New version available — tap to refresh
    </button>
  );
}
