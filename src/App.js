import React, { Component } from 'react';
import CssBaseline from '@material-ui/core/CssBaseline';
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import {
  Switch,
  Route
} from "react-router-dom";
import IpfsRouter from 'ipfs-react-router'

import interestTheme from './theme';

import Footer from './components/footer';
import Header from './components/header';
import Dashboard from './components/dashboard';

import { injected } from "./stores/connectors";

import {
  CONNECTION_CONNECTED,
  CONFIGURE,
  CONFIGURE_RETURNED
} from './constants'

import Store from "./stores";
const emitter = Store.emitter
const store = Store.store
const dispatcher = Store.dispatcher

class App extends Component {
  state = {};

  componentWillMount() {

    emitter.on(CONNECTION_CONNECTED, this.connectionConnected)
    emitter.on(CONFIGURE_RETURNED, this.configureReturned)


    injected.isAuthorized().then(isAuthorized => {
      if (isAuthorized) {
        injected.activate()
        .then((a) => {
          store.setStore({ account: { address: a.account }, web3context: { library: { provider: a.provider } } })
          emitter.emit(CONNECTION_CONNECTED)
        })
        .catch((e) => {
          console.log(e)
        })
      } else {

      }
    });

    if(window.ethereum) {
      window.ethereum.on('accountsChanged', function (accounts) {
        store.setStore({ account: { address: accounts[0] } })

        const web3context = store.getStore('web3context')
        if(web3context) {
          emitter.emit(CONNECTION_CONNECTED)
        }
      })
    }

  }

  componentWillUnmount() {
    emitter.removeListener(CONNECTION_CONNECTED, this.connectionConnected)
    emitter.removeListener(CONFIGURE_RETURNED, this.configureReturned)
  }

  connectionConnected = () => {
    dispatcher.dispatch({ type: CONFIGURE, content: {} })
  }

  configureReturned = () => {
    //dont know
  }

  render() {
    return (
      <MuiThemeProvider theme={ createMuiTheme(interestTheme) }>
        <CssBaseline />
        <IpfsRouter>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            alignItems: 'center',
            background: "#f9fafb"
          }}>
            <Switch>
              <Route path='/options'>
                <Header />
                <Dashboard />
              </Route>
              <Route path="/">
                <Header />
                <Dashboard />
              </Route>
            </Switch>
            <Footer />
          </div>
        </IpfsRouter>
      </MuiThemeProvider>
    );
  }
}

export default App;
