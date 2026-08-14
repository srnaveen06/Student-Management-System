import React from 'react';

// Full page loading spinner overlay
export const Loader = () => (
  <div className="loader-overlay">
    <div className="spinner" />
  </div>
);

// Inline loader for sections
export const InlineLoader = () => (
  <div className="loader-inline">
    <div className="spinner" />
  </div>
);

export default Loader;
