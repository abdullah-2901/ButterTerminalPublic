import React from 'react';

const TradeDropdown = () => {
    return (
        <ul className='w-24 border rounded absolute top-full mt-1 bg-white shadow-lg z-50'>
            <li className='px-3 py-2 hover:bg-gray-100 cursor-pointer'>
                Buy
            </li>
            <li className='px-3 py-2 hover:bg-gray-100 cursor-pointer border-t'>
                Sell
            </li>
        </ul>
    );
};

export default TradeDropdown;