import React, { useState, forwardRef } from 'react';
import { Dropdown, Form, Button } from 'react-bootstrap';
import axios from 'axios';

// Custom Toggle Component
const CustomToggle = forwardRef(({ children, onClick }, ref) => (
    <a
        href=""
        ref={ref}
        onClick={(e) => {
            e.preventDefault();
            onClick(e);
        }}
        className="text-decoration-none text-dark d-flex align-items-center rounded px-2 py-1"
        style={{ 
            fontSize: '11px',
            backgroundColor: '#e9ecef',
            border: '1px solid #dee2e6',
            height: '24px',
            maxWidth: '120px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis'
        }}
    >
        {children}
        <span className="ms-1">&#x25bc;</span>
    </a>
));

// Custom Menu Component with Search
const CustomMenu = forwardRef(
    ({ children, style, className, 'aria-labelledby': labeledBy }, ref) => {
        const [value, setValue] = useState('');

        return (
            <div
                ref={ref}
                style={{
                    ...style,
                    backgroundColor: '#e9ecef',
                    border: '1px solid #dee2e6',
                    marginTop: '2px',
                    position: 'absolute',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto'
                }}
                className={`${className} rounded py-1`}
                aria-labelledby={labeledBy}
            >
                <Form.Control
                    autoFocus
                    className="mx-2 my-1 w-auto"
                    placeholder="Type to filter..."
                    onChange={(e) => setValue(e.target.value)}
                    value={value}
                    style={{ 
                        backgroundColor: '#f8f9fa',
                        fontSize: '11px',
                        height: '24px',
                        padding: '2px 8px'
                    }}
                />
                <ul className="list-unstyled mb-0">
                    {React.Children.toArray(children).filter(
                        (child) =>
                            !value || child.props.children.toLowerCase().startsWith(value.toLowerCase()),
                    )}
                </ul>
            </div>
        );
    }
);

const StrategySelector = ({ className = '', contractAddress, channelName }) => {
    const [selectedStrategy, setSelectedStrategy] = useState('select');
    const [isLoading, setIsLoading] = useState(false);
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.example.com';
    const API_ENDPOINT = `${API_BASE_URL}/api/Data/InsertStrategyWithContract`;
    // const API_ENDPOINT = 'https://localhost:7025/api/Data/InsertStrategyWithContract';

    const strategies = [
        { value: 'select', label: 'Select Strategy', buttonClass: 'secondary' },
        { value: 'chasing_the_meta', label: 'Chasing the meta', buttonClass: 'primary' },
        { value: 'accumulation_of_mooners', label: 'Accumulation of mooners', buttonClass: 'success' },
        { value: 'scalp_them_shitters', label: 'Scalp them shitters', buttonClass: 'warning' }
    ];

    const handleSelect = (eventKey, event) => {
        const strategy = strategies.find(s => s.value === eventKey);
        setSelectedStrategy(strategy.value);
    };

    const handleStrategySubmit = async () => {
        if (!contractAddress || selectedStrategy === 'select') return;

        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                contractAddress: contractAddress,
                channelName: channelName,
                strategy: selectedStrategy
            });

            const response = await axios.post(
                `${API_ENDPOINT}?${params.toString()}`,
                null,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status === 200) {
                console.log('Strategy updated successfully');
            } else {
                throw new Error('Failed to update strategy');
            }
        } catch (error) {
            console.error('Error updating strategy:', error);
            alert('Failed to update strategy. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const getButtonLabel = (strategyValue) => {
        switch(strategyValue) {
            case 'chasing_the_meta':
                return 'Chase Meta';
            case 'accumulation_of_mooners':
                return 'Accumulate Mooners';
            case 'scalp_them_shitters':
                return 'Scalp Shitters';
            default:
                return '';
        }
    };

    return (
        <div className={`d-flex flex-wrap align-items-center gap-1 ms-2 strategy-selector ${className}`}>
            <Dropdown onSelect={handleSelect}>
                <Dropdown.Toggle as={CustomToggle} id="strategy-dropdown">
                    {strategies.find(s => s.value === selectedStrategy)?.label}
                </Dropdown.Toggle>

                <Dropdown.Menu 
                    as={CustomMenu} 
                    style={{ minWidth: '160px', maxWidth: '200px' }}
                >
                    {strategies.map((strategy) => (
                        <Dropdown.Item 
                            key={strategy.value}
                            eventKey={strategy.value}
                            active={strategy.value === selectedStrategy}
                            className="px-2 py-1 hover-bg-gray"
                            style={{
                                backgroundColor: selectedStrategy === strategy.value ? '#dee2e6' : 'transparent',
                                fontSize: '11px'
                            }}
                        >
                            {strategy.label}
                        </Dropdown.Item>
                    ))}
                </Dropdown.Menu>
            </Dropdown>

            {selectedStrategy && selectedStrategy !== 'select' && (
                <Button
                    variant={strategies.find(s => s.value === selectedStrategy)?.buttonClass}
                    className="text-white d-flex align-items-center strategy-button"
                    size="sm"
                    onClick={handleStrategySubmit}
                    disabled={isLoading}
                    style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        height: '24px'
                    }}
                >
                    {isLoading ? (
                        <span className="spinner-border spinner-border-sm me-1" 
                              style={{ width: '0.7rem', height: '0.7rem' }} />
                    ) : null}
                    {getButtonLabel(selectedStrategy)}
                </Button>
            )}
        </div>
    );
};

export default StrategySelector;