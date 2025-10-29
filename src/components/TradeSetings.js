import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import "./styles/settings.css";

// Styles object for number input customization
const inputStyles = {
    WebkitAppearance: 'none',
    MozAppearance: 'textfield',
    margin: 0
};

const TradeSettings = ({ 
    isOpen, 
    onClose, 
    onSettingsChange,
    setSettings,
    settings
}) => {
    if (!isOpen) return null;

    const handleSettingChange = (field, value) => {
        // Allow empty string to handle backspace and show 0
        if (value === '') {
            value = '0';
        }
        
        // Convert to number for validation
        const numValue = parseFloat(value);
        
        // Check if the value is a valid number
        if (!isNaN(numValue)) {
            const newSettings = {
                ...settings,
                [field]: value // Keep as string to preserve leading zeros
            };
            
            setSettings(newSettings);
            onSettingsChange?.(newSettings);
        }
    };

    return (
        <div className="fixed inset-0 backdrop-blur-xl bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#141414] w-[380px] rounded-2xl p-4 text-white">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-medium">Settings</span>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <div className="h-[1px] w-full bg-[#FFFFFF]/15 rounded-sm mb-4"></div>

                {/* Priority Fee */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[#00ff88]">⛽</span>
                            <span className="text-sm font-medium">PRIORITY FEE</span>
                        </div>
                        <span className="text-xs text-gray-400">prio +0.002</span>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={settings.priorityFee}
                            onChange={(e) => handleSettingChange('priorityFee', e.target.value)}
                            className="w-full bg-[#343735] rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#00ff88]"
                            style={inputStyles}
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                            ≡
                        </button>
                    </div>
                </div>

                {/* Slippage Limit */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[#00ff88]">↕️</span>
                        <span className="text-sm font-medium">SLIPPAGE LIMIT</span>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={settings.slippage}
                            onChange={(e) => handleSettingChange('slippage', e.target.value)}
                            className="w-full bg-[#343735] rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#00ff88]"
                            placeholder="MAX %"
                            style={inputStyles}
                        />
                    </div>
                </div>

                {/* Bribe */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[#00ff88]">💰</span>
                            <span className="text-sm font-medium">BRIBE</span>
                        </div>
                        <span className="text-xs text-gray-400">Optional</span>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={settings.bribe}
                            onChange={(e) => handleSettingChange('bribe', e.target.value)}
                            className="w-full bg-[#343735] rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-[#00ff88]"
                            style={inputStyles}
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                            ≡
                        </button>
                    </div>
                </div>

                {/* Done Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 rounded-lg bg-[#00ff88] text-black font-bold hover:bg-[#00ee77] transition-colors"
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export default TradeSettings;