import async from 'async';
import {
  OPTIONS_RESERVE_ADDRESS,
  OPTIONS_CONTRACTS_ADDRESS,
  KEEPER_ORACLE_ADDRESS,
  ERROR,
  CONFIGURE,
  CONFIGURE_RETURNED,
  GET_BALANCES,
  BALANCES_RETURNED,
  GET_OPTIONS,
  OPTIONS_RETURNED,
  GET_OPTIONS_FEES,
  OPTIONS_FEES_RETURNED,
  CREATE_OPTION,
  CREATE_OPTION_RETURNED
} from '../constants';
import Web3 from 'web3';

import {
  injected
} from "./connectors";

import { ERC20ABI } from './abi/erc20ABI';
import { OptionsReserveABI } from './abi/optionsReserveABI'
import { OptionsContractsABI } from './abi/optionsContractsABI'
import { Keep3rOracleABI } from './abi/keep3rOracleABI'
import { UniswapV2PairABI } from './abi/uniswapV2PairABI'

const Big = require('big.js');

const rp = require('request-promise');

const Dispatcher = require('flux').Dispatcher;
const Emitter = require('events').EventEmitter;

const dispatcher = new Dispatcher();
const emitter = new Emitter();

class Store {
  constructor() {

    this.store = {
      universalGasPrice: '70',
      account: {},
      connectorsByName: {
        MetaMask: injected
      },
      web3context: null,
      assets: [
        {
          address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
          decimals: "8",
          symbol: "WBTC",
          balance: 0
        },
        {
          address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          decimals: "6",
          symbol: "USDC",
          balance: 0
        },
        {
          address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          decimals: "6",
          symbol: "USDT",
          balance: 0
        },
        {
          address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
          decimals: "18",
          symbol: "DAI",
          balance: 0
        },
        {
          address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
          decimals: "18",
          symbol: "UNI",
          balance: 0
        },
        {
          address: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
          decimals: "18",
          symbol: "YFI",
          balance: 0
        },
        {
          address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
          decimals: "18",
          symbol: "AAVE",
          balance: 0
        },
        {
          address: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
          decimals: "18",
          symbol: "COMP",
          balance: 0
        },
        {
          address: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",
          decimals: "18",
          symbol: "MKR",
          balance: 0
        },
        {
          address: "0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44",
          decimals: "18",
          symbol: "KP3R",
          balance: 0
        },
        {
          address: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f",
          decimals: "18",
          symbol: "SNX",
          balance: 0
        },
        {
          address: "0x514910771af9ca656af840dff83e8264ecf986ca",
          decimals: "18",
          symbol: "LINK",
          balance: 0
        },
        {
          address: "0xd533a949740bb3306d119cc777fa900ba034cd52",
          decimals: "18",
          symbol: "CRV",
          balance: 0
        }
      ],
      quoteAsset: {
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        decimals: "18",
        symbol: "WETH",
        balance: 0
      }
    }

    dispatcher.register(
      function (payload) {
        switch (payload.type) {
          case CONFIGURE:
            this.configure(payload);
            break;
          case GET_BALANCES:
            this.getBalances(payload);
            break;
          case GET_OPTIONS:
            this.getOptions(payload);
            break;
          case GET_OPTIONS_FEES:
            this.getOptionsFees(payload);
            break;
          case CREATE_OPTION:
            this.createOption(payload);
            break;
          default: {
          }
        }
      }.bind(this)
    );
  }

  getStore(index) {
    return(this.store[index]);
  };

  setStore(obj) {
    this.store = {...this.store, ...obj}
    // console.log(this.store)
    return emitter.emit('StoreUpdated');
  };

  configure = async () => {
    const account = store.getStore('account')

    if(!account || !account.address) {
      return false
    }

    const web3 = await this._getWeb3Provider()

    this._callPairs(web3, account, (err, allOptionsAssets) => {
      if(err) {
        console.log(err)
        return
      }

      store.setStore({ assets: allOptionsAssets })
      return emitter.emit(CONFIGURE_RETURNED)
    })
  }

