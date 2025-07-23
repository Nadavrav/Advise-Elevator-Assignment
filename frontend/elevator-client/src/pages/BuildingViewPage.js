import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HubConnectionBuilder } from "@microsoft/signalr";
import styles from "./BuildingViewPage.module.css";

function BuildingViewPage() {
  const { id: buildingId } = useParams();
  const { token } = useAuth();

  const [building, setBuilding] = useState(null);
  const [elevators, setElevators] = useState({});
  const [error, setError] = useState(null);
  const [connection, setConnection] = useState(null);

  // All of your useEffect and handler functions are correct and do not need changes.
  useEffect(() => {
    const fetchBuilding = async () => {
      try {
        const response = await fetch(
          `http://localhost:5009/api/buildings/${buildingId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Failed to fetch building details.");
        const data = await response.json();
        setBuilding(data);

        const initialElevators = {};
        for (const elevator of data.elevators) {
          initialElevators[elevator.id] = elevator;
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
      .withUrl("http://localhost:5009/elevatorHub")
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
            console.log("Update received for elevator " + update.id, update);
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
      await fetch("http://localhost:5009/api/calls", {
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
      await fetch("http://localhost:5009/api/calls/destination", {
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
      });
      alert(`Destination ${destinationFloor} selected!`);
    } catch (err) {
      alert("Failed to select destination.");
    }
  };

  if (!building) return <div>Loading building...</div>;

  const floors = Array.from({ length: building.numberOfFloors }, (_, i) => i);
  const elevatorArray = Object.values(elevators);

  const renderElevatorContent = (elevator) => {
    if (elevator.doorStatus === "Open") {
      return (
        <>
          <span>E-{elevator.id}</span>
          <div className={styles.destinationPad}>
            {floors.map((floor) => (
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
            ))}
          </div>
        </>
      );
    }
    return <span>E-{elevator.id}</span>;
  };

  return (
    <div className={styles.pageContainer}>
      <h1>{building.name}</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className={styles.simulationContainer}>
        {/* Floors Column */}
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

        {/* Elevator Shafts */}
        <div className={styles.shaftsContainer}>
          {elevatorArray.map((elevator) => (
            <div key={elevator.id} className={styles.shaft}>
              <div
                className={`${styles.elevator} ${
                  elevator.doorStatus === "Open" ? styles.elevatorOpen : ""
                }`}
                style={{
                  transform: `translateY(-${
                    elevator.currentFloor * (80 + 10)
                  }px)`, // 80px height + 10px gap
                }}
              >
                {renderElevatorContent(elevator)}
                <span className={styles.tooltip}>
                  Floor: {elevator.currentFloor} | Status: {elevator.status}
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
