import React, { useEffect, useRef, useState } from "react";

const WebRTCStream = () => {
    const remoteVideoRef = useRef(null);
    const localVideoRef = useRef(null);
    const peerConnection = useRef(null);
    const webSocket = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState("");

    // Dirección IP de tu servidor (reemplaza con la IP local de tu PC)
    //const SERVER_IP = "ws://192.168.0.10:8000/ws"; // Reemplaza con tu IP local
    const SERVER_IP = "ws://192.168.1.58:8000/ws"; // Reemplaza con tu IP local
    
    

    useEffect(() => {
        // Obtener dispositivos de video disponibles
        const getDevices = async () => {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === "videoinput");
            setDevices(videoDevices);
            if (videoDevices.length > 0) {
                setSelectedDeviceId(videoDevices[0].deviceId);
            }
        };

        getDevices();
    }, []);

    const startWebRTC = async () => {
        // Configuración de WebRTC y WebSocket
        webSocket.current = new WebSocket(SERVER_IP);

        webSocket.current.onopen = () => {
            console.log("Conexión WebSocket establecida");
            setIsConnected(true);
        };

        webSocket.current.onmessage = async (message) => {
            const data = JSON.parse(message.data);

            if (data.type === "offer") {
                // Recibir una oferta y responder con una respuesta
                await peerConnection.current.setRemoteDescription(
                    new RTCSessionDescription(data.offer)
                );
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                webSocket.current.send(
                    JSON.stringify({ type: "answer", answer })
                );
            } else if (data.type === "answer") {
                // Recibir una respuesta
                await peerConnection.current.setRemoteDescription(
                    new RTCSessionDescription(data.answer)
                );
            } else if (data.type === "candidate") {
                try {
                    // Agregar candidato ICE
                    await peerConnection.current.addIceCandidate(
                        new RTCIceCandidate(data.candidate)
                    );
                } catch (error) {
                    console.error("Error adding ICE candidate", error);
                }
            }
        };

        // Crear la conexión peer
        peerConnection.current = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        // Manejo del flujo remoto
        peerConnection.current.ontrack = (event) => {
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        // Obtener flujo de la cámara local
        const localStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: selectedDeviceId },
            audio: false, // Puedes cambiar esto si también necesitas audio
        });
        localVideoRef.current.srcObject = localStream;

        // Agregar las pistas del flujo local a la conexión peer
        localStream.getTracks().forEach((track) => {
            peerConnection.current.addTrack(track, localStream);
        });

        // Enviar la oferta de conexión
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        webSocket.current.send(
            JSON.stringify({ type: "offer", offer })
        );
    };

    const stopWebRTC = () => {
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        if (webSocket.current) {
            webSocket.current.close();
            webSocket.current = null;
        }
        if (localVideoRef.current && localVideoRef.current.srcObject) {
            localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
        setIsConnected(false);
    };

    return (
        <div className="text-center p-4">
            <h1 className="text-3xl font-bold mb-6">WebRTC Streaming</h1>
            <div className="flex flex-col items-center justify-center">
                {/* Selección de dispositivos */}
                <div className="mb-4">
                    <label htmlFor="videoSource" className="block mb-2">Selecciona una cámara:</label>
                    <select
                        id="videoSource"
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="p-2 border rounded"
                    >
                        {devices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Cámara ${device.deviceId}`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Botones para conectar y desconectar */}
                <div className="mb-4">
                    <button
                        onClick={startWebRTC}
                        className="mr-2 p-2 bg-blue-500 text-white rounded"
                    >
                        Conectar
                    </button>
                    <button
                        onClick={stopWebRTC}
                        className="p-2 bg-red-500 text-white rounded"
                    >
                        Desconectar
                    </button>
                </div>

                {/* Contenedor de videos */}
                <div className="w-full max-w-4xl flex flex-col md:flex-row gap-1">
                    {/* Video local */}
                    <div className="flex-1 bg-gray-200 rounded-3xl overflow-hidden shadow-lg">
                        <video
                            className="w-full h-auto"
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                        />
                    </div>
                    {/* Video remoto */}
                    <div className="flex-1 bg-gray-200 rounded-3xl overflow-hidden shadow-lg">
                        <video
                            className="w-full h-auto"
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                        />
                    </div>
                </div>

                {/* Mensaje de conexión */}
                {!isConnected && (
                    <p className="mt-4 text-gray-600">Conectando...</p>
                )}
            </div>
        </div>
    );
};

export default WebRTCStream;