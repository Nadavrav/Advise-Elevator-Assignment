import React from 'react';
import { Link } from 'react-router-dom';

function DashboardPage() {
  return (
    <div>
      <h1>My Buildings Dashboard</h1>
      {/* We will map over real data later */}
      <p>
        <Link to="/building/1">Go to Building 1</Link>
      </p>
    </div>
  );
}

export default DashboardPage;