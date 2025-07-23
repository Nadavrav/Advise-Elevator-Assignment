import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLoading } from "../context/LoadingContext"; 
import styles from "./DashboardPage.module.css";

function DashboardPage() {
  const [buildings, setBuildings] = useState([]);
  const [name, setName] = useState("");
  const [floors, setFloors] = useState(10);
  const [numElevators, setNumElevators] = useState(1);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { showLoading, hideLoading } = useLoading(); 

  const fetchBuildings = useCallback(async () => {
    setError(null);
    showLoading();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/buildings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch buildings.");
      }
      const data = await response.json();
      setBuildings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      hideLoading();
    }
  }, [token, showLoading, hideLoading]);

  useEffect(() => {
    if (token) {
      fetchBuildings();
    }
  }, [token, fetchBuildings]);

  const handleCreateBuilding = async (event) => {
    event.preventDefault();
    setError(null);
    showLoading();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/buildings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name,
          numberOfFloors: parseInt(floors),
          numberOfElevators: parseInt(numElevators),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create building.");
      }
      setName("");
      setFloors(10);
      setNumElevators(1);
      fetchBuildings(); 
    } catch (err) {
      setError(err.message);
      hideLoading(); 
    }
   
  };

  return (
    <div className={styles.dashboardContainer}>
      <h1>My Buildings Dashboard</h1>

      <div className={styles.section}>
        <h2>Add New Building</h2>
        <form onSubmit={handleCreateBuilding} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Building Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Number of Floors:</label>
            <input
              type="number"
              value={floors}
              onChange={(e) => setFloors(e.target.value)}
              min="1"
              required
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Number of Elevators:</label>
            <input
              type="number"
              value={numElevators}
              onChange={(e) => setNumElevators(e.target.value)}
              min="1"
              max="10"
              required
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.button}>
            Create Building
          </button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      <div className={styles.section}>
        <h2>Existing Buildings</h2>
        {buildings.length > 0 ? (
          <ul className={styles.buildingList}>
            {buildings.map((building) => (
              <li key={building.id} className={styles.buildingItem}>
                <Link
                  to={`/building/${building.id}`}
                  className={styles.buildingLink}
                >
                  {building.name} ({building.numberOfFloors} floors)
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>No buildings found. Create one above!</p>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