  _callPairs = async (web3, account, callback) => {
    try {
      const uniOracleContract = new web3.eth.Contract(Keep3rOracleABI, KEEPER_ORACLE_ADDRESS)
      const pairs = await uniOracleContract.methods.pairs().call({})

      async.map(pairs, async (pair, callbackInner) => {
        let pairPopulated = await this._populatePairsTokens(web3, pair)
        pairPopulated.address = pair

        let returnTokken = pairPopulated.token0

        //get price
        const price = await this._callPrice(web3, pairPopulated)
        const erc20Contract = new web3.eth.Contract(ERC20ABI, returnTokken.address)
        let balance = await erc20Contract.methods.balanceOf(account.address).call();
        balance = parseFloat(balance)/10**returnTokken.decimals


        returnTokken.balance = balance
        returnTokken.price = price

        if (callbackInner) {
          callbackInner(null, returnTokken)
        } else {
          return returnTokken
        }
      }, (err, pairsData) => {
        if(err) {
          console.log(err)
        }

        callback(null, pairsData)
      })
    } catch(ex) {
      console.log(ex)
      callback(ex, null)
    }
  }

  _populatePairsTokens = async (web3, pair) => {
    try {
      const assets = store.getStore('assets')

      const uniswapV2PairContract = new web3.eth.Contract(UniswapV2PairABI, pair)
      const token0Address = await uniswapV2PairContract.methods.token0().call({ })
      const token1Address = await uniswapV2PairContract.methods.token1().call({ })

      let token0 = null
      let token1 = null

      let token0Data = assets.filter((asset) => {
        return asset.address.toLowerCase() === token0Address.toLowerCase()
      })

      if(token0Data.length > 0) {
        token0 = token0Data[0]
      } else {
        const token0Contract = new web3.eth.Contract(ERC20ABI, token0Address)

        token0 = {
          address: token0Address,
          symbol: await token0Contract.methods.symbol().call({}),
          decimals: await token0Contract.methods.decimals().call({})
        }
      }


      let token1Data = assets.filter((asset) => {
        return asset.address.toLowerCase() === token1Address.toLowerCase()
      })

      if(token1Data.length > 0) {
        token1 = token1Data[0]
      } else {
        const token1Contract = new web3.eth.Contract(ERC20ABI, token1Address)

        token1 = {
          address: token1Address,
          symbol: await token1Contract.methods.symbol().call({}),
          decimals: await token1Contract.methods.decimals().call({})
        }
      }
      if (token0.symbol === "WETH") {
        return {
          token0: token1,
          token1: token0
        }
      } else {
        return {
          token0,
          token1
        }
      }
    } catch(ex) {
      console.log(ex)
      console.log(pair)
      return {
        token0: {},
        token1: {},
        error: ex
      }
    }
  }

  _callPrice = async (web3, pair) => {
    try {
      const keep3rOracleContract = new web3.eth.Contract(Keep3rOracleABI, KEEPER_ORACLE_ADDRESS)

      let sendAmount0 = (10**pair.token0.decimals).toFixed(0)

      const consult0To1 = await keep3rOracleContract.methods.current(pair.token0.address, sendAmount0, pair.token1.address).call({ })

      return consult0To1/10**pair.token1.decimals
    } catch(e) {
      return 0
    }
  }

  getBalances = async () => {
    const account = store.getStore('account')
    const assets = store.getStore('assets')
    let quoteAsset = store.getStore('quoteAsset')

    if(!account || !account.address) {
      return false
    }

    const web3 = await this._getWeb3Provider()


    this._getERC20Balance(web3, quoteAsset, account, (err, quoteAssetData) => {
      quoteAsset.balance = quoteAssetData[0]

      store.setStore({ quoteAsset: quoteAsset })
      return emitter.emit(BALANCES_RETURNED, quoteAsset)
    })


    async.map(assets, (asset, callback) => {
      async.parallel([
        (callbackInner) => { this._getERC20Balance(web3, asset, account, callbackInner) },
      ], (err, data) => {
        asset.balance = data[0]

        callback(null, asset)
      })
    }, (err, assets) => {
      if(err) {
        return emitter.emit(ERROR, err)
      }

      store.setStore({ assets: assets })
      return emitter.emit(BALANCES_RETURNED, assets)
    })
  }

