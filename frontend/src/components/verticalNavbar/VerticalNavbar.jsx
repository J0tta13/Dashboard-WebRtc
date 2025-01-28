import React from 'react';
import { HiMiniArrowUturnLeft } from "react-icons/hi2";


const VerticalNavbar = ({ isVisible, onClose }) => {
    if (!isVisible) return null; // Si no es visible, no renderiza nada

    const hoverClasses = [
        'hover:text-white',
        'hover:bg-blue-800',
        'hover:shadow-lg',
        'transition duration-300',
        'rounded',
        'p-2',
        'block',
    ].join(' ');

    return (
        <nav className="flex flex-col h-screen bg-blue-950 text-white/40 p-4 md:w-64 sm:w-48">
            {/* Contenedor del título "Larva" */}
            <div className="w-full flex justify-center items-center p-4">
                <h2 className="text-2xl text-white font-extrabold">Larva</h2>
            </div>

            {/* Lista de enlaces */}
            <ul className="space-y-4 text-center mt-4">
                <li><a href="#inicio" className={hoverClasses}>Inicio</a></li>
                <li><a href="#nosotros" className={hoverClasses}>Nosotros</a></li>
                <li><a href="#servicios" className={hoverClasses}>Servicios</a></li>
                <li><a href="#contacto" className={hoverClasses}>Contacto</a></li>
            </ul>

            {/* Botón de cerrar (FaTimes) */}
            <button
                onClick={onClose}
                className="fixed bottom-4 left-4 bg-blue-950 text-white p-2 rounded-full hover:bg-blue-800 transition duration-300"
            >
                <HiMiniArrowUturnLeft className="text-xl"/>
            </button>
        </nav>
    );
};

export default VerticalNavbar;