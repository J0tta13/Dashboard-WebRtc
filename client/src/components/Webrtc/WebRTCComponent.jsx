import React, { useRef, useState, useEffect } from "react";
import { FaLongArrowAltLeft } from "react-icons/fa";
import { FaLongArrowAltRight } from "react-icons/fa";
import { FaLongArrowAltUp } from "react-icons/fa";
import { FaLongArrowAltDown } from "react-icons/fa";


import io from "socket.io-client";

// Change from HTTPS to HTTP if using a self-signed cert or for development
const socket = io("http://172.16.13.110:5000", { transports: ["websocket"] });

const WebRTCComponent = () => {
  const [isConnected, setIsConnected] = useState(false);
  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const ROOM_ID = "jetson-room";

  // Función para enviar órdenes de movimiento de cámara
  const handleMove = (direction) => {
    socket.emit("move-camera", { direction, room: ROOM_ID });
  };

  // Nueva función para zoom
  const handleZoom = (direction) => {
    socket.emit("zoom", { direction, room: ROOM_ID });
  };

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
      
      <div className="flex flex-col sm:relative mb-4">
        {/* Contenedor para cámara */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full sm:w-[640px] h-auto sm:h-[480px] border-2 border-gray-300 rounded-lg"
          onCanPlay={() => console.log("🚀 Video listo para reproducir")}
          onError={(e) => console.error("🔥 Error de video:", e.target.error)}
        />
        {/* Botones de zoom para escritorio, visibles solo en sm+ */}
        <div className="hidden sm:absolute sm:top-1/2 sm:right-[-80px] sm:-translate-y-1/2 sm:flex flex-col space-y-2">
          <button onClick={() => handleZoom("in")} className="p-1 sm:p-3 bg-green-600 text-white rounded-lg text-xl sm:text-2xl font-bold hover:bg-green-700 hover:scale-105 transition-all">
            Z+
          </button>
          <button onClick={() => handleZoom("out")} className="p-1 sm:p-3 bg-green-600 text-white rounded-lg text-xl sm:text-2xl font-bold hover:bg-green-700 hover:scale-105 transition-all">
            Z-
          </button>
        </div>
      </div>
      
      {/* Controles versión mobile centrados */}
      <div className="sm:hidden flex justify-center items-center">
        <div className="grid grid-cols-5 gap-2">
          {/* 1. Flecha arriba */}
          <button onClick={() => handleMove("up")} className="bg-green-600 text-white rounded-lg text-xl px-3 py-1 transition-transform duration-200 ease-in-out hover:bg-green-700 hover:scale-110">
            <FaLongArrowAltUp />
          </button>
          {/* 2. Flecha izquierda */}
          <button onClick={() => handleMove("left")} className="bg-green-600 text-white rounded-lg text-xl px-3 py-1 transition-transform duration-200 ease-in-out hover:bg-green-700 hover:scale-110">
            <FaLongArrowAltLeft />
          </button>
          {/* 3. Flecha abajo */}
          <button onClick={() => handleMove("down")} className="bg-green-600 text-white rounded-lg text-xl px-3 py-1 transition-transform duration-200 ease-in-out hover:bg-green-700 hover:scale-110">
            <FaLongArrowAltDown />
          </button>
          {/* 4. Flecha derecha */}
          <button onClick={() => handleMove("right")} className="bg-green-600 text-white rounded-lg text-xl px-3 py-1 transition-transform duration-200 ease-in-out hover:bg-green-700 hover:scale-110">
            <FaLongArrowAltRight />
          </button>
          {/* 5. Botón Z+ */}
          <button onClick={() => handleZoom("in")} className="bg-green-600 text-white rounded-lg text-xl px-3 py-1 transition-transform duration-200 ease-in-out hover:bg-green-700 hover:scale-110">
            Z+
          </button>
          {/* 7. Botón conectar: ocupa columnas 1 a 4 */}
         
          {!isConnected ? (
              <button onClick={connect} className="col-span-4 px-3 py-1 bg-blue-600 text-white rounded-lg transition-transform duration-200 ease-in-out hover:bg-blue-700 hover:scale-110">Conectar</button>
            ) : (
              <button onClick={disconnect} className="col-span-4 px-3 py-1 bg-red-600 text-white rounded-lg transition-transform duration-200 ease-in-out hover:bg-red-700 hover:scale-110">Desconectar</button>
          )}
          

          {/* 8. Botón Z-: se ubica en la columna 5 */}
          <button onClick={() => handleZoom("out")} className="col-start-5 bg-green-600 text-white rounded-lg text-xl px-3 py-1 transition-transform duration-200 ease-in-out hover:bg-green-700 hover:scale-110">
            Z-
          </button>
        </div>
      </div>
      
     
      
      {/* Botones de movimiento para desktop */}
      <div className="hidden sm:flex space-x-2">
        <button 
          onClick={() => handleMove("up")} 
          className="p-2 sm:p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:scale-105 transition-transform duration-200 ease-in-out"
        >
          <FaLongArrowAltUp className="text-2xl sm:text-3xl font-bold stroke-[20px] sm:stroke-[30px]" />
        </button>
        <button 
          onClick={() => handleMove("down")} 
          className="p-2 sm:p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:scale-105 transition-transform duration-200 ease-in-out"
        >
          <FaLongArrowAltDown className="text-2xl sm:text-3xl font-bold stroke-[20px] sm:stroke-[30px]" />
        </button>
        <button 
          onClick={() => handleMove("left")} 
          className="p-2 sm:p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:scale-105 transition-transform duration-200 ease-in-out"
        >
          <FaLongArrowAltLeft className="text-2xl sm:text-3xl font-bold stroke-[20px] sm:stroke-[30px]" />
        </button>
        <button 
          onClick={() => handleMove("right")} 
          className="p-2 sm:p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:scale-105 transition-transform duration-200 ease-in-out"
        >
          <FaLongArrowAltRight className="text-2xl sm:text-3xl font-bold stroke-[15px] sm:stroke-[20px]" />
        </button>
      </div>

      {/* Ocultar en mobile: usar "hidden sm:flex" para mostrar solo en pantallas sm+ */}
      <div className="hidden sm:flex space-x-4 mb-4 mt-4 ">
        {!isConnected ? (
          <button onClick={connect} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 hover:scale-105 transition-transform duration-200 ease-in-out">
            Conectar
          </button>
        ) : (
          <button onClick={disconnect} className="px-4 py-2 bg-red-600 text-white font-bold  rounded-lg hover:bg-red-700 hover:scale-105 transition-transform duration-200 ease-in-out">
            Desconectar
          </button>
        )}
      </div>

    </div>
  );
};

export default WebRTCComponent;