  _getERC20Balance = async (web3, asset, account, callback) => {

    if(asset.erc20address === 'Ethereum') {
      try {
        const eth_balance = web3.utils.fromWei(await web3.eth.getBalance(account.address), "ether");
        callback(null, parseFloat(eth_balance))
      } catch(ex) {
        console.log(ex)
        return callback(ex)
      }
    } else {
      const erc20Contract = new web3.eth.Contract(ERC20ABI, asset.erc20address)

      try {
        let balance = await erc20Contract.methods.balanceOf(account.address).call({ from: account.address });
        balance = parseFloat(balance)/10**asset.decimals
        callback(null, parseFloat(balance))
      } catch(ex) {
        console.log(ex)
        return callback(ex)
      }
    }
  }

  getOptions = async () => {
    let account = store.getStore('account')
    const assets = store.getStore('assets')

    if(!account || !account.address) {
      return false
    }

    const web3 = await this._getWeb3Provider()

    try {
      const optionsReserveContract = new web3.eth.Contract(OptionsReserveABI, OPTIONS_RESERVE_ADDRESS)
      const optionsContract = new web3.eth.Contract(OptionsContractsABI, OPTIONS_CONTRACTS_ADDRESS)
      const balanceOf = await optionsContract.methods.balanceOf(account.address).call()

      if(balanceOf === 0) {
        return emitter.emit(OPTIONS_RETURNED)
      }

      var arr = Array.from(Array(parseInt(balanceOf)).keys());

      async.map(arr, async (index, callback) => {
        try {
          const tokenIndex = await optionsContract.methods.tokenOfOwnerByIndex(account.address, index).call({ from: account.address })
          let option = await optionsReserveContract.methods.options(tokenIndex).call({ from: account.address })
          option.index = tokenIndex

          let optionAsset = assets.filter((asset) => {
            return asset.address === option.asset
          })

          if(optionAsset && optionAsset.length > 0) {
            option.asset = optionAsset[0]
          } else {
            optionAsset = {
              symbol: 'Unknown',
              decimals: 18,
              address: option.asset
            }
          }

          if(callback) {
            callback(null, option)
          } else {
            return option
          }
        } catch (ex) {
          console.log(ex)
          if(callback) {
            callback(null, null)
          } else {
            return null
          }
        }
      }, (err, data) => {
        if(err) {
          console.log(err)
          return emitter.emit(ERROR, err)
        }

        store.setStore({ options: data })
        emitter.emit(OPTIONS_RETURNED, data)
      })
    } catch (ex) {
      console.log(ex)
      emitter.emit(ERROR, ex)
    }
  }

  getOptionsFees = async (payload) => {
    try {
      const account = store.getStore('account')
      const assets = store.getStore('assets')

      if(!account || !account.address) {
        return false
      }

      const web3 = await this._getWeb3Provider()

      const {
        asset,
        assetAmount,
      } = payload.content

      const selectedAssetArr = assets.filter((theAsset) => {
        return theAsset.symbol === asset
      })

      const selectedAsset = selectedAssetArr[0]

      const optionsReserveContract = new web3.eth.Contract(OptionsReserveABI, OPTIONS_RESERVE_ADDRESS)
      const amount = Big(assetAmount).times(Big(10).pow(parseInt(selectedAsset.decimals)))
      const cost = await optionsReserveContract.methods.cost(selectedAsset.address, amount.toFixed(0)).call({ from: account.address });
      const fees = await optionsReserveContract.methods.fees(selectedAsset.address, cost).call({ from: account.address });

      let returnFees = fees/10**selectedAsset.decimals

      return emitter.emit(OPTIONS_FEES_RETURNED, returnFees)

    } catch(ex) {
      console.log(ex)
      return emitter.emit(OPTIONS_FEES_RETURNED, null)
    }
  }

