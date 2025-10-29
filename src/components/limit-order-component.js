import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCog, faEquals } from '@fortawesome/free-solid-svg-icons';

const LimitOrder = ({ 
    isOpen, 
    onClose, 
    tokenSymbol,
    tokenIcon,
    type = 'buy',
    solIcon,
    setIsSettingsOpen,
    setShowBuySellPopup,
    setIsLimitMode,
    currentType,
}) => {
    const [amount, setAmount] = useState('0.02');
    const [marketContract, setMarketContract] = useState('80947.14446339059');
    const [percentage, setPercentage] = useState(0);

    if (!isOpen) return null;

    const presetAmounts = [
        { label: '0.01', value: '0.01' },
        { label: '0.02', value: '0.02' },
        { label: '0.5', value: '0.5' },
        { label: '1', value: '1' }
    ];
    const handleSettingsClick = () => {
        setIsSettingsOpen(true);
        document.body.classList.add('settings-open');
    };

    return (
        <div className="fixed inset-0 backdrop-blur-xl bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#141414] w-[380px] rounded-2xl p-4 text-white">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <div className="market__limit__main__button">
                        <button 
                            onClick={() => {
                                onClose();
                                setShowBuySellPopup(true);
                                setIsLimitMode(false);
                            }}
                            className="text-gray-400 text-sm font-medium"
                        >
                            Market
                        </button>
                        <button className={`text-white border-b-2 ${currentType === 'sell' ? 'border-[#ff3b3b]' : 'border-[#00ff88]'} px-3 py-1.5 text-sm font-medium`}>
                            Limit
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div 
                            onClick={handleSettingsClick}
                            className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-black/80"
                        >
                            <FontAwesomeIcon icon={faCog} className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">0.5%</span>
                        </div>
                    </div>
                </div>

                {/* Amount Input */}
                <div className="bg-[#343735] rounded-lg p-4 pb-1 mb-4">
                    <div className="flex justify-between items-center text-gray-400 mb-2">
                        <span>AMOUNT</span>
                        <FontAwesomeIcon icon={faEquals} className="text-lg" />
                    </div>
                    <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-transparent text-right text-xl font-bold focus:outline-none text-yellow-400"
                        placeholder="0.0"
                    />
                </div>

                {/* Preset Amounts */}
                <div className="w-2/3 flex justify-between gap-2 mb-4 ml-auto">
                    {presetAmounts.map((preset) => (
                        <button
                            key={preset.value}
                            onClick={() => setAmount(preset.value)}
                            className={`flex-1 py-2 rounded-[25px] text-sm transition-colors duration-200 flex items-center justify-center gap-1 ${
                                amount === preset.value 
                                    ? currentType === 'sell' 
                                        ? 'bg-[#ff3b3b] text-white'
                                        : 'bg-[#00ff88] text-white'
                                    : 'bg-[#343735] text-gray-400'
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {/* Market Contract */}
                <div className="bg-[#343735] rounded-lg p-4 pb-1 mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">MC</span>
                            <button className={currentType === 'sell' ? 'text-[#ff3b3b]' : 'text-[#00ff88]'}>↻</button>
                        </div>
                        <span className="text-gray-400">$</span>
                    </div>
                    <input
                        type="text"
                        value={marketContract}
                        onChange={(e) => setMarketContract(e.target.value)}
                        className="w-full bg-transparent text-right text-xl font-bold focus:outline-none text-yellow-400"
                    />
                </div>

                {/* Percentage Slider */}
                <div className="bg-[#343735] rounded-lg p-4 mb-6">
                    <div className="flex justify-between text-gray-400 text-sm mb-2">
                        <span>-100%</span>
                        <span>-50%</span>
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                    </div>
                    <div className="relative">
                        <input
                            type="range"
                            min="-100"
                            max="100"
                            value={percentage}
                            onChange={(e) => setPercentage(e.target.value)}
                            className="w-full"
                            style={{ 
                                accentColor: currentType === 'sell' ? '#ff3b3b' : '#00ff88'
                            }}
                        />
                        <div className="absolute right-0 -top-8 bg-[#1a1a1a] px-2 py-1 rounded text-yellow-400">
                            {percentage}%
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <button 
                    className={`w-full py-3.5 rounded-lg font-bold text-base transition-colors duration-200 
                        ${currentType === 'sell' 
                            ? 'bg-[#ff3b3b] hover:bg-[#ff2d2d]' 
                            : 'bg-[#00ff88] text-black hover:bg-[#00ee77]'}`}
                >
                    {currentType.toUpperCase()} {tokenSymbol} for {amount} @ market price
                </button>
            </div>
        </div>
    );
};

export default LimitOrder;