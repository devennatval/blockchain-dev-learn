// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

contract Exchange {
	address public feeAccount;
	uint256 public feePercent;

	mapping(address => mapping(address => uint256)) public tokens;
	mapping(uint256 => _Order) public orders;

	uint256 public orderCount;

	event Deposit(
		address token,
		address user,
		uint256 amount,
		uint256 balance
	);

	event Withdrawal(
		address token,
		address user,
		uint256 amount,
		uint256 balance
	);

	event Order(
		uint256 id, 
		address user, 
		address tokenGet,
		uint256 amountGet,
		address tokenGive,
		uint256 amountGive,
		uint256 timestamp
	);

	struct _Order {
		uint256 id; // Unique identifier for order
		address user; // User who made order
		address tokenGet; // Address of the token they receive
		uint256 amountGet; // Amount they receive
		address tokenGive; // Address of token they give
		uint256 amountGive; // Amount they give
		uint256 timestamp; // When order was created
	}

	constructor(
		address _feeAcount,
		uint256 _feePercent
	) {
		feeAccount = _feeAcount;
		feePercent = _feePercent;
		orderCount = 0;
	}

	function depositToken(
		address _token,
		uint256 _amount
	) public {
		// Transfer token to exchange
		require(Token(_token).transferFrom(msg.sender, address(this), _amount));

		// Update user balance
		tokens[_token][msg.sender] += _amount;

		// Emit an event
		emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
	}

	function withdrawToken(
		address _token,
		uint256 _amount
	) public {
		// Transfer token to user
		require(Token(_token).transfer(msg.sender, _amount));

		// Update user balance
		tokens[_token][msg.sender] -= _amount;

		// Emit an event
		emit Withdrawal(_token, msg.sender, _amount, tokens[_token][msg.sender]);
	}

	function balanceOf(
		address _token,
		address _user
	) public view returns (uint256) {
		return tokens[_token][_user];
	}

	function makeOrder(
		address _tokenGet,
		uint256 _amountGet,
		address _tokenGive,
		uint256 _amountGive
	) public {
		// Require token balance
		require(balanceOf(_tokenGive, msg.sender) >= _amountGive);

		// Instantiate a new order
		orderCount += 1;
		orders[orderCount] = _Order(
			1, // id 1, 2, 3
			msg.sender, // user '0x0...'
			_tokenGet,
			_amountGet,
			_tokenGive,
			_amountGive,
			block.timestamp // timestamp 1893507958 (in form of second)
		);

		// Emit an event
		emit Order(
			1,
			msg.sender,
			_tokenGet,
			_amountGet,
			_tokenGive,
			_amountGive,
			block.timestamp
		);
	}
}
