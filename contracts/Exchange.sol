// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

contract Exchange {
	address public feeAccount;
	uint256 public feePercent;

	mapping(address => mapping(address => uint256)) public tokens;
	mapping(uint256 => _Order) public orders;
	mapping(uint256 => bool) public orderCancelled ;
	mapping(uint256 => bool) public orderFilled;
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

	event Cancel(
		uint256 id,
		address user,
		address tokenGet,
		uint256 amountGet,
		address tokenGive,
		uint256 amountGive,
		uint256 timestamp
	);

	event Trade(
		uint256 id,
		address user,
		address tokenGet,
		uint256 amountGet,
		address tokenGive,
		uint256 amountGive,
		address creator,
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
		orderCount++;
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

	function cancelOrder(uint256 _id) public {
		// Fetch order
		_Order storage _order = orders[_id];

		// Order must exist
		require(_order.id == _id);

		// Ensure the caller of the function is the owner of the order
		require(address(_order.user) == msg.sender);

		// Cancel the order
		orderCancelled[_id] = true;

		// Emit an event
		emit Cancel(
			_order.id,
			msg.sender,
			_order.tokenGet,
			_order.amountGet,
			_order.tokenGive,
			_order.amountGive,
			block.timestamp
		);
	}

	function fillOrder(uint256 _id) public {
		require(_id > 0 && _id <= orderCount, "Order does not exist");
		require(!orderCancelled[_id]);
		require(!orderFilled[_id]);

		// Fetch order
		_Order storage _order = orders[_id];

		// Swapping Tokens (trading)
		_trade(
			_order.id,
			_order.user,
			_order.tokenGet,
			_order.amountGet,
			_order.tokenGive,
			_order.amountGive
		);

		// Mark order as filled
		orderFilled[_order.id] = true;
	}

	function _trade(
		uint _orderId,
		address _user,
		address _tokenGet,
		uint256 _amountGet,
		address _tokenGive,
		uint256 _amountGive
	) internal {
		// Fee is paid by the user who filled the order (msg.sender)
		// Fee is deducted from _amountGet
		uint256 _feeAmount = (_amountGet * feePercent) / 100;

		// Execute the trade
		// msg.sender is the user who filled the order, while _user is who created the order
		tokens[_tokenGet][msg.sender] -= (_amountGet + _feeAmount);
		tokens[_tokenGet][_user] += _amountGet;

		// Charge fees
		tokens[_tokenGet][feeAccount] += _feeAmount;

		tokens[_tokenGive][msg.sender] += _amountGive;
		tokens[_tokenGive][_user] -= _amountGive;

		// Emit trade event
		emit Trade(
			_orderId,
			msg.sender,
			_tokenGet,
			_amountGet,
			_tokenGive,
			_amountGive,
			_user,
			block.timestamp
		);
	}
}
