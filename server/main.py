import uvicorn
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from aiortc import RTCPeerConnection, MediaStreamTrack, RTCSessionDescription, RTCIceCandidate
from aiortc.contrib.media import MediaPlayer
from av import VideoFrame
from fractions import Fraction
import cv2
import json
import logging
import os
import time

app = FastAPI()
logging.basicConfig(level=logging.DEBUG)
# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Verificar disponibilidad de cámara
@app.get("/api/check-camera")
async def check_camera():
    try:
        cap = cv2.VideoCapture(0)
        available = cap.isOpened()
        cap.release()
        return {"available": available}
    except Exception as e:
        return {"available": False}

# Clase para capturar video desde OpenCV
class OpenCVCameraTrack(MediaStreamTrack):
    kind = "video"

    def __init__(self):
        super().__init__()
        self.cap = cv2.VideoCapture(0)
        if not self.cap.isOpened():
            raise RuntimeError("No se pudo abrir la cámara")
        self.start_time = time.time()
        self.frame_count = 0

    async def recv(self):
        # Generar una marca de tiempo válida
        self.frame_count += 1
        pts = int((time.time() - self.start_time) * 90000)  # 90 kHz clock
       
        time_base = Fraction(1, 90000)
  # WebRTC usa una base de 90 kHz

        # Capturar frame de la cámara
        ret, frame = self.cap.read()
        if not ret:
            raise RuntimeError("Error al capturar el frame")

        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        video_frame = VideoFrame.from_ndarray(frame, format="yuv420p")
        video_frame.pts = pts
        video_frame.time_base = time_base
        return video_frame

# main.py (updated section)
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    pc = RTCPeerConnection()
    
    try:
        # Add video track
        camera_track = OpenCVCameraTrack()
        pc.addTrack(camera_track)

        async def consume_signaling():
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message["type"] == "offer":
                    await pc.setRemoteDescription(
                        RTCSessionDescription(
                            sdp=message["sdp"],
                            type=message["type"]
                        )
                    )
                    
                    answer = await pc.createAnswer()
                    await pc.setLocalDescription(answer)
                    
                    await websocket.send_text(json.dumps({
                        "type": "answer",
                        "sdp": pc.localDescription.sdp
                    }))
                    
                elif message["type"] == "candidate":
                    candidate_data = message["candidate"]
                    candidate = RTCIceCandidate(
                        candidate=candidate_data.get("candidate", ""),
                        sdpMid=candidate_data.get("sdpMid", None),  # Permite None
                        sdpMLineIndex=candidate_data.get("sdpMLineIndex", 0)
                    )
                    await pc.addIceCandidate(candidate)
                    logging.debug(f"Added ICE candidate: {candidate}")

        # Rest of the code remains unchanged

        @pc.on("ice_candidate")
        async def on_ice_candidate(candidate):
            await websocket.send_text(json.dumps({
                "type": "candidate",
                "candidate": {
                    "candidate": candidate.candidate,
                    "sdpMid": candidate.sdpMid,
                    "sdpMLineIndex": candidate.sdpMLineIndex
                }
            }))

        await consume_signaling()

    except Exception as e:
        logging.error(f"Error: {str(e)}")
    finally:
        await pc.close()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
    )