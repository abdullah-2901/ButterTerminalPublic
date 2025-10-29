import React, { useContext } from 'react';
import { Loader2, X } from 'lucide-react';
import ButterTerminalContext from './ButterTerminalContext';

const NewButterWalletPopup = ({ isOpen, onClose }) => {
    const { butterWalletCredentials } = useContext(ButterTerminalContext);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-[450px] h-[300px] bg-white rounded-xl p-6 shadow-lg">
                <button 
                    onClick={onClose}
                    className="absolute top-2 right-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                {!butterWalletCredentials ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <Loader2 className="w-12 h-12 animate-spin text-gray-600" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-6 w-full">
                        <div className='w-full'>
                            <p className="text-sm text-center font-medium text-gray-700 mb-2">
                                Butter Wallet Public Key
                            </p>
                            <div className="bg-gray-100 p-3 rounded-lg break-all text-sm text-gray-800">
                                {butterWalletCredentials?.publickey}
                            </div>
                        </div>
                        <div className='w-full'>
                            <p className="text-sm text-center font-medium text-gray-700 mb-2">
                                Butter Wallet Secret Key
                            </p>
                            <div className="bg-gray-100 p-3 rounded-lg break-all text-sm text-gray-800 blur-sm hover:blur-none">
                                {butterWalletCredentials?.secretkey}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewButterWalletPopup;