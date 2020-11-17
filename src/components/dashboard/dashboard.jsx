import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { withStyles } from '@material-ui/core/styles';
import {
  Typography,
  TextField,
  MenuItem,
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

import TrendingUpIcon from '@material-ui/icons/TrendingUp';
import TrendingDownIcon from '@material-ui/icons/TrendingDown';

import { colors } from '../../theme'
import * as moment from 'moment';

import Loader from '../loader'
import Snackbar from '../snackbar'

import {
  ERROR,
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
    color: colors.darkGray,
    flex: '1'
  },
  sectionHeadingOptions: {
    color: colors.darkGray,
    minWidth: '100%'
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
    flex: '1',
    marginTop: '24px'
  },
  balances: {
    textAlign: 'right',
    paddingRight: '20px',
    cursor: 'pointer'
  },
  assetSelectMenu: {
    padding: '15px 15px 15px 20px',
    minWidth: '400px',
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
    width: 'fit-content',
    height: '47px'
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
  },
  divider: {
    minWidth: '100%'
  },
  between: {
    width: '40px'
  },
  optionIconSelected: {
    marginLeft: '6px',
    fill: colors.white
  },
  optionIcon: {
    marginLeft: '6px',
    fill: '#555'
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

      optionType: 0,
      asset: '',
      assetError: null,
      assetAmount: '',
      assetAmountError: null,
      strikePrice: '',
      strikePriceError: null,
      holdingPeriod: 4,
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
      account,
      tabValue,
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
                <ToggleButton value={0} aria-label="Active">
                  <Typography variant={ 'h4' }>Active</Typography>
                </ToggleButton>
                <ToggleButton value={1} aria-label="Closed">
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

    return (
      <div className={ classes.optionsCreateContainer }>
        <Typography variant={ 'h3' } className={ classes.sectionHeadingOptions }>Create Option</Typography>
        { this.renderOptionType() }
        <div className={ classes.between }></div>
        { this.renderAssetInput() }
        <div className={ classes.divider }></div>
        { this.renderHoldingPeriod() }
        <div className={ classes.between }></div>
        { this.renderStrikePrice() }
        <div className={ classes.divider }></div>
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
      assets
    } = this.state

    let breakEven = null
    let target = null
    let profit = null

    let selectedAsset = null

    const selectedAssetArr = assets.filter((as) => {
      return as.symbol === asset
    })
    if(selectedAssetArr && selectedAssetArr.length > 0) {
      selectedAsset = selectedAssetArr[0]
    }

    if(optionFees && optionType === 1 && selectedAsset) {

      breakEven = (parseFloat(selectedAsset.price) - (parseFloat(optionFees)/assetAmount)).toFixed(6)
      target = (selectedAsset.price*3/4).toFixed(4)
      profit = ((breakEven - target)*assetAmount).toFixed(4)

    } else if (optionFees && optionType === 0 && selectedAsset) {

      breakEven = (parseFloat(selectedAsset.price) + parseFloat(optionFees)/assetAmount).toFixed(4)
      target = (selectedAsset.price*4/3).toFixed(4)
      profit = ((target - breakEven)*assetAmount).toFixed(4)
    }

    return (
      <div className={ classes.optionsText }>
        <div className={ classes.optionsTypography }>
          <Typography variant='h4' className={ classes.addPadding } >I have </Typography>
          <Typography variant='h3' className={ classes.addPadding }>{ assetAmount ? assetAmount : '<Option Size>' } { asset } </Typography>
          <Typography variant='h4' className={ classes.addPadding }>and I think the price will go { this.mapOptionTypeToText(optionType) } </Typography>
          <Typography variant='h3' className={ classes.addPadding }>{ strikePrice ? strikePrice : '<Strike Price>' } { quoteAsset.symbol } </Typography>
          <Typography variant='h4' className={ classes.addPadding }>within the next { holdingPeriod ? holdingPeriod : '<Holding Period>' } days.</Typography>
          <Typography variant='h4' className={ classes.addPadding }>This will cost me </Typography>
          <Typography variant='h3' className={ classes.addPadding }>{ optionFees ? optionFees.toFixed(4) : '<Total Fees>' } { quoteAsset.symbol }. </Typography>

          <Typography variant='h4' className={ classes.addPadding }>If the price { this.mapOptionTypeV2toText(optionType) } </Typography>
          <Typography variant='h3' className={ classes.addPadding }>{ breakEven ? breakEven : '<break-even>' } { quoteAsset.symbol } </Typography>
          <Typography variant='h4' className={ classes.addPadding }>I will be in profit. If the price { this.mapOptionTypeV3toText(optionType) } </Typography>
          <Typography variant='h3' className={ classes.addPadding }>{ target ? target : '<target>' } { quoteAsset.symbol } </Typography>
          <Typography variant='h4' className={ classes.addPadding }>, I will have made </Typography>
          <Typography variant='h3' className={ classes.addPadding }>{ profit ? profit : '<profit>' } { quoteAsset.symbol } </Typography>
        </div>
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
        return 'down '
      case 0:
        return 'up '
      default:
        return 'down '
    }
  }

  mapOptionTypeV2toText = (type) => {
    switch (type) {
      case 1:
        return 'dips below '
      case 0:
        return 'rises above '
      default:
        return 'dips below '
    }
  }

  mapOptionTypeV3toText = (type) => {
    switch (type) {
      case 1:
        return 'drops to '
      case 0:
        return 'rises to '
      default:
        return 'drops to '
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
            <ToggleButton value={0} aria-label="Call">
              <Typography variant={ 'h4' }>Call</Typography>
              <TrendingUpIcon className={ optionType===0 ? classes.optionIconSelected : classes.optionIcon } />
            </ToggleButton>
            <ToggleButton value={1} aria-label="Put">
              <Typography variant={ 'h4' }>Put</Typography>
              <TrendingDownIcon className={ optionType===1 ? classes.optionIconSelected : classes.optionIcon } />
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
            placeholder={ selectedAsset ? selectedAsset.price.toFixed(4) : '0.00' }
            variant="outlined"
            helperText={`Current price: ${ selectedAsset ? selectedAsset.price : '0.00' } WETH per 1 ${ selectedAsset.symbol }`}
            InputProps={{
              startAdornment: <div className={ classes.assetContainerPadded }>
                <div className={ classes.assetSelectIcon }>
                  <img
                    alt=""
                    src={ this.getLogo(quoteAsset.symbol) }
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
    const { loading, assetAmount } = this.state

    return (
      <Button
        className={ classes.actionButton }
        variant="outlined"
        color="primary"
        disabled={ loading || !assetAmount }
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
      // strikePrice,
      optionType,
      optionFees,
    } = this.state

    if(asset && asset !== '' &&
      assetAmount && assetAmount !== '' && !isNaN(assetAmount)) {

      this.setState({ loading: true })
      dispatcher.dispatch({ type: CREATE_OPTION, content: { holdingPeriod, asset, assetAmount, optionType, fees: optionFees }})
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
                <TableCell align="right">Option Type</TableCell>
                <TableCell align="right">Option Size</TableCell>
                <TableCell align="right">Strike Price</TableCell>
                <TableCell align="right">Expiry Date</TableCell>
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
      options,
      quoteAsset
    } = this.state

    if(!options || options.length === 0) {
      return <TableRow className={ classes.optionRow } key={'No'}>
        <TableCell colSpan={9} align="center">
          <Typography>There are no options here</Typography>
        </TableCell>
      </TableRow>
    }

    return options.filter((option) => {

      // return true

      if(!option) {
        return false
      }

      if(tabValue === 0) {
        return moment(option.expire*1e3) > moment()
      } else if (tabValue === 1) {
        return moment(option.expire*1e3) <= moment()
      } else {
        return false
      }
    }).map((option) => {
      return (
        <TableRow className={ classes.optionRow } key={option.index}>
          <TableCell>
            <div className={ classes.assetSelectIcon }>
              <img
                alt=""
                src={ this.getLogo(option.asset.symbol) }
                height="30px"
              />
            </div>
            <div className={ classes.assetSelectIconName }>
              <Typography variant='h4'>{ option.asset.symbol }</Typography>
            </div>
          </TableCell>
          <TableCell align="right"><Typography variant='h4'>{ this.mapTypeToString(option.optionType) }</Typography></TableCell>
          <TableCell align="right"><Typography variant='h4'>{ option.amount ? (option.amount/10**option.asset.decimals).toFixed(4) : '0' } { option.asset.symbol }</Typography></TableCell>
          <TableCell align="right"><Typography variant='h4'>{ option.strike ? (option.strike/10**quoteAsset.decimals).toFixed(4) : '0' } { quoteAsset.symbol }</Typography></TableCell>
          <TableCell align="right"><Typography variant='h4'>{ option.expire ? moment(option.expire*1e3).format("YYYY/MM/DD kk:mm") : '' }</Typography></TableCell>
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
                    src={ this.getLogo(option) }
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
    const { quoteAsset } = this.state

    return (
      <MenuItem key={option.symbol} value={option.symbol} className={ classes.assetSelectMenu }>
        <React.Fragment>
          <div className={ classes.assetSelectIcon }>
            <img
              alt=""
              src={ this.getLogo(option.symbol) }
              height="30px"
            />
          </div>
          <div className={ classes.assetSelectIconName }>
            <Typography variant='h4'>{ option.symbol }</Typography>
          </div>
          <div className={ classes.assetSelectBalance }>
            <Typography variant='h4'>{ option.price ? option.price.toFixed(4) : '0.0000' } { quoteAsset ? quoteAsset.symbol :  '' }</Typography>
          </div>
        </React.Fragment>
      </MenuItem>
    )
  }

  getLogo = (symbol) => {
    let logo = null
    try {
      logo = require('../../assets/tokens/'+symbol+'-logo.png')
    } catch(ex) {
      logo = require('../../assets/tokens/unknown-logo.png')
    }

    return logo
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
        return 'CALL'
      case '1':
        return 'PUT'
      default:
        return 'Invalid'
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
      assetAmount && assetAmount !== '' && !isNaN(assetAmount)) {

      dispatcher.dispatch({ type: GET_OPTIONS_FEES, content: { holdingPeriod, strikePrice, asset, assetAmount, optionType }})
    }
  }
}

  export default withRouter(withStyles(styles)(Dashboard));
