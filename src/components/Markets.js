import { useSelector, useDispatch } from 'react-redux'

import config from '../config.json'

import { loadTokens } from '../store/interactions'
const Markets = () => {
  const provider = useSelector(state => state.provider.connection)
  const chainId = useSelector(state => state.provider.chainId)

  const dispatch = useDispatch()
  
  const marketHandler = async (e) => {
    const addresses = e.target.value.split(',')
    await loadTokens(provider, addresses, dispatch)
  }

  return(
    <div className='component exchange__markets'>
      <div className='component__header'>
        <h2>Select Market</h2>
      </div>

      { chainId && config[chainId] ?  
        <select name="markets" id="markets" onChange={marketHandler}>
          <option value={`${config[chainId].DNV.address},${config[chainId].mETH.address}`}>DNV / mETH</option>
          <option value={`${config[chainId].DNV.address},${config[chainId].mDAI.address}`}>DNV / mDAI</option>
        </select>
        :
        <div><p>Not Deployed to Network</p></div>
      }
      <hr />
    </div>
  )
}

export default Markets;
