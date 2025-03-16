# Tonda Token and Airdrop Contracts

A professional-grade implementation of an ERC20 token (TONDA) and an airdrop distribution system on BNB Chain (BSC) with advanced features.

## Contracts

### TondaToken (TONDA)
- ERC20 token with standard functionality
- Role-based access control for minting and pausing
- Burnable tokens
- Pausable transfers for emergency situations
- Permit functionality for gasless approvals

### TondaAirdrop
- Role-based access control for administration and verification
- Two-step claim process: registration and verification
- Time-based distribution with configurable start time
- Batch verification support
- Reentrancy protection
- Token recovery mechanism after 30 days

## Features

### Security
- Role-based access control using OpenZeppelin's AccessControl
- Custom reentrancy protection for claim function
- Safe token transfers using OpenZeppelin's SafeERC20
- Time-locked withdrawals
- Comprehensive error handling with custom errors

### Administration
- Verifier role for KYC/verification process
- Batch operations support for efficient verification
- Emergency token recovery mechanism
- Configurable airdrop timing

## Prerequisites

- Node.js (v14+)
- npm or yarn
- A wallet with BNB testnet tokens for deployment

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tonda-contract
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PRIVATE_KEY=your_private_key_here
BSC_TESTNET_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

## Testing

Run the test suite:
```bash
npx hardhat test
```

## Deployment

1. Deploy to BSC testnet:
```bash
npx hardhat run scripts/deploy.ts --network bscTestnet
```

2. Verify on BscScan (automatic during deployment):
```bash
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Contract Interaction

### Token Operations
- Mint new tokens (MINTER_ROLE only)
- Burn tokens (any holder)
- Transfer tokens
- Approve spending

### Airdrop Operations
1. Registration Phase:
   - Users register for airdrop
   - Registration closes 1 day before airdrop start

2. Verification Phase:
   - Verifiers approve registered users
   - Batch verification available for efficiency

3. Claim Phase:
   - Verified users can claim after start time
   - One-time claim per address
   - Built-in reentrancy protection

## Architecture

### Token Contract
- Inherits from OpenZeppelin's ERC20
- Uses AccessControl for role management
- Implements ERC20Permit for gasless approvals

### Airdrop Contract
- Independent contract with token interface
- Role-based administration
- State machine pattern for airdrop phases
- Event emission for off-chain tracking

## Security Considerations

- Role-based access control for administrative functions
- Custom reentrancy protection in claim function
- SafeERC20 for token transfers
- Time delays for critical operations
- Comprehensive event logging

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
