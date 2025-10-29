// WebSocketStatus.js
import React from 'react';

const WebSocketStatus = ({ isConnected, error }) => (
    <div className="flex items-center gap-2 ml-4">
        <div 
            className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-yellow-500'
            }`} 
        />
        <span className={`text-sm ${
            isConnected ? 'text-green-500' : error ? 'text-red-500' : 'text-yellow-500'
        }`}>
            {isConnected ? 'Live' : error ? 'Error' : 'Connecting...'}
        </span>
    </div>
);

export default WebSocketStatus;