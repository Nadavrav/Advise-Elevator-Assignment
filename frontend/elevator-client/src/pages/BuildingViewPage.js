import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HubConnectionBuilder } from "@microsoft/signalr";
import styles from "./BuildingViewPage.module.css";

// Corrected import path
import elevatorImage from "../assets/elevator-door.png";
import arrowUpImage from "../assets/arrow-up.png";
import arrowDownImage from "../assets/arrow-down.png";

function BuildingViewPage() {
  // ... (All logic inside the component remains the same)
  const { id: buildingId } = useParams();
  const { token } = useAuth();
  const [building, setBuilding] = useState(null);
  const [elevators, setElevators] = useState({});
  const [error, setError] = useState(null);
  const [connection, setConnection] = useState(null);
  useEffect(() => {
    const fetchBuilding = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/buildings/${buildingId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Failed to fetch building details.");
        const data = await response.json();
        setBuilding(data);
        const initialElevators = {};
        for (const elevator of data.elevators) {
          initialElevators[elevator.id] = { ...elevator, destinations: [] };
        }
        setElevators(initialElevators);
      } catch (err) {
        setError(err.message);
      }
    };
    if (token) fetchBuilding();
  }, [buildingId, token]);
  useEffect(() => {
    const newConnection = new HubConnectionBuilder()
      .withUrl(`${process.env.REACT_APP_API_BASE_URL}/elevatorHub`)
      .withAutomaticReconnect()
      .build();
    setConnection(newConnection);
  }, []);
  useEffect(() => {
    if (connection) {
      connection
        .start()
        .then(() => {
          console.log("SignalR Connected!");
          connection
            .invoke("JoinBuildingGroup", buildingId)
            .catch((err) => console.error("Error joining group: ", err));
          connection.on("ReceiveElevatorUpdate", (update) => {
            setElevators((prev) => ({
              ...prev,
              [update.id]: { ...prev[update.id], ...update },
            }));
          });
        })
        .catch((e) => console.log("Connection failed: ", e));
    }
    return () => {
      connection?.stop();
    };
  }, [connection, buildingId]);
  const handleCallElevator = async (floor) => {
    try {
      await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/calls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          buildingId: parseInt(buildingId),
          requestedFloor: floor,
        }),
      });
    } catch (err) {
      alert("Failed to call elevator.");
    }
  };
  const handleSelectDestination = async (pickupFloor, destinationFloor) => {
    try {
      await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/calls/destination`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            buildingId: parseInt(buildingId),
            pickupFloor: pickupFloor,
            destinationFloor: destinationFloor,
          }),
        }
      );
    } catch (err) {
      alert("Failed to select destination.");
    }
  };
  if (!building) return <div>Loading building...</div>;
  const floors = Array.from(
    { length: building.numberOfFloors },
    (_, i) => building.numberOfFloors - 1 - i
  );
  const elevatorArray = Object.values(elevators);
  const renderElevatorContent = (elevator) => {
    if (elevator.doorStatus === "Open") {
      return (
        <div className={styles.destinationPad}>
          {Array.from({ length: building.numberOfFloors }, (_, i) => i).map(
            (floor) => (
              <button
                key={floor}
                onClick={() =>
                  handleSelectDestination(elevator.currentFloor, floor)
                }
                disabled={floor === elevator.currentFloor}
                className={styles.destinationButton}
              >
                {floor}
              </button>
            )
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.pageContainer}>
      {/* Corrected Link component for the animated button */}
      <Link to="/dashboard" className={styles.animatedBackButton}>
        <span>&larr; Back to Dashboard</span>
      </Link>
      <h1>{building.name}</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className={styles.simulationContainer}>
        <div className={styles.floorsColumn}>
          {floors.map((floorNum) => (
            <div key={floorNum} className={styles.floorLabel}>
              <span>Floor {floorNum}</span>
              <button
                onClick={() => handleCallElevator(floorNum)}
                className={styles.callButton}
              >
                Call
              </button>
            </div>
          ))}
        </div>
        <div className={styles.shaftsContainer}>
          {elevatorArray.map((elevator) => (
            <div key={elevator.id} className={styles.shaft}>
              <div
                className={`${styles.elevator} ${
                  elevator.doorStatus === "Open" ? styles.elevatorOpen : ""
                }`}
                style={{
                  top: `${
                    (building.numberOfFloors - 1 - elevator.currentFloor) * 90
                  }px`,
                }}
              >
                <div className={styles.indicatorPanel}>
                  <img
                    src={arrowUpImage}
                    alt="Up"
                    className={`${styles.arrow} ${
                      elevator.direction === "Up" ? styles.active : ""
                    }`}
                  />
                  <img
                    src={arrowDownImage}
                    alt="Down"
                    className={`${styles.arrow} ${
                      elevator.direction === "Down" ? styles.active : ""
                    }`}
                  />
                </div>
                <div
                  className={styles.elevatorImage}
                  style={{ backgroundImage: `url(${elevatorImage})` }}
                ></div>
                {renderElevatorContent(elevator)}
                <span className={styles.tooltip}>
                  Floor: {elevator.currentFloor} | Status: {elevator.status}
                  {elevator.destinations &&
                    elevator.destinations.length > 0 &&
                    ` | Destinations: ${elevator.destinations.join(", ")}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BuildingViewPage;
