const express = require('express');
const clientesRouter = require('./clientesRoutes');
const paquetesRouter = require('./paquetesRouter');
const admonRouter = require('./admonRoutes');
const classRouter = require('./classRoutes');

function routerApp(app, db, bcrypt, saltRounds) {
  // Pasa db, bcrypt, y saltRounds a clientesRouter
  app.use('/clientes', clientesRouter(db, bcrypt, saltRounds));
  app.use('/paquetes', paquetesRouter(db));
  app.use('/admon', admonRouter(db));
  app.use('/clases', classRouter(db));
}

module.exports = routerApp;
