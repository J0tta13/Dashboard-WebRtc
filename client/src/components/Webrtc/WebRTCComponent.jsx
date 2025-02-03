import React, { useRef, useState, useEffect } from "react";
import io from "socket.io-client";

// Change from HTTPS to HTTP if using a self-signed cert or for development
const socket = io("http://192.168.1.4:5000", { transports: ["websocket"] });

const WebRTCComponent = () => {
  const [isConnected, setIsConnected] = useState(false);
  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const ROOM_ID = "jetson-room";

  const initPeerConnection = () => {
    let candidateQueue = [];
    peerRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "turn:your-turn-server.com", username: "user", credential: "password" }
      ],
      sdpSemantics: "unified-plan",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });

    // Agrega logging del estado ICE
    peerRef.current.oniceconnectionstatechange = () =>
      console.log("ICE state (client):", peerRef.current.iceConnectionState);

    peerRef.current.addTransceiver("video", { direction: "recvonly" });

    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", { candidate: event.candidate, room: ROOM_ID });
      }
    };

    // Receptor: Escuchar streams entrantes
    peerRef.current.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        // Solo asignar si aún no se ha asignado el stream
        if (videoRef.current.srcObject !== event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(err =>
              console.error("🚀 Video play() error:", err)
            );
          };
        }
      }
    };

    // Escuchar oferta del servidor
    socket.on("offer", async (offer) => {
      try {
        // Evitar procesar ofertas duplicadas
        if (
          peerRef.current.remoteDescription &&
          peerRef.current.remoteDescription.sdp === offer.sdp
        ) {
          console.log("❗ Oferta duplicada recibida; se ignora.");
          return;
        }
        // Si el estado no es "stable", reinicializar para evitar errores de negociación
        if (peerRef.current.signalingState !== "stable") {
          console.log("Signaling state not stable. Reinitializing connection.");
          peerRef.current.close();
          initPeerConnection();
        }
        await peerRef.current.setRemoteDescription(offer);
        while (candidateQueue.length > 0) {
          const pendingCandidate = candidateQueue.shift();
          await peerRef.current.addIceCandidate(new RTCIceCandidate(pendingCandidate));
        }
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        // Enviar un objeto simple en lugar del objeto RTCSessionDescription directamente
        socket.emit("answer", { answer: { sdp: answer.sdp, type: answer.type }, room: ROOM_ID });
      } catch (err) {
        console.error("Error al manejar oferta:", err);
      }
    });

    socket.on("candidate", (candidate) => {
      if (peerRef.current) {
        if (peerRef.current.remoteDescription) {
          peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          candidateQueue.push(candidate);
        }
      }
    });
  };

  const connect = () => {
    if (!isConnected) {
      initPeerConnection();

      socket.emit("join", { room: ROOM_ID });
      setIsConnected(true);
    }
  };

  const disconnect = () => {
    // Notify server to leave the room
    socket.emit("leave", { room: ROOM_ID });
    
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setIsConnected(false);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    // Eliminar listeners para evitar ofertas duplicadas al reconectar
    socket.off("offer");
    socket.off("candidate");
  };

  useEffect(() => {
    return () => {
      disconnect();
      socket.off("offer");
      socket.off("candidate");
    };
  }, []);

  return (
    <div className=" bg-white flex flex-col items-center justify-center p-4 m-4 rounded-lg shadow-lg">
      <h1 className="text-3xl font-semibold text-center text-blue-600 mb-4"> Jetson Video Stream </h1>
      <div className="flex justify-center mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-[640px] h-[480px] border-2 border-gray-300 rounded-lg"
          onCanPlay={() => console.log("🚀 Video listo para reproducir")}
          onError={(e) => console.error("🔥 Error de video:", e.target.error)}
        />
      </div>
      <div className="flex space-x-4">
        {!isConnected ? (
          <button onClick={connect} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Conectar</button>
        ) : (
          <button onClick={disconnect} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Desconectar</button>
        )}
      </div>
    </div>
  );
};

export default WebRTCComponent;