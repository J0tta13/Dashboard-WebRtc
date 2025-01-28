import React, { useState } from "react";
import AppLayout from './components/AppLayout';
import WebRTCStream from './components/WebRTCStream/WebRTCStream';
import HorizontalNavbar from './components/horizontalNavbar/HorizontalNavbar';

import VideoStream from "./components/VideoStream/VideoStream";

function App() {
    const [isNavbarVisible, setIsNavbarVisible] = useState(true);

    const handleToggleNavbar = () => {
        setIsNavbarVisible(!isNavbarVisible);
    };

    return (
        <AppLayout 
            isNavbarVisible={isNavbarVisible} 
            onToggleNavbar={handleToggleNavbar}
        >
            {/* Navbar horizontal (fijo en la parte superior) */}
            <HorizontalNavbar onToggle={handleToggleNavbar} />
            
            {/* Contenedor principal del contenido */}
            <div className="main-content">
                {/* Componente de transmisión WebRTC  <VideoStream />*/}
                
                <VideoStream />
               
                
            </div>
        </AppLayout>
    );
}

export default App;