import React from 'react';

const Spinner = ({ size = 'default', message = 'Loading...' }) => {
    const sizeClasses = {
        small: 'h-4 w-4',
        default: 'h-8 w-8',
        large: 'h-12 w-12'
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className={`animate-spin rounded-full border-4 border-blue-100 border-t-blue-500 ${sizeClasses[size]}`} />
            {message && <p className="mt-2 text-gray-600 text-sm">{message}</p>}
        </div>
    );
};

export default Spinner;