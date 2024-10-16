import { createSelector } from 'reselect'
import { get, groupBy, reject, maxBy, minBy } from 'lodash'
import { ethers } from 'ethers'
import moment from 'moment'

const account = state => get(state, 'provider.account')
const tokens = state => get(state, 'tokens.contracts')

const allOrders = state => get(state, 'exchange.allOrders.data', [])
const cancelledOrders = state => get(state, 'exchange.cancelledOrders.data', [])
const filledOrders = state => get(state, 'exchange.filledOrders.data', [])

const GREEN = '#25CE8F'
const RED = '#F45353'

const openOrders = state => {
	const all = allOrders(state)
	const filled = filledOrders(state)
	const cancelled = cancelledOrders(state)

	const openOrders = reject(all, (order) => {
		const orderFilled = filled.some((o) => o.id.toString() === order.id.toString())
		const orderCancelled = cancelled.some((o) => o.id.toString() === order.id.toString())
		return orderFilled || orderCancelled
	})

	return openOrders
}

export const myOpenOrdersSelector = createSelector(
	account,
	tokens,
	openOrders,
	(account, tokens, orders) => {
		if(!tokens[0] || !tokens[1]) { return }

		// Filter orders created by current account
		orders = orders.filter((o) => o.user === account)

		// Filter orders by selected tokens
		orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address)
		orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address)

		// Decorate orders - add display attributes
		orders = decorateMyOpenOrders(orders, tokens)

		// Sort orders by date descending
		orders = orders.sort((a, b) => b.timestamp - a.timestamp)

		return orders
	}
)

const decorateMyOpenOrders = (orders, tokens) => {
	return orders.map((order) => {
		order = decorateOrder(order, tokens)
		order = decorateMyOpenOrder(order, tokens)
		return order
	})
}

const decorateMyOpenOrder = (order, tokens) => {
	let orderType = order.tokenGive === tokens[1].address ? 'buy' : 'sell'

	return {
		...order,
		orderType,
		orderTypeClass: orderType === 'buy' ? GREEN : RED
	}
}

const decorateOrder = (order, tokens) => {
	let token0Amount, token1Amount

	// Note: DNV should be considered token0, mETH is considered token1
	// Example: Giving mETH in exchange for DApp
	if(order.tokenGive === tokens[1].address) {
		token0Amount = order.amountGive // The amount of DNV we are giving
		token1Amount = order.amountGet // The amount of mETH we want
	} else {
		token0Amount = order.amountGet // The amount of DNV we want
		token1Amount = order.amountGive // The amount of mETH we are giving
	}

	// Calculate token price to 5 decimal places
	const precision = 100000
	let tokenPrice = token1Amount / token0Amount
	tokenPrice = Math.round(tokenPrice * precision) / precision

	return {
		...order,
		token0Amount: ethers.utils.formatUnits(token0Amount, "ether"),
		token1Amount: ethers.utils.formatUnits(token1Amount, "ether"),
		tokenPrice,
		formattedTimestamp: moment.unix(order.timestamp).format('h:mm:ssa d MMM D')
	}
}

export const filledOrderSelector = createSelector(
	filledOrders,
	tokens,
	(orders, tokens) => {
		if(!tokens[0] || !tokens[1]) { return }

		// Filter orders by selected tokens
		orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address)
		orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address)

		// Sort orders by time ascending for price comparison
		orders = orders.sort((a, b) => a.timestamp - b.timestamp)

		// Decorate the orders
		orders = decorateFilledOrders(orders, tokens)

		// Sort orders by time descending for display
		orders = orders.sort((a, b) => b.timestamp - a.timestamp)



		return orders
	}
)

const decorateFilledOrders = (orders, tokens) => {
	// Track previous order to compare history
	let previousOrder = orders[0]

	return orders.map((order) => {
		order = decorateOrder(order, tokens)
		order = decorateFilledOrder(order, previousOrder)
		previousOrder = order
		return order
	})
}

const decorateFilledOrder = (order, previousOrder) => {
	return {
		...order,
		tokenPriceClass: tokenPriceClass(order.tokenPrice, order.id, previousOrder)
	}
}

const tokenPriceClass = (tokenPrice, orderId, previousOrder) => {
	if(previousOrder.id === orderId) {
		return GREEN
	}

	if(previousOrder.tokenPrice <= tokenPrice) {
		return GREEN
	} else {
		return RED
	}
}

