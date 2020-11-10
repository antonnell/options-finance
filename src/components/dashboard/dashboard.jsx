import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import {
  Typography,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button
} from '@material-ui/core';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';

import { colors } from '../../theme'
import * as moment from 'moment';

import Loader from '../loader'
import Snackbar from '../snackbar'

import {
  ETHERSCAN_URL,
  ADDRESS,
  ERROR,
  CONNECTION_CONNECTED,
  CONNECTION_DISCONNECTED,
  CONFIGURE_RETURNED,
  GET_BALANCES,
  BALANCES_RETURNED,
  GET_OPTIONS,
  OPTIONS_RETURNED,
  GET_OPTIONS_FEES,
  OPTIONS_FEES_RETURNED,
  CREATE_OPTION,
  CREATE_OPTION_RETURNED
} from '../../constants'

import Store from "../../stores";
const emitter = Store.emitter
const dispatcher = Store.dispatcher
const store = Store.store

const styles = theme => ({
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '1200px',
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center'
  },
  investedContainerLoggedOut: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '100%',
    marginTop: '40px',
    [theme.breakpoints.up('md')]: {
      minWidth: '900px',
    }
  },
  investedContainer: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: '100%',
    marginTop: '40px',
    [theme.breakpoints.up('md')]: {
      minWidth: '900px',
    }
  },
  disaclaimer: {
    padding: '12px',
    border: '1px solid rgb(174, 174, 174)',
    borderRadius: '0.75rem',
    marginBottom: '24px',
    background: colors.white
  },
  optionsContainer: {
    padding: '28px 30px',
    borderRadius: '50px',
    border: '1px solid '+colors.borderBlue,
    background: colors.white,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    marginBottom: '40px'
  },
  optionsHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionHeading: {
    color: colors.darkGray
  },
  defaultColor: {
    color: colors.text
  },
  optionsCreateContainer: {
    padding: '28px 30px',
    borderRadius: '50px',
    border: '1px solid '+colors.borderBlue,
    background: colors.white,
    display: 'flex',
    flexWrap: 'wrap',
    width: '100%',
  },

  flexy: {
    width: '100%',
    display: 'flex'
  },
  label: {
    flex: 1,
    paddingLeft: '12px',
    paddingBottom: '6px',
  },
  valContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    marginTop: '24px'
  },
  balances: {
    textAlign: 'right',
    paddingRight: '20px',
    cursor: 'pointer'
  },
  assetSelectMenu: {
    padding: '15px 15px 15px 20px',
    minWidth: '300px',
    display: 'flex'
  },
  assetSelectIcon: {
    display: 'inline-block',
    verticalAlign: 'middle',
    borderRadius: '25px',
    background: '#dedede',
    height: '30px',
    width: '30px',
    textAlign: 'center',
    cursor: 'pointer'
  },
  assetSelectIconName: {
    paddingLeft: '10px',
    display: 'inline-block',
    verticalAlign: 'middle',
    flex: 1
  },
  assetSelectBalance: {
    paddingLeft: '24px'
  },
  assetAdornment: {
    color: colors.text + ' !important'
  },
  assetContainer: {
    minWidth: '120px'
  },
  assetContainerPadded: {
    minWidth: '120px',
    padding: '9px'
  },
  buttonGroup: {
    width: 'fit-content'
  },
  actionButton: {
    height: '47px',
    marginTop: '40px'
  },
  optionsText: {
    marginTop: '40px',
    background: '#dedede',
    borderRadius: '40px',
    width: '100%',
    padding: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionsTypography: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  addPadding: {
    paddingRight: '6px'
  }
});

class Dashboard extends Component {

