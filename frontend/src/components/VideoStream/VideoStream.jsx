import React, { useRef, useEffect, useState } from 'react';

const VideoStream = () => {
    const videoRef = useRef(null);
    const [cameraAvailable, setCameraAvailable] = useState(false);
    const [status, setStatus] = useState('Verificando cámara...');
    const pc = useRef(null);
    const ws = useRef(null);

    // Verificar disponibilidad de cámara
    useEffect(() => {
        const checkCamera = async () => {
            try {
                const response = await fetch('http://192.168.1.4:8000/api/check-camera');
                const data = await response.json();
                setCameraAvailable(data.available);
                setStatus(data.available ? 'Cámara detectada' : 'Cámara no disponible');
                
                if (data.available) {
                    setupWebRTC();
                }
            } catch (error) {
                console.error('Error al verificar la cámara:', error);
                setStatus('Error al verificar la cámara');
            }
        };

        checkCamera();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    // Configurar WebRTC
    const setupWebRTC = async () => {
        try {
            pc.current = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                ]
            });

            ws.current = new WebSocket(`ws://192.168.1.4:8000/ws`);

            ws.current.onopen = async () => {
                console.log('WebSocket abierto');
                setStatus('Conexión WebSocket abierta');

                pc.current.ontrack = (event) => {
                    console.log('Stream recibido:', event.streams[0]);
                    if (videoRef.current && !videoRef.current.srcObject) {
                        videoRef.current.srcObject = event.streams[0];
                    }
                };

                pc.current.onicecandidate = (event) => {
                    if (event.candidate) {
                        const candidate = {
                            candidate: event.candidate.candidate || "",
                            sdpMid: event.candidate.sdpMid || null,
                            sdpMLineIndex: event.candidate.sdpMLineIndex ?? 0
                        };

                        console.log('Enviando candidato ICE:', candidate);
                        if (ws.current.readyState === WebSocket.OPEN) {
                            ws.current.send(JSON.stringify({
                                type: 'candidate',
                                candidate: candidate
                            }));
                        }
                    }
                };

                const offer = await pc.current.createOffer();
                await pc.current.setLocalDescription(offer);

                if (!offer || !offer.sdp) {
                    console.error("Oferta SDP mal formada o nula.");
                    return;
                }

                ws.current.send(JSON.stringify({
                    type: 'offer',
                    sdp: offer.sdp
                }));
            };

            ws.current.onmessage = async (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('Mensaje recibido:', message);

                    if (message.type === 'answer') {
                        await pc.current.setRemoteDescription(
                            new RTCSessionDescription({
                                sdp: message.sdp,
                                type: 'answer'
                            })
                        );
                    } else if (message.type === 'candidate') {
                        if (message.candidate && message.candidate.candidate) {
                            try {
                                await pc.current.addIceCandidate(new RTCIceCandidate(message.candidate));
                            } catch (error) {
                                console.error('Error al agregar candidato ICE:', error);
                            }
                        } else {
                            console.error('Candidato ICE mal formado:', message.candidate);
                        }
                    }
                } catch (error) {
                    console.error('Error al procesar mensaje:', error);
                }
            };

            ws.current.onerror = (error) => {
                console.error('Error en WebSocket:', error);
                setStatus('Error en la conexión WebSocket');
            };

            ws.current.onclose = () => {
                setStatus('Conexión WebSocket cerrada');
            };

        } catch (error) {
            console.error('Error en WebRTC:', error);
            setStatus('Error en la conexión WebRTC');
        }
    };

    // Limpiar recursos
    useEffect(() => {
        return () => {
            if (pc.current) {
                pc.current.onicecandidate = null;
                pc.current.close();
            }
            if (ws.current) {
                ws.current.onopen = null;
                ws.current.onmessage = null;
                ws.current.onerror = null;
                ws.current.onclose = null;
                ws.current.close();
                ws.current = null;
            }

            console.log("Recursos limpiados correctamente en el cliente");
        };
    }, []);

    return (
        <div className="video-stream">
            <h1>Video Stream</h1>
            <p>{status}</p>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                controls={false}
                style={{ width: '640px', height: '480px', border: '1px solid black' }}
            ></video>
        </div>
    );
};

export default VideoStream;