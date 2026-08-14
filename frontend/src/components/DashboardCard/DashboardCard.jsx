import React from 'react';

// Reusable dashboard stat card component
const DashboardCard = ({ icon, iconColor, title, value }) => {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconColor}`}>
        {icon}
      </div>
      <div className="stat-info">
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
    </div>
  );
};

export default DashboardCard;
