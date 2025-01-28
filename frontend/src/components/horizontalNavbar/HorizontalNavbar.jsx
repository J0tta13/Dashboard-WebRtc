import React from 'react';
import { FaBars } from 'react-icons/fa';

const HorizontalNavbar = ({ onToggle }) => {
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
        <nav className="h-20 w-full bg-white rounded-4xl text-black/40 p-4">
            <div className="container mx-auto flex justify-between items-center">
                {/* Botón de tres rayas (FaBars) */}
                <button
                    onClick={onToggle}
                    className="bg-blue-950 text-white p-2 rounded-full hover:bg-blue-800 transition duration-300"
                >
                    <FaBars className="text-xl" />
                </button>

                {/* Enlaces */}
                <ul className="flex space-x-4">
                    <li><a href="#dashboard" className={hoverClasses}>Dashboard</a></li>
                    <li><a href="#users" className={hoverClasses}>Users</a></li>
                    <li><a href="#settings" className={hoverClasses}>Settings</a></li>
                </ul>
            </div>
        </nav>
    );
};

export default HorizontalNavbar;