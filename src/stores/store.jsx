import async from 'async';
import {
  HEGIC_OPTIONS_FACTORY_ADDRESS,
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
import { HegicOptionsABI } from './abi/hegicOptionsABI'
import { HegicOptionsFactoryABI } from './abi/hegicOptionsFactoryABI'

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
      assets: [],
      quoteAsset: {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        symbol: 'DAI',
        balance: 0,
        decimals: 18
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

    const allOptionsAssets = await this._callAll(web3, account)

    async.map(allOptionsAssets, async (asset, callback) => {
      const optionsContractAddress = await this._callAssetMap(web3, account, asset)
      const assetPrice = await this._callPrice(web3, account, asset, optionsContractAddress)
      const assetDetails = await this._getAssetDetails(web3, account, asset)

      const returnAsset = {
        address: asset,
        decimals: assetDetails.decimals,
        symbol: assetDetails.symbol,
        balance: assetDetails.balance,
        price: assetPrice/(10**assetDetails.decimals),
        optionsContractAddress: optionsContractAddress
      }

      if(callback) {
        callback(null, returnAsset)
      } else {
        return returnAsset
      }
    }, (err, data) => {
      if(err) {
        return emitter.emit(ERROR, err)
      }

      store.setStore({ assets: data })
      return emitter.emit(CONFIGURE_RETURNED)
    })
  }

  _callAll = async (web3, account) => {
    try {
      const hegicOptionsFactoryContract = new web3.eth.Contract(HegicOptionsFactoryABI, HEGIC_OPTIONS_FACTORY_ADDRESS)

      const allOptions = await hegicOptionsFactoryContract.methods.all().call({ from: account.address });

      return allOptions
    } catch (ex) {
      return null
    }
  }

  _callAssetMap = async (web3, account, asset) => {
    try {
      const hegicOptionsFactoryContract = new web3.eth.Contract(HegicOptionsFactoryABI, HEGIC_OPTIONS_FACTORY_ADDRESS)

      const assetMap = await hegicOptionsFactoryContract.methods.assetMap(asset).call({ from: account.address });

      return assetMap
    } catch (ex) {
      return null
    }
  }

  _callPrice = async (web3, account, asset, optionsContractAddress) => {
    try {
      const hegicOptionsContract = new web3.eth.Contract(HegicOptionsABI, optionsContractAddress)

      const price = await hegicOptionsContract.methods.price().call({ from: account.address });
      return price
    } catch (ex) {
      console.log(ex)
      return null
    }
  }

  _getAssetDetails = async (web3, account, asset) => {
    try {
      const erc20Contract = new web3.eth.Contract(ERC20ABI, asset)

      const decimals = await erc20Contract.methods.decimals().call({ from: account.address });
      const balanceOf = await erc20Contract.methods.balanceOf(account.address).call({ from: account.address });
      const balance = parseFloat(balanceOf)/10**decimals

      const symbol = await erc20Contract.methods.symbol().call({ from: account.address });

      return {
        decimals,
        balance,
        symbol
      }
    } catch (ex) {
      return null
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

    if(!account || !account.address || !assets || assets.length === 0) {
      return false
    }

    const web3 = await this._getWeb3Provider()

    async.map(assets, (asset, assetCallback) => {
      try {

        const hegicOptionsContract = new web3.eth.Contract(HegicOptionsABI, asset.optionsContractAddress)

        this._getUserOptionsLength(hegicOptionsContract, account, (err, userOptionsLength) => {
          const arr = Array.from(Array(parseInt(userOptionsLength)).keys())

          async.map(arr, (index, callback) => {
            this._getOption(web3, account, asset, index, (err, optionData) => {
              if(callback) {
                callback(null, optionData)
              } else {
                return optionData
              }
            })
          }, (err, options) => {
            if(err) {
              return null
            }

            if(assetCallback) {
              assetCallback(null, options)
            } else {
              return options
            }
          })
        })
      } catch(ex) {
        console.log(ex)

        if(assetCallback) {
          assetCallback(ex)
        } else {
          throw ex
        }
      }

    }, (err, allAssets) => {
      if(err) {
        return emitter.emit(ERROR, err)
      }

      const flattenedOptions = allAssets.flat()

      store.setStore({ options: flattenedOptions })
      return emitter.emit(OPTIONS_RETURNED, flattenedOptions)
    })
  }

  _getOption = async (web3, account, asset, index, callback) => {
    try {
      const hegicOptionsContract = new web3.eth.Contract(HegicOptionsABI, asset.optionsContractAddress)

      const optionsIndex = await hegicOptionsContract.methods.optionsIndexes(account.address, index).call({ from: account.address })
      let option = await hegicOptionsContract.methods.options(optionsIndex).call({ from: account.address });

      option.index = optionsIndex
      option.symbol = asset.symbol

      if(callback) {
        callback(null, option)
      } else {
        return option
      }
    } catch(ex) {
      console.log(ex)
      callback(ex)
    }
  }

  _getUserOptionsLength = async (hegicOptionsContract, account, callback) => {
    const userOptionsLength = await hegicOptionsContract.methods.userOptionsLength(account.address).call({ from: account.address })
    if(callback) {
      callback(null, userOptionsLength)
    } else {
      return userOptionsLength
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
        strikePrice,
        holdingPeriod,
        optionType
      } = payload.content

      const selectedAssetArr = assets.filter((theAsset) => {
        return theAsset.symbol === asset
      })

      const selectedAsset = selectedAssetArr[0]

      const hegicOptionsContract = new web3.eth.Contract(HegicOptionsABI, selectedAsset.optionsContractAddress)

      let period = 86400
      switch (holdingPeriod) {
        case 0:
          period = 86400
          break;
        case 1:
          period = 86400*7
          break;
        case 2:
          period = 86400*14
          break;
        case 3:
          period = 86400*21
          break;
        case 4:
          period = 86400*28
          break;
        default:
      }

      const amount = Big(assetAmount).times(Big(10).pow(18))
      const strike = Big(strikePrice).times(Big(10).pow(18))

      const fees = await hegicOptionsContract.methods.fees(period.toFixed(0), amount.toFixed(0), strike.toFixed(0), optionType.toFixed(0)).call({ from: account.address });

      let returnFees = {
        total: fees.total/10**selectedAsset.decimals,
        periodFee: fees.periodFee/10**selectedAsset.decimals,
        settlementFee: fees.settlementFee/10**selectedAsset.decimals,
        strikeFee: fees.strikeFee/10**selectedAsset.decimals
      }

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
        strikePrice,
        holdingPeriod,
        optionType,
        fees
      } = payload.content

      const selectedAssetArr = assets.filter((theAsset) => {
        return theAsset.symbol === asset
      })

      const selectedAsset = selectedAssetArr[0]
      const quoteAsset = store.getStore('quoteAsset')

      this._checkApproval(quoteAsset, account, fees.total, selectedAsset.optionsContractAddress, (err) => {
        if(err) {
          return emitter.emit(ERROR, err);
        }

        this._callCreate(web3, account, asset, assetAmount, strikePrice, holdingPeriod, optionType, selectedAsset, (err, data) => {
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

  _callCreate = async (web3, account, asset, assetAmount, strikePrice, holdingPeriod, optionType, selectedAsset, callback) => {

    const quoteAsset = store.getStore('quoteAsset')

    const hegicOptionsContract = new web3.eth.Contract(HegicOptionsABI, selectedAsset.optionsContractAddress)

    let period = 86400
    switch (holdingPeriod) {
      case 0:
        period = 86400
        break;
      case 1:
        period = 86400*7
        break;
      case 2:
        period = 86400*14
        break;
      case 3:
        period = 86400*21
        break;
      case 4:
        period = 86400*28
        break;
      default:
    }

    const amount = Big(assetAmount).times(Big(10).pow(18))
    const strike = Big(strikePrice).times(Big(10).pow(18))

    const fees = await hegicOptionsContract.methods.fees(period.toFixed(0), amount.toFixed(0), strike.toFixed(0), optionType.toFixed(0)).call({ from: account.address });

    hegicOptionsContract.methods.create(quoteAsset.address, period.toFixed(0), amount.toFixed(0), strike.toFixed(0), Big(fees.total).times(10).toFixed(0), optionType.toFixed(0)).send({ from: account.address, gasPrice: web3.utils.toWei(await this._getGasPrice(), 'gwei') })
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
