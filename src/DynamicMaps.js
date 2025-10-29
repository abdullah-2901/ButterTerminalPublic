import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';

const DynamicMaps = () => {
    const [contractData, setContractData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Function to fetch data from the API
    const fetchLiveData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.get('https://localhost:7025/api/Data/GetLiveData'); // Replace with your actual API URL
            // const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.example.com';
            // const response = await axios.get(`${API_BASE_URL}/api/Data/GetLiveData`); // Replace with your actual API URL
            // console.log('API Response:', response.data);
            setContractData(response.data);
        } catch (error) {
            console.error('Error fetching live data:', error);
            setError('Failed to fetch data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial data fetch
        fetchLiveData();

        // Set up interval to refresh data every 30 seconds
        const interval = setInterval(fetchLiveData, 30000);

        // Clean up the interval on component unmount to avoid memory leaks
        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <h1>ContractAddress-wise Price Data</h1>
            {loading && <p>Loading data...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {!loading && !error && contractData.length === 0 && (
                <p>No data available to display.</p>
            )}
            {!loading && !error && contractData.length > 0 && contractData.map((item, index) => (
                <div key={index}>
                    <h3>Price Chart for {item.tokenSymbol}</h3>
                    {item.data && item.data.length > 0 ? (
                        <Plot
                            data={[
                                {
                                    x: item.data.map(point => new Date(point.createdDate)),
                                    y: item.data.map(point => point.price),
                                    type: 'scatter',
                                    mode: 'lines+markers',
                                    marker: { color: 'blue' },
                                },
                            ]}
                            layout={{
                                title: `Price Chart for ${item.tokenSymbol}`,
                                xaxis: {
                                    title: 'Date and Time',
                                    type: 'date',
                                },
                                yaxis: {
                                    title: 'Price',
                                    type: '#000000',
                                },
                                autosize: true,
                            }}
                            style={{ width: '50%', height: '400px' }}
                        />
                    ) : (
                        <p>No data available for {item.tokenSymbol}.</p>
                    )}
                </div>
            ))}
        </div>
    );
};

export default DynamicMaps;
