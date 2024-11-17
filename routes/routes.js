const express = require('express');
const clientesRouter = require('./clientesRoutes');
const paquetesRouter = require('./paquetesRouter');

function routerApp(app, db, bcrypt, saltRounds) {
  // Pasa db, bcrypt, y saltRounds a clientesRouter
  app.use('/clientes', clientesRouter(db, bcrypt, saltRounds));
  app.use('/paquetes', paquetesRouter(db));
}

module.exports = routerApp;
