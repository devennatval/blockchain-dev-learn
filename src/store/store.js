import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { composeWithDevTools } from 'redux-devtools-extension'

/* Import Reducers */
import { provider, tokens, exchange } from './reducers'

const reducer = combineReducers({
	provider,
	tokens,
	exchange
})

const initialStrate = {}

const middleware = [thunk]

const store = createStore(reducer, initialStrate, composeWithDevTools(applyMiddleware(...middleware)))

export default store