  constructor(props) {
    super()

    const account = store.getStore('account')
    const assets = store.getStore('assets')
    const quoteAsset = store.getStore('quoteAsset')
    const options = store.getStore('options')

    this.state = {
      snackbarType: null,
      snackbarMessage: null,

      assets: assets,
      account: account,
      options: options,
      quoteAsset: quoteAsset,
      loading: true,
      tabValue: 0,
      page: 0,
      rowsPerPage: 5,

      optionFees: null,

      optionType: 1,
      asset: '',
      assetError: null,
      assetAmount: '',
      assetAmountError: null,
      strikePrice: '',
      strikePriceError: null,
      holdingPeriod: 0,
      holdingPeriodError: null,
      holdingPeriodOptions: [
        { value: 0, description: '1 day' },
        { value: 1, description: '1 week' },
        { value: 2, description: '2 weeks' },
        { value: 3, description: '3 weeks' },
        { value: 4, description: '4 weeks' }
      ]
    }

    if(account && account.address) {
      dispatcher.dispatch({ type: GET_BALANCES, content: {} })
      dispatcher.dispatch({ type: GET_OPTIONS, content: {} })
    }
  }

  componentWillMount() {
    emitter.on(ERROR, this.errorReturned);
    emitter.on(CONFIGURE_RETURNED, this.configureReturned);
    emitter.on(BALANCES_RETURNED, this.balancesReturned);
    emitter.on(OPTIONS_RETURNED, this.optionsReturned);
    emitter.on(OPTIONS_FEES_RETURNED, this.optionsFeesReturned);
    emitter.on(CREATE_OPTION_RETURNED, this.createOptionReturned);
  }

  componentWillUnmount() {
    emitter.removeListener(ERROR, this.errorReturned);
    emitter.removeListener(CONFIGURE_RETURNED, this.configureReturned);
    emitter.removeListener(BALANCES_RETURNED, this.balancesReturned);
    emitter.removeListener(OPTIONS_RETURNED, this.optionsReturned);
    emitter.removeListener(OPTIONS_FEES_RETURNED, this.optionsFeesReturned);
    emitter.removeListener(CREATE_OPTION_RETURNED, this.createOptionReturned);
  };

  errorReturned = (error) => {
    const snackbarObj = { snackbarMessage: null, snackbarType: null }
    this.setState(snackbarObj)
    this.setState({ loading: false })
    const that = this
    setTimeout(() => {
      const snackbarObj = { snackbarMessage: error.toString(), snackbarType: 'Error' }
      that.setState(snackbarObj)
    })
  };

  createOptionReturned = (txHash) => {
    const snackbarObj = { snackbarMessage: null, snackbarType: null }
    this.setState(snackbarObj)
    this.setState({
      loading: false,
      strikePrice: '',
      assetAmount: '',
      holdingPeriod: 0
    })

    const that = this
    setTimeout(() => {
      const snackbarObj = { snackbarMessage: txHash, snackbarType: 'Hash' }
      that.setState(snackbarObj)
    })
  };

  optionsFeesReturned = (optionFees) => {
    this.setState({
      loading: false,
      optionFees: optionFees
    })
  }

  balancesReturned = () => {
    this.setState({
      loading: false,
      assets: store.getStore('assets')
    })
  }

  optionsReturned = () => {
    this.setState({
      loading: false,
      options: store.getStore('options')
    })
  }

  configureReturned = () => {
    const account = store.getStore('account')
    const assets = store.getStore('assets')
    let asset = this.state.asset

    if(assets && assets.length > 0) {
      asset = assets[0].symbol
    }

    this.setState({
      loading: true,
      account: account,
      assets: assets,
      asset: asset
    })

    // dispatcher.dispatch({ type: GET_BALANCES, content: {} })
    dispatcher.dispatch({ type: GET_OPTIONS, content: {} })
  };

