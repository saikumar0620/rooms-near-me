# Rooms Near Me

A location-based room search and rental listings application focused on Hyderabad. This project allows users to find rooms based on their current location or specific coordinates and post new room listings.

## Project Structure

- `frontend/`: React application built with Vite.
- `backend/`: Express.js API server handling room data and location logic.
- `data/`: CSV data store for room listings (located in `backend/data/`).

## Features

- **Location-based Search**: Find rooms near specific coordinates using the Haversine formula.
- **Rent Parsing**: Handles various messy rent formats (e.g., "12k", "Rs 12,000/month") and normalizes them.
- **Coordinate Validation**: Ensures listings are within valid India coordinates.
- **CSV Data Store**: Uses a simple and portable CSV-based data storage system.

## Setup and Installation

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd rooms-near-me
   ```

2. Install dependencies for the root, frontend, and backend:
   ```bash
   npm install
   npm install --prefix frontend
   npm install --prefix backend
   ```

## Running the Application

You can run the application using the scripts defined in the root `package.json`:

- **Development Mode**:
  ```bash
  npm run dev
  ```
  This starts the Vite development server for the frontend.

- **Start Backend**:
  ```bash
  npm start
  ```
  This starts the Express server.

- **Build Frontend**:
  ```bash
  npm run build
  ```

## API Documentation

The backend serves an API on port 3000 (default) with the following main endpoints:
- `GET /api/rooms`: Fetch room listings with optional filters.
- `POST /api/rooms`: Post a new room listing.

## License

MIT
