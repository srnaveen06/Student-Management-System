import React from 'react';
import NLSearchBar from '../../components/AI/NLSearchBar';

const AISearch = () => {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Student Search</h1>
          <p>Find students using natural language instead of filter dropdowns.</p>
        </div>
      </div>
      <div className="dashboard-section">
        <div className="dashboard-section-body">
          <NLSearchBar />
          <p className="form-hint" style={{ marginTop: '12px' }}>
            Examples: "count female students", "computer science students above 8 cgpa",
            "mechanical sem 5 students", "students with pending fees".
          </p>
        </div>
      </div>
    </div>
  );
};

export default AISearch;