export const myFilledOrdersSelector = createSelector(
	account,
	tokens,
	filledOrders,
	(account, tokens, orders) => {
		if(!tokens[0] || !tokens[1]) { return }

		// Filter orders created by current account
		orders = orders.filter((o) => o.user === account || o.creator === account)

		// Filter orders by selected tokens
		orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address)
		orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address)

		// Decorate orders - add display attributes
		orders = decorateMyFilledOrders(orders, account, tokens)

		// Sort orders by date descending
		orders = orders.sort((a, b) => b.timestamp - a.timestamp)

		return orders
	}
)

const decorateMyFilledOrders = (orders, account, tokens) => {
	return orders.map((order) => {
		order = decorateOrder(order, tokens)
		order = decorateMyFilledOrder(order, account, tokens)
		return order
	})
}

const decorateMyFilledOrder = (order, account, tokens) => {
	const myOrder = order.creator === account
	let orderType
	if(myOrder) {
		orderType = order.tokenGive === tokens[1].address ? 'buy' : 'sell'
	} else {
		orderType = order.tokenGive === tokens[1].address ? 'sell' : 'buy'
	}

	return {
		...order,
		orderType,
		orderClass: orderType === 'buy' ? GREEN : RED,
		orderSign: orderType === 'buy' ? '+' : '-'
	}
}

export const orderBookSelector = createSelector(
	openOrders,
	tokens,
	(orders, tokens) => {
		if(!tokens[0] || !tokens[1]) { return }

		// Filter orders by selected tokens
		orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address)
		orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address)

		// Decorate orders
		orders = decorateOrderBookOrders(orders, tokens)

		// Group orders by "orderType"
		orders = groupBy(orders, 'orderType')

		// Fetch buy orders
		const buyOrders = get(orders, 'buy', [])


		// Sort buy orders by token price
		orders = {
			...orders, 
			buyOrders: buyOrders.sort((a, b) => b.tokenPrice - a.tokenPrice)
		}

		// Fetch sell orders
		const sellOrders = get(orders, 'sell', [])

		// Sort sell orders by token price
		orders = {
			...orders, 
			sellOrders: sellOrders.sort((a, b) => b.tokenPrice - a.tokenPrice)
		}

		return orders
	}
)

const decorateOrderBookOrders = (orders, tokens) => {
	return orders.map((order) => {
		order = decorateOrder(order, tokens)
		order = decorateOrderBookOrder(order, tokens)
		return order

	})
}

const decorateOrderBookOrder = (order, tokens) => {
	const orderType = order.tokenGive === tokens[1].address ? 'buy' : 'sell'
	return ({
		...order,
		orderType,
		orderTypeClass: (orderType === 'buy' ? GREEN : RED),
		orderFillAction: (orderType === 'buy' ? 'sell' : 'buy')
	})
}

export const priceChartSelector = createSelector(
	filledOrders,
	tokens,
	(orders, tokens) => {
		if(!tokens[0] || !tokens[1]) { return }

		// Filter orders by selected tokens
		orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address)
		orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address)

		
		// Sort orders by date ascending to compare history 
		orders = orders.sort((a,b) => a.timestamp - b.timestamp)


		// Decorate orders
		orders = orders.map((o) => decorateOrder(o, tokens))

		let secondLastOrder, lastOrder
		[secondLastOrder, lastOrder] = orders.slice(orders.length - 2, orders.length)

		const lastPrice = get(lastOrder, 'tokenPrice', 0)
		const secondlastPrice = get(secondLastOrder, 'tokenPrice', 0)

		return {
			lastPrice,
			lastPriceChange: (lastPrice >= secondlastPrice ? `+` : `-`),
			series: [{
				data: buildGraphData(orders)
			}]
		}
	}
)

const buildGraphData = (orders) => {
	// Group the orders by hour for the graph
	orders = groupBy(orders, (o) => moment.unix(o.timestamp).startOf('day').format())

	const hours = Object.keys(orders)
	const graphData = hours.map((hour) => {
		// Fetch all orders from current hour
		const group = orders[hour]

		// Calculate price values: open, high, low, close
		const open = group[0]
		const high = maxBy(group, 'tokenPrice')
		const low = minBy(group, 'tokenPrice')
		const close = group[group.length - 1]

		return {
			x: new Date(hour),
			y: [open.tokenPrice, high.tokenPrice, low.tokenPrice, close.tokenPrice]
		}
	})

	return graphData
}
