# Real-Time Elevator Simulation

This project is a full-stack application designed to simulate and manage a system of elevators in real-time, built for a junior developer take-home assignment.

The system features a .NET backend with a background service running a sophisticated multi-elevator dispatching algorithm, and a React frontend for user interaction and visualization. Real-time communication is handled by SignalR.

## Project Structure

The repository is organized into two main folders:

-   **/backend**: Contains the ASP.NET Core Web API project (`ElevatorApi`).
-   **/frontend**: Contains the React project (`elevator-client`).

## Technologies Used

-   **Backend**: ASP.NET Core 8, Entity Framework Core, SignalR
-   **Frontend**: React, JavaScript, CSS Modules, react-router-dom
-   **Database**: SQL Server
-   **Authentication**: JWT (JSON Web Tokens)

## Setup and Running Instructions

### Prerequisites

-   .NET 8 SDK
-   Node.js and npm
-   SQL Server (LocalDB is sufficient)

### 1. Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend/ElevatorApi
    ```
2.  **Configure Database:**
    -   Open the `appsettings.json` file.
    -   Verify the `DefaultConnection` string under `ConnectionStrings` points to your local SQL Server instance.
3.  **Restore Dependencies & Create Database:**
    ```bash
    dotnet restore
    dotnet ef database update
    ```
4.  **Run the Server:**
    ```bash
    dotnet run
    ```
    The backend server will start (e.g., on `http://localhost:5009`) and the simulation service will begin running.

### 2. Frontend Setup

1.  **Open a new, separate terminal.**
2.  **Navigate to the frontend directory:**
    ```bash
    cd frontend/elevator-client
    ```
3.  **Configure Environment:**
    -   In the `elevator-client` root, create a new file named `.env`.
    -   Add the following line, ensuring the port matches your running backend:
        ```
        REACT_APP_API_BASE_URL=http://localhost:5009
        ```
4.  **Install Dependencies:**
    ```bash
    npm install
    ```
5.  **Run the Client:**
    ```bash
    npm start
    ```
    The React application will open in your browser (e.g., at `http://localhost:3000`).

## Algorithm Approach

The elevator simulation is managed by a `BackgroundService` in the backend that runs on a timed "tick."

-   **State Management:** The service uses in-memory `ConcurrentDictionary` objects to manage the destination queues and door timers for each elevator, keeping the simulation state separate from the persistent database state.
-   **Dispatcher Logic:** The service acts as an intelligent dispatcher. For each unhandled call, it first checks if any currently moving elevators can efficiently pick up the call "on the way" based on their current direction and position.
-   **Idle Elevator Assignment:** If no elevator is available "on the way," the dispatcher assigns the call to the closest idle elevator.
-   **State Machine:** A `switch` statement manages the elevator's state (`Idle`, `MovingUp`, `MovingDown`, `OpeningDoors`, `ClosingDoors`) to control its behavior during each tick.

## Bonus Mission Completion

The following bonus tasks from the assignment were completed:

#### 1. Multiple Elevators per Building
-   The database schema was refactored to a one-to-many relationship.
-   The UI was updated to allow creating buildings with a specified number of elevators.
-   The backend service was upgraded with the "dispatcher" logic described above to intelligently manage the multi-elevator system.
-   The frontend was updated to display and track all elevators in a building in real-time.

#### 2. User Experience Improvements
-   **Smooth Animations:** CSS transitions were implemented to make the elevator movement between floors smooth instead of instantaneous.
-   **Loading States:** A global loading modal was created using React Context. It automatically appears during any HTTP request, providing clear feedback to the user.
-   **Visual Polish:** The UI was styled with CSS Modules for a clean, modern, and organized look, including hover effects and animated indicator lights.