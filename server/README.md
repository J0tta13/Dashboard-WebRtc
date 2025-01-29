

# WebRTC Server

This project is a WebRTC server implemented using FastAPI, aiortc, and OpenCV. It allows for real-time video streaming from a webcam to a web client.

## Project Structure

```
Webrtc/
├── server/
│   ├── main.py
│   ├── camara.py
│   ├── requerimiento.txt
│   ├── venv/
│   │   ├── Lib/
│   │   ├── Scripts/
│   │   ├── pyvenv.cfg
│   └── README.md
```

- **main.py**: The main FastAPI application that handles WebRTC signaling and video streaming.
- **camara.py**: A script to obtain the local IP address.
- **requerimiento.txt**: A list of Python dependencies required for the project.
- **venv/**: A virtual environment directory containing all the installed dependencies.

## How It Works

1. **FastAPI Application**: The FastAPI application is defined in `main.py`. It includes endpoints for checking camera availability and handling WebRTC signaling via WebSocket.

2. **WebRTC Signaling**: The WebSocket endpoint (`/ws`) handles WebRTC signaling messages such as offers, answers, and ICE candidates. It uses aiortc to manage peer connections and media tracks.

3. **OpenCV Integration**: The `OpenCVCameraTrack` class captures video frames from the webcam using OpenCV and sends them over the WebRTC connection.

4. **Camera Availability**: The `/api/check-camera` endpoint checks if the webcam is available and returns the status.

5. **Local IP Address**: The `camara.py` script retrieves and prints the local IP address of the machine.

## Setup and Usage

1. **Clone the Repository**:
    ```sh
    git clone <repository-url>
    cd Webrtc/server
    ```

2. **Create a Virtual Environment**:
    ```sh
    python -m venv venv
    ```

3. **Activate the Virtual Environment**:
    - On Windows:
        ```sh
        venv\Scripts\activate
        ```
    - On Unix or MacOS:
        ```sh
        source venv/bin/activate
        ```

4. **Install Dependencies**:
    ```sh
    pip install -r requerimiento.txt
    ```

5. **Run the Server**:
    ```sh
    python main.py
    ```
    **or**:
    ```sh
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```


6. **Access the Application**:
    Open your web browser and navigate to `https://<your-ip>:8000`.

## Notes

- Ensure you have a valid SSL certificate (`key.pem` and `cert.pem`) in the server directory for HTTPS.
- Modify the `uvicorn.run` parameters in `main.py` if you need to change the host or port.

## License

This project is licensed under the MIT License.