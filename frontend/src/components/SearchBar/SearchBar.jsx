import React from 'react';

// Search input with icon
const SearchBar = ({ value, onChange, placeholder }) => {
  return (
    <div className="search-box">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search by name, ID, email, or phone...'}
      />
    </div>
  );
};

export default SearchBar;
