const express = require('express');
const clientesRouter = require('./clientesRoutes');
const paquetesRouter = require('./paquetesRouter');
const admonRouter = require('./admonRoutes');

function routerApp(app, db, bcrypt, saltRounds) {
  // Pasa db, bcrypt, y saltRounds a clientesRouter
  app.use('/clientes', clientesRouter(db, bcrypt, saltRounds));
  app.use('/paquetes', paquetesRouter(db));
  app.use('/admon', admonRouter(db));
}

module.exports = routerApp;
