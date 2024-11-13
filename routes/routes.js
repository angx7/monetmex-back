const express = require('express');
const clientesRouter = require('./clientesRoutes');

function routerApp(app, db, bcrypt, saltRounds) {
  // Pasa db, bcrypt, y saltRounds a clientesRouter
  app.use('/clientes', clientesRouter(db, bcrypt, saltRounds));
}

module.exports = routerApp;