  createOption = async (payload) => {
    try {
      const account = store.getStore('account')
      const assets = store.getStore('assets')

      if(!account || !account.address) {
        return false
      }

      const web3 = await this._getWeb3Provider()

      const {
        asset,
        assetAmount,
        optionType,
        fees
      } = payload.content

      const selectedAssetArr = assets.filter((theAsset) => {
        return theAsset.symbol === asset
      })

      const selectedAsset = selectedAssetArr[0]
      const quoteAsset = store.getStore('quoteAsset')

      console.log(quoteAsset, account, fees, OPTIONS_RESERVE_ADDRESS)

      this._checkApproval(quoteAsset, account, fees, OPTIONS_RESERVE_ADDRESS, (err) => {
        if(err) {
          return emitter.emit(ERROR, err);
        }

        this._callCreate(web3, account, assetAmount, optionType, selectedAsset, (err, data) => {
          if(err) {
            return emitter.emit(ERROR, err);
          }

          return emitter.emit(CREATE_OPTION_RETURNED, data)
        })
      })

    } catch(ex) {
      console.log(ex)
      return emitter.emit(CREATE_OPTION_RETURNED)
    }
  }

  _checkApproval = async (asset, account, amount, contract, callback) => {

    if(asset.address === 'Ethereum') {
      return callback()
    }

    try {
      const web3 = await this._getWeb3Provider()
      const erc20Contract = new web3.eth.Contract(ERC20ABI, asset.address)

      const allowance = await erc20Contract.methods.allowance(account.address, contract).call({ from: account.address })

      const ethAllowance = web3.utils.fromWei(allowance, "ether")

      if(parseFloat(ethAllowance) < parseFloat(amount)) {
        await erc20Contract.methods.approve(contract, web3.utils.toWei('999999999999', "ether")).send({ from: account.address, gasPrice: web3.utils.toWei(await this._getGasPrice(), 'gwei') })
        callback()
      } else {
        callback()
      }
    } catch(error) {
      if(error.message) {
        return callback(error.message)
      }
      callback(error)
    }
  }

  _callCreate = async (web3, account, assetAmount, optionType, selectedAsset, callback) => {

    const optionsReserveContract = new web3.eth.Contract(OptionsReserveABI, OPTIONS_RESERVE_ADDRESS)

    const amount = Big(assetAmount).times(Big(10).pow(parseInt(selectedAsset.decimals)))

    console.log(selectedAsset.address, amount.toFixed(0), optionType.toFixed(0))
    optionsReserveContract.methods.createOption(selectedAsset.address, amount.toFixed(0), optionType.toFixed(0)).send({ from: account.address, gasPrice: web3.utils.toWei(await this._getGasPrice(), 'gwei') })
    .on('transactionHash', function(hash){
      console.log(hash)
      callback(null, hash)
    })
    .on('confirmation', function(confirmationNumber, receipt){
      console.log(confirmationNumber, receipt);
      if(confirmationNumber === 2) {
        dispatcher.dispatch({ type: GET_OPTIONS })
      }
    })
    .on('receipt', function(receipt){
      console.log(receipt);
    })
    .on('error', function(error) {
      console.log(error);
      if (!error.toString().includes("-32601")) {
        if(error.message) {
          return callback(error.message)
        }
        callback(error)
      }
    })
  }

  _getGasPrice = async () => {
    try {
      const url = 'https://gasprice.poa.network/'
      const priceString = await rp(url);
      const priceJSON = JSON.parse(priceString)
      if(priceJSON) {
        return priceJSON.fast.toFixed(0)
      }
      return store.getStore('universalGasPrice')
    } catch(e) {
      console.log(e)
      return store.getStore('universalGasPrice')
    }
  }

  _getWeb3Provider = async () => {
    const web3context = store.getStore('web3context')
    if(!web3context) {
      return null
    }
    const provider = web3context.library.provider
    if(!provider) {
      return null
    }

    const web3 = new Web3(provider);

    return web3
  }
}

var store = new Store();

export default {
  store: store,
  dispatcher: dispatcher,
  emitter: emitter
};
