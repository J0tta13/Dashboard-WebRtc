# WebRTC Client

This project is a WebRTC client application built with Vite and React. It allows real-time communication between peers using WebRTC technology.

## Project Structure

```
client/
├── node_modules/        # Node.js modules
├── public/              # Public assets
├── src/                 # Source code
│   ├── components/      # React components
│   ├── styles/          # CSS styles
│   ├── App.jsx          # Main App component
│   ├── main.jsx         # Entry point
│   └── ...              # Other source files
├── .gitignore           # Git ignore file
├── eslint.config.js     # ESLint configuration
├── index.html           # HTML template
├── package.json         # NPM package configuration
├── README.md            # Project documentation
└── vite.config.js       # Vite configuration
```

## How It Works

The WebRTC client application establishes a peer-to-peer connection using WebRTC APIs. It allows users to communicate in real-time through video and audio streams.

### Key Features

- Real-time video
- Peer-to-peer connection using WebRTC
- React-based user interface

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- NPM (version 6 or higher)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/webrtc-client.git
   cd webrtc-client/client
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

### Running the Application

To start the development server, run:

```bash
npm run dev
```

This will start the Vite development server and open the application in your default web browser.

## Notes
Asegúrate de actualizar la dirección IP con la correspondiente a tu red local en el componente VideoStream para garantizar que la conexión funcione correctamente.

## Connecting to the Server

The WebRTC client connects to a signaling server to establish peer-to-peer connections. Ensure that the signaling server is running and accessible.

### Configuration

Update the signaling server URL in the source code if necessary. The default configuration assumes the signaling server is running locally.

## License

This project is licensed under the MIT License.
