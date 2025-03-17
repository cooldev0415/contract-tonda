// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TondaAirdrop
 * @dev A comprehensive airdrop contract with registration, verification, and points-based distribution
 */
contract TondaAirdrop is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant POINT_MANAGER_ROLE = keccak256("POINT_MANAGER_ROLE");
    
    IERC20 public immutable token;
    uint256 public airdropStart;
    uint256 public registrationEnd;
    uint256 public constant REGISTRATION_DURATION = 7 days;
    uint256 public tokenPerPoint;
    
    mapping(address => bool) public isRegistered;
    mapping(address => bool) public isVerified;
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public userPoints;
    
    uint256 public totalRegistered;
    uint256 public totalVerified;
    uint256 public totalClaimed;
    uint256 public totalPoints;
    
    // Simple reentrancy guard
    uint256 private _claimLocked;
    
    event UserRegistered(address indexed user, uint256 timestamp);
    event UserVerified(address indexed user, address indexed verifier);
    event AirdropClaimed(address indexed user, uint256 amount);
    event AirdropScheduled(uint256 startTime, uint256 registrationEndTime);
    event PointsAssigned(address indexed user, uint256 points);
    event TokenPerPointUpdated(uint256 newTokenPerPoint);
    
    error RegistrationClosed();
    error AlreadyRegistered();
    error NotRegistered();
    error NotVerified();
    error AlreadyClaimed();
    error AirdropNotStarted();
    error AirdropNotScheduled();
    error InvalidScheduleTime();
    error ReentrancyGuard();
    error NoPointsAssigned();
    error ArrayLengthMismatch();
    error InvalidTokenPerPoint();

    /**
     * @dev Constructor sets up roles and initializes contract parameters
     * @param _token Address of the token to be airdropped
     * @param _tokenPerPoint Number of tokens per point in the distribution
     */
    constructor(address _token, uint256 _tokenPerPoint) {
        require(_token != address(0), "Invalid token address");
        require(_tokenPerPoint > 0, "Invalid token per point");
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(POINT_MANAGER_ROLE, msg.sender);
        
        token = IERC20(_token);
        tokenPerPoint = _tokenPerPoint;
    }

    /**
     * @dev Schedule the airdrop and registration period
     * @param _startTime Timestamp when the airdrop claiming starts
     */
    function scheduleAirdrop(uint256 _startTime) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_startTime <= block.timestamp) revert InvalidScheduleTime();
        
        airdropStart = _startTime;
        registrationEnd = _startTime - 1 days; // Registration ends 1 day before airdrop
        
        emit AirdropScheduled(_startTime, registrationEnd);
    }

    /**
     * @dev Register for the airdrop
     * Requirements:
     * - Registration period is active
     * - User hasn't registered before
     */
    function register() external {
        if (registrationEnd == 0) revert AirdropNotScheduled();
        if (block.timestamp > registrationEnd) revert RegistrationClosed();
        if (isRegistered[msg.sender]) revert AlreadyRegistered();
        
        isRegistered[msg.sender] = true;
        totalRegistered++;
        
        emit UserRegistered(msg.sender, block.timestamp);
    }

    /**
     * @dev Verify a registered user
     * @param _user Address of the user to verify
     * Requirements:
     * - Caller must have VERIFIER_ROLE
     * - User must be registered
     */
    function verifyUser(address _user) external onlyRole(VERIFIER_ROLE) {
        if (!isRegistered[_user]) revert NotRegistered();
        if (isVerified[_user]) return; // Idempotent operation
        
        isVerified[_user] = true;
        totalVerified++;
        
        emit UserVerified(_user, msg.sender);
    }

    /**
     * @dev Batch verify multiple users
     * @param _users Array of user addresses to verify
     */
    function batchVerifyUsers(address[] calldata _users) external onlyRole(VERIFIER_ROLE) {
        for (uint256 i = 0; i < _users.length; i++) {
            if (isRegistered[_users[i]] && !isVerified[_users[i]]) {
                isVerified[_users[i]] = true;
                totalVerified++;
                emit UserVerified(_users[i], msg.sender);
            }
        }
    }

    /**
     * @dev Assign points to a user
     * @param _user Address of the user
     * @param _points Number of points to assign
     * Requirements:
     * - Caller must have POINT_MANAGER_ROLE
     */
    function assignPoints(address _user, uint256 _points) external onlyRole(POINT_MANAGER_ROLE) {
        if (!isRegistered[_user]) revert NotRegistered();
        
        // If user already had points, subtract them from total before updating
        if (userPoints[_user] > 0) {
            totalPoints -= userPoints[_user];
        }
        
        userPoints[_user] = _points;
        totalPoints += _points;
        
        emit PointsAssigned(_user, _points);
    }

    /**
     * @dev Batch assign points to multiple users
     * @param _users Array of user addresses
     * @param _points Array of point values to assign
     * Requirements:
     * - Caller must have POINT_MANAGER_ROLE
     * - Arrays must have the same length
     */
    function batchAssignPoints(address[] calldata _users, uint256[] calldata _points) 
        external 
        onlyRole(POINT_MANAGER_ROLE) 
    {
        if (_users.length != _points.length) revert ArrayLengthMismatch();
        
        for (uint256 i = 0; i < _users.length; i++) {
            if (isRegistered[_users[i]]) {
                // If user already had points, subtract them from total before updating
                if (userPoints[_users[i]] > 0) {
                    totalPoints -= userPoints[_users[i]];
                }
                
                userPoints[_users[i]] = _points[i];
                totalPoints += _points[i];
                
                emit PointsAssigned(_users[i], _points[i]);
            }
        }
    }

    /**
     * @dev Update the token per point rate
     * @param _newTokenPerPoint New token per point value
     * Requirements:
     * - Caller must be admin
     * - Value must be greater than 0
     */
    function updateTokenPerPoint(uint256 _newTokenPerPoint) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newTokenPerPoint == 0) revert InvalidTokenPerPoint();
        
        tokenPerPoint = _newTokenPerPoint;
        emit TokenPerPointUpdated(_newTokenPerPoint);
    }

    /**
     * @dev Claim airdrop tokens based on points
     * Requirements:
     * - Airdrop must have started
     * - User must be verified
     * - User hasn't claimed before
     * - User must have points assigned
     */
    function claim() external {
        if (_claimLocked == 1) revert ReentrancyGuard();
        _claimLocked = 1;
        
        if (airdropStart == 0) revert AirdropNotScheduled();
        if (block.timestamp < airdropStart) revert AirdropNotStarted();
        if (!isVerified[msg.sender]) revert NotVerified();
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();
        
        uint256 userPointAmount = userPoints[msg.sender];
        if (userPointAmount == 0) revert NoPointsAssigned();
        
        uint256 tokenAmount = userPointAmount * tokenPerPoint;
        
        hasClaimed[msg.sender] = true;
        totalClaimed++;
        
        token.safeTransfer(msg.sender, tokenAmount);
        
        emit AirdropClaimed(msg.sender, tokenAmount);
        _claimLocked = 0;
    }

    /**
     * @dev Withdraw any remaining tokens after airdrop
     * @param _amount Amount of tokens to withdraw
     * Requirements:
     * - Caller must be admin
     * - Airdrop must have been active for at least 30 days
     */
    function withdrawRemainingTokens(uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            block.timestamp > airdropStart + 30 days,
            "Too early to withdraw"
        );
        token.safeTransfer(msg.sender, _amount);
    }

    /**
     * @dev Check if a user can claim the airdrop
     * @param _user Address of the user to check
     * @return bool Whether the user can claim
     */
    function canClaim(address _user) external view returns (bool) {
        return isVerified[_user] && 
               !hasClaimed[_user] && 
               userPoints[_user] > 0 &&
               block.timestamp >= airdropStart &&
               airdropStart != 0;
    }

    /**
     * @dev Calculate how many tokens a user would receive
     * @param _user Address of the user
     * @return amount The token amount the user would receive
     */
    function getClaimAmount(address _user) external view returns (uint256) {
        return userPoints[_user] * tokenPerPoint;
    }
} 