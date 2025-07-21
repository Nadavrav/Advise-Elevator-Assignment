import React from 'react';
import { useParams } from 'react-router-dom';

function BuildingViewPage() {
  let { id } = useParams();

  return (
    <div>
      <h1>Viewing Building: {id}</h1>
      <p>The elevator simulation will be here.</p>
    </div>
  );
}

export default BuildingViewPage;