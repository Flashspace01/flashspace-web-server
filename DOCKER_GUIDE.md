# Docker Guide for Flashspace Server

## 1. The 'Why': Multi-Stage Builds vs. Single-Stage
In a production environment, image size and security are paramount.

- **Single-Stage Build**: A standard `npm install` brings in `devDependencies` (like TypeScript, nodemon, testing libraries) and your full source code. This bloats the image (often 1GB+) and increases the attack surface.
- **Multi-Stage Build**: We use two "stages" in one Dockerfile:
    1.  **Builder Stage**: Contains all tools needed to compile the code (`tsc`, `npm install`). We generate the production-ready JavaScript in the `/dist` folder.
    2.  **Runner Stage**: A fresh, minimal image. We copy **only** the `/dist` folder and `production` dependencies from the Builder stage. The original source code and dev tools are discarded.
    - **Result**: A tiny, secure image (often <200MB) containing only what's needed to run the app.

## 2. Networking Layer: `-p 3000:3000`
The command `-p [HOST]:[CONTAINER]` maps a port on your host machine to a port inside the container.
- **`-p 3000:3000`**: Traffic hitting port `3000` on your Linux server is forwarded to port `3000` inside the container.
- **Database Connection (`localhost` vs. Network Name)**:
    - **Localhost**: Inside a container, `localhost` refers to the **container itself**, not your Linux host. If your DB is running on the host machine, the container cannot reach it via `localhost`.
    - **Docker Network**: Use `host.docker.internal` (Mac/Windows) or the **service name** if using `docker-compose` (e.g., `mongodb`).
    - **Production Tip**: Identify your DB host by its container name or IP address in your `.env` file (e.g., `MONGO_URI=mongodb://mongo:27017/flashspace`).

## 3. Volume Persistence
Containers are ephemeral; when they stop, their file system is reset. To keep data (logs, uploads), you must use **Volumes**.

**Example: Persisting Logs and Uploads**
```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/logs:/app/logs \       # Maps host ./logs to container /app/logs
  -v $(pwd)/uploads:/app/uploads \ # Maps host ./uploads to container /app/uploads
  --name flashspace-server \
  flashspace-server
```
Now, even if you delete the container, your logs and user uploads remain on your server in the `logs` and `uploads` directories.

## 4. Debugging Checkpoints
If the app crashes on startup, use these commands to inspect the container:

1.  **View Logs (Stdout/Stderr)**:
    ```bash
    docker logs flashspace-server
    # Or follow live logs:
    docker logs -f flashspace-server
    ```

2.  **Inspect Filesystem (Shell Access)**:
    If the container is running but behaving strangely:
    ```bash
    docker exec -it flashspace-server /bin/sh
    # Check if files exist: ls -la dist/
    ```

3.  **Inspect Crashed Container**:
    If the container acts like it's starting but immediately exits, override the entrypoint to keep it alive for debugging:
    ```bash
    docker run -it --entrypoint /bin/sh flashspace-server
    # Now you are inside. Try running manually: node dist/app.js
    ```

## 5. Constraints & Bottlenecks
Your current structure (`src` -> `dist`) is standard and works well with Docker. However, one potential bottleneck is:

-   **`npm ci` speed**: If you have many dependencies, installing them twice (once in builder, once in runner) can be slow.
    -   **Fix**: The Dockerfile uses **layer caching**. If `package.json` hasn't changed, Docker reuses the previous installation layer instantly. This makes subsequent builds extremely fast.
