import {React,useEffect,useContext} from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import NewButterWallet from './NewButterWallet'
import DepositNewFunds from './DepositNewFunds'
import ButterTerminalContext from './ButterTerminalContext'

const Deposit = () => {
    const { butterWalletCredentials } = useContext(ButterTerminalContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!butterWalletCredentials) {
            toast.error('Please create a wallet first');
            navigate('/butter-wallet');
        }
    }, [butterWalletCredentials, navigate]);

    return (
        <NewButterWallet>
            <DepositNewFunds />
        </NewButterWallet>
    )
}

export default Deposit