  render() {
    const { classes } = this.props;
    const {
      loading,
      assets,
      account,
      tabValue,
      options,
      snackbarMessage
    } = this.state

    if(!account || !account.address) {
      return (
        <div className={ classes.root }>
          <div className={ classes.investedContainerLoggedOut }>
          <Typography variant={'h5'} className={ classes.disaclaimer }>This project is in beta. Use at your own risk.</Typography>
            <div className={ classes.introCenter }>
              <Typography variant='h3'>Connect your wallet to continue</Typography>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className={ classes.root }>
        <div className={ classes.investedContainer}>
          <div className={ classes.optionsContainer }>
            <div className={ classes.optionsHeader} >
              <Typography variant={ 'h3' } className={ classes.sectionHeading }>Your Options</Typography>
              <ToggleButtonGroup value={ tabValue } onChange={this.onTabChange} aria-label="State" exclusive size={ 'small' }>
                <ToggleButton value={0} aria-label="Put">
                  <Typography variant={ 'h4' }>Active</Typography>
                </ToggleButton>
                <ToggleButton value={1} aria-label="Call">
                  <Typography variant={ 'h4' }>Closed</Typography>
                </ToggleButton>
              </ToggleButtonGroup>
            </div>
            { this.renderOptionsTable() }
          </div>
          { this.renderOptionCreate() }
        </div>
        { loading && <Loader /> }
        { snackbarMessage && this.renderSnackbar() }
      </div>
    )
  };

  renderSnackbar = () => {
    var {
      snackbarType,
      snackbarMessage
    } = this.state
    return <Snackbar type={ snackbarType } message={ snackbarMessage } open={true}/>
  };

  renderOptionCreate = () => {
    const { classes } = this.props
    const {
      amount,
      asset,
      currentPrice,
      type,
      strikePrice,
      premium,
      breakEven
    } = this.state


    return (
      <div className={ classes.optionsCreateContainer }>
        <Typography variant={ 'h3' } className={ classes.sectionHeading }>Create Option</Typography>
        { this.renderOptionType() }
        { this.renderAssetInput() }
        { this.renderStrikePrice() }
        { this.renderHoldingPeriod() }
        { this.renderOptionText() }
        { this.renderActionButton() }
      </div>
    )
  }

  renderOptionText = () => {
    const { classes } = this.props
    const {
      quoteAsset,
      optionType,
      asset,
      assetAmount,
      strikePrice,
      holdingPeriod,
      optionFees,
    } = this.state


    return (
      <div className={ classes.optionsText }>
        <div className={ classes.optionsTypography }>
          <Typography variant='h4' className={ classes.addPadding } >I have </Typography>
          <Typography variant='h3' className={ classes.addPadding }>{ assetAmount ? assetAmount : '<Option Size>' } { asset } </Typography>
          <Typography variant='h4' className={ classes.addPadding }>and I think the price will go { this.mapOptionTypeToText(optionType) }</Typography>
          <Typography variant='h3' className={ classes.addPadding }>{ strikePrice ? strikePrice : '<Strike Price>' } { quoteAsset.symbol } </Typography>
          <Typography variant='h4' className={ classes.addPadding }>within the next </Typography>
          <Typography variant='h3' className={ classes.addPadding }>{ holdingPeriod !== null ? this.mapHoldingPeriodToText(holdingPeriod) : '<Holding Period>' }. </Typography>
          <Typography variant='h4' className={ classes.addPadding }>This will cost me </Typography>
          <Typography variant='h3' className={ classes.addPadding }>{ optionFees ? optionFees.total.toFixed(4) : '<Total Fees>' } { quoteAsset.symbol } </Typography>
        </div>
      </div>

    )

    return (
      <div className={ classes.optionsText }>
        <Typography variant='h3'>
          {
            `I have ${assetAmount ? assetAmount : '<Option Size>'} ${ asset ? asset : '<Option Size>' } and I think the price will go ${ this.mapOptionTypeToText(optionType) } ${ strikePrice ? strikePrice : '<Strike Price>' } ${ quoteAsset.symbol } within the next ${ holdingPeriod !== null ? this.mapHoldingPeriodToText(holdingPeriod) : '<Holding Period>' }. This will cost me ${ optionFees ? optionFees.total.toFixed(4) : '<Total Fees>' } ${ quoteAsset.symbol }`
          }
        </Typography>
      </div>
    )
  }

  mapHoldingPeriodToText = (period) => {
    const { holdingPeriodOptions } = this.state

    return holdingPeriodOptions.filter((option) => {
      return option.value === period
    })[0].description

  }

  mapOptionTypeToText = (type) => {
    switch (type) {
      case 1:
        return 'down to below '
      case 2:
        return 'up to above '
      default:
        return 'down to below '
    }
  }

  mapOptionTypeV2toText = (type) => {
    switch (type) {
      case 1:
        return 'dips below '
      case 2:
        return 'up to above '
      default:
        return 'down to below '
    }
  }

  renderOptionType = () => {

    const { classes } = this.props
    const { optionType } = this.state

    return (
      <div className={ classes.valContainer }>
        <div className={ classes.flexy }>
          <div className={ classes.label }>
            <Typography variant='h4'>
              Option Type
            </Typography>
          </div>
        </div>
        <div>
          <ToggleButtonGroup value={ optionType } onChange={this.onOptionTypeChange} aria-label="Option Type" exclusive size={ 'small' } className={ classes.buttonGroup }>
            <ToggleButton value={1} aria-label="Put">
              <Typography variant={ 'h4' }>Put</Typography>
            </ToggleButton>
            <ToggleButton value={2} aria-label="Call">
              <Typography variant={ 'h4' }>Call</Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
      </div>
    )

  }

  renderStrikePrice = () => {
    const {
      classes
    } = this.props

    const {
      loading,
      quoteAsset,
      assets,
      asset,
      strikePrice,
      strikePriceError,
      currentPrice,
      currentPriceError,
    } = this.state

    let selectedAsset = null

    const selectedAssetArr = assets.filter((as) => {
      return as.symbol === asset
    })
    if(selectedAssetArr && selectedAssetArr.length > 0) {
      selectedAsset = selectedAssetArr[0]
    }

    return (
      <div className={ classes.valContainer }>
        <div className={ classes.flexy }>
          <div className={ classes.label }>
            <Typography variant='h4'>
              Strike price
            </Typography>
          </div>
        </div>
        <div>
          <TextField
            fullWidth
            disabled={ loading }
            className={ classes.actionInput }
            id={ 'strikePrice' }
            value={ strikePrice }
            error={ strikePriceError }
            onChange={ this.onChange }
            placeholder={ selectedAsset ? selectedAsset.price : '0.00' }
            variant="outlined"
            helperText={`Current price: $${ selectedAsset ? selectedAsset.price : '0.00' }`}
            InputProps={{
              startAdornment: <div className={ classes.assetContainerPadded }>
                <div className={ classes.assetSelectIcon }>
                  <img
                    alt=""
                    src={ require('../../assets/tokens/'+quoteAsset.symbol+'-logo.png') }
                    height="30px"
                  />
                </div>
                <div className={ classes.assetSelectIconName }>
                  <Typography variant='h4'>{ quoteAsset.symbol }</Typography>
                </div>
              </div>
            }}
          />
        </div>
      </div>
    )
  }

  renderHoldingPeriod = () => {
    const { classes } = this.props
    const {
      holdingPeriodOptions,
      holdingPeriod,
      holdingPeriodError,
      loading
    } = this.state

    return (
      <div className={ classes.valContainer }>
        <div className={ classes.flexy }>
          <div className={ classes.label }>
            <Typography variant='h4'>
              Holding Period
            </Typography>
          </div>
        </div>
        <div>
          <TextField
            id={ 'holdingPeriod' }
            name={ 'holdingPeriod' }
            select
            value={ holdingPeriod }
            onChange={ this.onSelectChange }
            SelectProps={{
              native: false
            }}
            fullWidth
            disabled={ loading }
            placeholder={ 'Select' }
            className={ classes.assetSelectRoot }
            variant="outlined"
          >
            { holdingPeriodOptions ? holdingPeriodOptions.map((option) => { return this.renderholdingPeriodOption(option) }) : null }
          </TextField>
        </div>
      </div>
    )
  }

  renderholdingPeriodOption = (option) => {
    const { classes } = this.props

    return (
      <MenuItem key={option.value} value={option.value} className={ classes.assetSelectMenu }>
        <Typography variant='h4'>{ option.description }</Typography>
      </MenuItem>
    )
  }

  renderActionButton = () => {
    const { classes } = this.props
    const { loading, strikePrice, assetAmount } = this.state

    return (
      <Button
        className={ classes.actionButton }
        variant="outlined"
        color="primary"
        disabled={ loading || !strikePrice || !assetAmount }
        onClick={ this.onCreateOption }
        fullWidth
        >
        <Typography className={ classes.buttonText } variant={ 'h5'}>Create Option</Typography>
      </Button>
    )
  }

  onCreateOption = () => {
    const {
      holdingPeriod,
      asset,
      assetAmount,
      strikePrice,
      optionType,
      optionFees,
    } = this.state

    if(asset && asset !== '' &&
      assetAmount && assetAmount !== '' && !isNaN(assetAmount) &&
      strikePrice && strikePrice !== '' && !isNaN(assetAmount)) {

      this.setState({ loading: true })
      dispatcher.dispatch({ type: CREATE_OPTION, content: { holdingPeriod, asset, assetAmount, strikePrice, optionType, fees: optionFees }})
    }
  }

  renderOptionsTable = () => {

    const { classes } = this.props
    const { options, page, rowsPerPage, tabValue } = this.state

    return (
      <React.Fragment>
        <TableContainer>
          <Table className={classes.table} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Asset</TableCell>
                <TableCell>Holder</TableCell>
                <TableCell align="right">Type</TableCell>
                <TableCell align="right">State</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Strike</TableCell>
                <TableCell align="right">Locked</TableCell>
                <TableCell align="right">Premium</TableCell>
                <TableCell align="right">Expires</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              { this.renderOptions() }
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={ options ? options.filter((option) => {
            if(!option) {
              return false
            }

            if(tabValue === 0) {
              return option.state === '1'
            } else if (tabValue === 1) {
              return option.state !== '1'
            } else {
              return false
            }
          }).length : 0 }
          rowsPerPage={ rowsPerPage }
          page={ page }
          onChangePage={ this.handleChangePage }
          onChangeRowsPerPage={ this.handleChangeRowsPerPage }
        />
      </React.Fragment>
    )
  }

  handleChangePage = (event, newPage) => {
    this.setState({ page: newPage })
  };

  handleChangeRowsPerPage = (event) => {
    this.setState({ rowsPerPage: parseInt(event.target.value, 10), page: 0 })
  };

  renderOptions = () => {
    const { classes } = this.props
    const {
      tabValue,
      options
    } = this.state

    if(!options || options.length === 0) {
      return <TableRow className={ classes.optionRow } key={'No'}>
        <TableCell colSpan={8} align="center">
          <Typography>There are no options here</Typography>
        </TableCell>
      </TableRow>
    }

    return options.filter((option) => {
      if(!option) {
        return false
      }

      if(tabValue === 0) {
        return option.state === '1'
      } else if (tabValue === 1) {
        return option.state !== '1'
      } else {
        return false
      }
    }).map((option) => {

      let address = null;
      if (option.holder) {
        address = option.holder.substring(0,6)+'...'+option.holder.substring(option.holder.length-4,option.holder.length)
      }

      return (
        <TableRow className={ classes.optionRow } key={option.index}>
          <TableCell><Typography variant='h4'>{ option.symbol }</Typography></TableCell>
          <TableCell><Typography variant='h4'><a className={ classes.defaultColor } href={ETHERSCAN_URL+ADDRESS+option.holder} target='blank'>{ address }</a></Typography></TableCell>
          <TableCell align="right"><Typography variant='h4'>{ this.mapTypeToString(option.optionType) }</Typography></TableCell>
          <TableCell align="right"><Typography variant='h4'>{ this.mapStateToString(option.state) }</Typography></TableCell>
          <TableCell align="right"><Typography variant='h4'>{ option.amount ? (option.amount/1e18).toFixed(4) : '0' }</Typography></TableCell>
          <TableCell align="right"><Typography variant='h4'>{ option.strike ? (option.strike/1e18).toFixed(4) : '0' }</Typography></TableCell>
          <TableCell align="right"><Typography variant='h4'>{ option.lockedAmount ? (option.lockedAmount/1e18).toFixed(4) : '0' }</Typography></TableCell>
          <TableCell align="right"><Typography variant='h4'>{ option.premium ? (option.premium/1e18).toFixed(4) : '0' }</Typography></TableCell>
          <TableCell align="right"><Typography variant='h4'>{ option.expiration ? moment(option.expiration*1e3).format("YYYY/MM/DD kk:mm") : '' }</Typography></TableCell>
        </TableRow>
      )
    })
  }

  renderAssetInput = () => {
    const {
      classes
    } = this.props

    const {
      loading,
      asset,
      assetError,
      assetAmount,
      assetAmountError
    } = this.state

    return (
      <div className={ classes.valContainer }>
        <div className={ classes.flexy }>
          <div className={ classes.label }>
            <Typography variant='h4'>
              Option size
            </Typography>
          </div>
        </div>
        <div>
          <TextField
            fullWidth
            disabled={ loading }
            className={ classes.actionInput }
            id={ 'assetAmount' }
            value={ assetAmount }
            error={ assetAmountError }
            onChange={ this.onChange }
            placeholder="0.00"
            variant="outlined"
            InputProps={{
              startAdornment: <div className={ classes.assetContainer }>{ this.renderAssetSelect() }</div>,
            }}
          />
        </div>
      </div>
    )
  }

  renderAssetSelect = () => {
    const { loading, assets, asset } = this.state
    const { classes } = this.props

    return (
      <TextField
        id={ 'asset' }
        name={ 'asset' }
        select
        value={ asset }
        onChange={ this.onSelectChange }
        SelectProps={{
          native: false,
          renderValue: (option) => {
            return (
              <React.Fragment>
                <div className={ classes.assetSelectIcon }>
                  <img
                    alt=""
                    src={ require('../../assets/tokens/'+option+'-logo.png') }
                    height="30px"
                  />
                </div>
                <div className={ classes.assetSelectIconName }>
                  <Typography variant='h4'>{ option }</Typography>
                </div>
              </React.Fragment>
            )
          }
        }}
        fullWidth
        disabled={ loading }
        placeholder={ 'Select' }
        className={ classes.assetSelectRoot }
      >
        { assets ? assets.map((theAsset) => { return this.renderAssetOption(theAsset) }) : null }
      </TextField>
    )
  }

  renderAssetOption = (option) => {
    const { classes } = this.props

    return (
      <MenuItem key={option.symbol} value={option.symbol} className={ classes.assetSelectMenu }>
        <React.Fragment>
          <div className={ classes.assetSelectIcon }>
            <img
              alt=""
              src={ require('../../assets/tokens/'+option.symbol+'-logo.png') }
              height="30px"
            />
          </div>
          <div className={ classes.assetSelectIconName }>
            <Typography variant='h4'>{ option.symbol }</Typography>
          </div>
          <div className={ classes.assetSelectBalance }>
            <Typography variant='h4'>{ option.balance ? option.balance.toFixed(2) : '0.00' } { option.symbol }</Typography>
          </div>
        </React.Fragment>
      </MenuItem>
    )
  }

  onChange = (event) => {
    let val = []
    val[event.target.id] = event.target.value
    this.setState(val)

    const that = this
    window.setTimeout(() => {
      that.getFees()
    }, 200)
  }

  onSelectChange = (event) => {
    let val = []
    val[event.target.name] = event.target.value
    this.setState(val)

    const that = this
    window.setTimeout(() => {
      that.getFees()
    }, 200)
  }

  onTabChange = (event, newValue) => {
    this.setState({ tabValue: newValue })
  }

  onOptionTypeChange = (event, newValue) => {
    this.setState({ optionType: newValue })

    const that = this
    window.setTimeout(() => {
      that.getFees()
    }, 200)
  }

  mapTypeToString = (state) => {
    switch (state) {
      case '0':
        return 'Invalid'
      case '1':
        return 'Put'
      case '2':
        return 'Call'
      default:
        return 'Invalid'
    }
  }

  mapStateToString = (state) => {
    switch (state) {
      case '0':
        return 'Inactive'
      case '1':
        return 'Active'
      case '2':
        return 'Exercised'
      case '3':
        return 'Expired'
      default:
        return 'Inactive'
    }
  }


  getFees = () => {
    const {
      holdingPeriod,
      asset,
      assetAmount,
      strikePrice,
      optionType,
    } = this.state

    if(asset && asset !== '' &&
      assetAmount && assetAmount !== '' && !isNaN(assetAmount) &&
      strikePrice && strikePrice !== '' && !isNaN(assetAmount)) {

      dispatcher.dispatch({ type: GET_OPTIONS_FEES, content: { holdingPeriod, asset, assetAmount, strikePrice, optionType }})
    }
  }
}

  export default withRouter(withStyles(styles)(Dashboard));
