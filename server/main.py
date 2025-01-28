# main.py
import uvicorn
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from aiortc import RTCPeerConnection, MediaStreamTrack, RTCSessionDescription, RTCIceCandidate
from aiortc.contrib.media import MediaPlayer
from av import VideoFrame
import cv2
import json
import logging
import os

app = FastAPI()

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

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        
        ret, frame = self.cap.read()
        if not ret:
            raise RuntimeError("Error al capturar el frame")
            
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        video_frame = VideoFrame.from_ndarray(frame, format="rgb24")
        video_frame.pts = pts
        video_frame.time_base = time_base
        return video_frame

# WebSocket para señalización WebRTC
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    pc = RTCPeerConnection()
    
    try:
        # Añadir track de video
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
                    await pc.addIceCandidate(
                        RTCIceCandidate(
                            candidate=message["candidate"]["candidate"],
                            sdpMid=message["candidate"]["sdpMid"],
                            sdpMLineIndex=message["candidate"]["sdpMLineIndex"]
                        )
                    )

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
        reload=True,
        ssl_keyfile="./key.pem",
        ssl_certfile="./cert.pem"
    )