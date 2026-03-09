# FlashSpace Docker Backend Guide

This document explains how to run the backend using Docker, why we are using it, and details about the underlying services (Redis, MongoDB, Socket.IO).

## 🚀 How to Run the Backend

To start the entire backend stack (Server, Database, Redis), run this command in your terminal inside `flashspace-web-server`:

```bash
docker-compose up --build
```
*   `up`: Starts the containers.
*   `--build`: Forces a rebuild of the specialized Docker image. **Always use this if you have installed new npm packages (like socket.io) or made changes to `package.json`.**

To stop the backend:
```bash
docker-compose down
```

---

## ❓ Why no more `npm run dev`?

Previously, you ran `npm run dev` to start a Node.js process directly on your local machine.
Now, **Docker** takes over that responsibility.

*   **Then**: You had to ensure MongoDB was installed and running locally, Redis was installed locally, and Node versions matched.
*   **Now**: Docker creates a self-contained "virtual computer" (container) that has Node, MongoDB, and Redis pre-installed and configured exactly how the app needs them.
*   **Conflict**: If you run `npm run dev` while Docker is running, it will fail because **Port 5000** is already being used by the Docker container.

---

## 🛠 Services & Tech Stack

### 1. Redis (Port 6379)
*   **What is it?**: An ultra-fast, in-memory data store.
*   **Why do we use it?**:
    *   **Socket.IO Adapter**: It helps manage real-time connections, especially if we scale to multiple backend instances in the future.
    *   **Caching**: It can store frequently accessed data strings to reduce database load.
*   **Port**: Accessible locally at `localhost:6379`.

### 2. Socket.IO (Real-time Communication)
*   **What is it?**: A library that enables real-time, bi-directional communication between the web client and the server.
*   **Usage**:
    *   **Notifications**: Sending instant alerts to admins when a meeting is booked.
    *   **Chat**: Powering the support chat feature.
    *   **Live Updates**: Updating the dashboard without refreshing the page.

### 3. MongoDB (Database)
*   **Where is my data?**: Your data is stored in a **Docker Volume** named `mongo-data`. This volume persists even if you delete the container, so your data is safe.
*   **How to access it?**:
    *   **Connection String**: `mongodb://localhost:27018/myapp`
    *   **Port**: We have mapped the container's port 27017 to your local machine's **Port 27018**.
    *   **Why 27018?**: This avoids conflicts if you have a local MongoDB instance already running on the default port 27017.
*   **GUI Access**: You can use MongoDB Compass or Studio 3T to connect to `localhost:27018`.

---

## 📂 Important Files

*   **`docker-compose.yml`**: The "recipe" file that tells Docker how to spin up the backend, database, and Redis together.
*   **`Dockerfile`**: The blueprint for building the backend server image itself.
*   **`google-tokens.json`**: This file (on your host machine) is **mounted** into the container so that your Google Calendar authentication persists even when the container restarts.
