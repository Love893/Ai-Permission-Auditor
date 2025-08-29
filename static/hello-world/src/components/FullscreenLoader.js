import React from 'react';
import './loader.css';

export default function FullscreenLoader() {
  return (
    <div className="fullscreen-loader" role="status" aria-busy="true" aria-live="polite">
      <div className="loader-content">
        <div className="spinner" aria-hidden="true"></div>
        <div className="loader-text">Loading…</div>
      </div>
    </div>
  );
}