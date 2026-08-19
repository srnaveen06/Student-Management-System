import React from 'react';

const DashboardCard = ({ icon, iconColor, title, value, trend, trendDirection }) => {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconColor}`}>
        {icon}
      </div>
      <div className="stat-info">
        <h3>{value}</h3>
        <p>{title}</p>
        {trend && (
          <span className={`stat-trend ${trendDirection || 'up'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export default DashboardCard;
