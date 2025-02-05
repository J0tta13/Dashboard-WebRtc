import asyncio
import cv2
import socketio
from aiortc import RTCPeerConnection, VideoStreamTrack, RTCSessionDescription, RTCIceCandidate, MediaStreamTrack, RTCConfiguration, RTCIceServer
from av import VideoFrame
import time
from fractions import Fraction
import urllib3
from aiortc.sdp import candidate_from_sdp  

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


sio = socketio.AsyncClient(reconnection_attempts=5)
ROOM_ID = "jetson-room"
pc = None 

class SignalingNamespace(socketio.AsyncClientNamespace):
    def on_connect(self):
        print("✅ Conectado al servidor de señalización (namespace /)")
        
    def on_disconnect(self):
        
        print("ℹ️ Desconexión transitoria (polling) del servidor")

# Registra el namespace y conecta
sio.register_namespace(SignalingNamespace('/'))

class VideoTrack(MediaStreamTrack):
    kind = "video"
    
    def __init__(self):
        super().__init__()
        self.cap = cv2.VideoCapture(0)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set (cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        if not self.cap.isOpened():
            raise RuntimeError("Error al abrir la cámara")
        self._start = time.time()  
        print("🔥 Cámara inicializada correctamente")
    
    async def recv(self):
        loop = asyncio.get_event_loop()
        ret, frame = await loop.run_in_executor(None, self.cap.read)
        
        if not ret:
            print("🚨 Error capturando frame")
            return None
        
        print("📸 Frame capturado correctamente")
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV_I420)
        video_frame = VideoFrame.from_ndarray(frame, format="yuv420p")
        now = time.time()
        video_frame.pts = int((now - self._start) * 90000)
        video_frame.time_base = Fraction(1, 90000)
        return video_frame


@sio.on("answer", namespace='/')
async def on_answer(data):
    print("📥 Respuesta recibida")
    
    if not data.get("sdp") or "m=" not in data["sdp"]:
        print("❗ Respuesta SDP inválida, se ignora.")
        return
    if pc and pc.signalingState == "have-local-offer":
        answer = RTCSessionDescription(
            sdp=data["sdp"],
            type=data["type"]
        )
        try:
            await pc.setRemoteDescription(answer)
        except AttributeError as err:
            if "'NoneType' object has no attribute 'media'" in str(err):
                print("❗ SDP answer inválida, se ignora.")
            else:
                raise
    else:
        print("❗ Estado de señalización no permite establecer respuesta.")

@sio.on("candidate", namespace='/')
async def on_candidate(data):
    print("📡 Candidato recibido:", data)
    candidate = candidate_from_sdp(data["candidate"])
    candidate.sdpMid = data["sdpMid"]
    candidate.sdpMLineIndex = data["sdpMLineIndex"]
    await pc.addIceCandidate(candidate)

def createPeerConnection():
    config = RTCConfiguration(iceServers=[RTCIceServer(urls="stun:stun.l.google.com:19302")])
    pc_new = RTCPeerConnection(configuration=config)
    pc_new.oniceconnectionstatechange = lambda: print("ICE state (jetson):", pc_new.iceConnectionState)
    pc_new.addTrack(VideoTrack())
    return pc_new

async def main():
    global pc
    try:
        await sio.connect("http://192.168.1.67:5000", transports=["websocket"], namespaces=['/'], wait_timeout=3)
        await sio.emit("join", {"room": ROOM_ID}, namespace='/')
        
        pc = createPeerConnection()
        # Crear oferta inicial
        offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await sio.emit("offer", {
            "offer": {
                "sdp": pc.localDescription.sdp,
                "type": pc.localDescription.type
            },
            "room": ROOM_ID,
            "jetson": True
        }, namespace='/')
        
        while True:
            await asyncio.sleep(1)
    finally:
        await sio.disconnect()

@sio.on("renegotiate", namespace='/')
async def on_renegotiate(data):
    global pc
    print("Renegociación solicitada por nuevo cliente.")
    if pc is None or pc.signalingState == "closed":
        print("RTCPeerConnection está cerrado, reinicializando...")
        pc = createPeerConnection()
    else:
        print("Renegociación: reiniciando ICE en conexión existente")
        await pc.restartIce()
    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await sio.emit("offer", {
         "offer": {
           "sdp": pc.localDescription.sdp,
           "type": pc.localDescription.type
         },
         "room": ROOM_ID,
         "jetson": True
    }, namespace='/')


@sio.on("move-camera", namespace='/')
async def on_move_camera(data):
    direction = data.get("direction")
    print(f"🕹 Orden de mover cámara: {direction}")
    
    global pc
    if pc is None or pc.signalingState == "closed":
        print("RTCPeerConnection cerrada, reinicializando...")
        pc = createPeerConnection()
    else:
        print("Reiniciando ICE para movimiento de cámara...")
        await pc.restartIce()
    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await sio.emit("offer", {
         "offer": {
           "sdp": pc.localDescription.sdp,
           "type": pc.localDescription.type
         },
         "room": ROOM_ID,
         "jetson": True
    }, namespace='/')

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🔌 Conexión cerrada")
        sio.disconnect()