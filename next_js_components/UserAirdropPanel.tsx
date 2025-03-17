import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TondaAirdrop__factory } from '../typechain-types';

// Contract config
const AIRDROP_CONTRACT_ADDRESS = '0x9a215FE9F566d6ED7abAf2859D3165a7f28E8f6c';
const TOKEN_CONTRACT_ADDRESS = '0xf193272bb87a0A8426Eb5922a40193e8B7A17EeD';

interface UserAirdropPanelProps {
  address: string; // User's wallet address
  provider: ethers.providers.Web3Provider | null;
}

const UserAirdropPanel: React.FC<UserAirdropPanelProps> = ({ address, provider }) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [claimableAmount, setClaimableAmount] = useState('0');
  const [canClaim, setCanClaim] = useState(false);
  const [airdropStartTime, setAirdropStartTime] = useState(0);
  const [registrationEndTime, setRegistrationEndTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactionPending, setTransactionPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (provider && address) {
      fetchUserData();
    }
  }, [provider, address]);

  const fetchUserData = async () => {
    if (!provider) return;
    
    setLoading(true);
    setError('');
    
    try {
      const signer = provider.getSigner();
      const airdropContract = TondaAirdrop__factory.connect(
        AIRDROP_CONTRACT_ADDRESS,
        signer
      );
      
      // Get airdrop schedule
      const startTime = await airdropContract.airdropStart();
      const endRegTime = await airdropContract.registrationEnd();
      
      setAirdropStartTime(startTime.toNumber());
      setRegistrationEndTime(endRegTime.toNumber());
      
      // Get user status
      const [registered, verified, claimed, points, canClaimStatus, claimAmount] = await Promise.all([
        airdropContract.isRegistered(address),
        airdropContract.isVerified(address),
        airdropContract.hasClaimed(address),
        airdropContract.userPoints(address),
        airdropContract.canClaim(address),
        airdropContract.getClaimAmount(address)
      ]);
      
      setIsRegistered(registered);
      setIsVerified(verified);
      setHasClaimed(claimed);
      setUserPoints(points.toNumber());
      setCanClaim(canClaimStatus);
      setClaimableAmount(ethers.utils.formatEther(claimAmount));
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load airdrop data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!provider) return;
    
    setTransactionPending(true);
    setError('');
    
    try {
      const signer = provider.getSigner();
      const airdropContract = TondaAirdrop__factory.connect(
        AIRDROP_CONTRACT_ADDRESS,
        signer
      );
      
      const tx = await airdropContract.register();
      await tx.wait();
      
      // Refresh data
      await fetchUserData();
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.reason) {
        setError(`Registration failed: ${err.reason}`);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setTransactionPending(false);
    }
  };

  const handleClaim = async () => {
    if (!provider) return;
    
    setTransactionPending(true);
    setError('');
    
    try {
      const signer = provider.getSigner();
      const airdropContract = TondaAirdrop__factory.connect(
        AIRDROP_CONTRACT_ADDRESS,
        signer
      );
      
      const tx = await airdropContract.claim();
      await tx.wait();
      
      // Refresh data
      await fetchUserData();
    } catch (err: any) {
      console.error('Claim error:', err);
      if (err.reason) {
        setError(`Claim failed: ${err.reason}`);
      } else {
        setError('Claim failed. Please try again.');
      }
    } finally {
      setTransactionPending(false);
    }
  };

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'Not scheduled';
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading) {
    return <div className="p-6 bg-white rounded-lg shadow-md">Loading...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Tonda Token Airdrop</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Airdrop Schedule</h3>
        <p><span className="font-medium">Registration ends:</span> {formatDate(registrationEndTime)}</p>
        <p><span className="font-medium">Airdrop starts:</span> {formatDate(airdropStartTime)}</p>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Your Status</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${isRegistered ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span>Registered</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${isVerified ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span>Verified</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${userPoints > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span>Points Assigned</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${hasClaimed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span>Claimed</span>
          </div>
        </div>
      </div>
      
      {userPoints > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Your Points</h3>
          <p className="text-2xl font-bold">{userPoints} Points</p>
          <p className="text-sm text-gray-600">Claimable amount: {claimableAmount} TONDA</p>
        </div>
      )}
      
      <div className="flex space-x-4">
        {!isRegistered && (
          <button
            onClick={handleRegister}
            disabled={transactionPending || Date.now() / 1000 > registrationEndTime}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              transactionPending || Date.now() / 1000 > registrationEndTime
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {transactionPending ? 'Processing...' : 'Register'}
          </button>
        )}
        
        {canClaim && !hasClaimed && (
          <button
            onClick={handleClaim}
            disabled={transactionPending}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              transactionPending
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {transactionPending ? 'Processing...' : 'Claim Tokens'}
          </button>
        )}
      </div>
      
      {!(canClaim && !hasClaimed) && !(!isRegistered && Date.now() / 1000 <= registrationEndTime) && (
        <div className="mt-4 text-sm text-gray-600">
          {isRegistered && !isVerified && 'Your registration is under review. Once verified, you will be able to claim tokens.'}
          {isVerified && userPoints === 0 && 'You have been verified but no points have been assigned yet.'}
          {isVerified && userPoints > 0 && Date.now() / 1000 < airdropStartTime && `You can claim your tokens once the airdrop starts.`}
          {hasClaimed && 'You have successfully claimed your tokens.'}
        </div>
      )}
    </div>
  );
};

export default UserAirdropPanel; 