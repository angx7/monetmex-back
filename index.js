const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const routerApp = require('./routes/routes');
const { logErrors, errorHandler } = require('./middlewares/errorHandler');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

async function main() {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'monettest',
    });

    // const createTableQuery = `
    //   CREATE TABLE IF NOT EXISTS clientes (
    //   clienteId INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    //   nombreCliente VARCHAR(255) NOT NULL,
    //   emailCliente VARCHAR(255) NOT NULL UNIQUE,
    //   telefonoCliente VARCHAR(255) NOT NULL,
    //   passwordCliente VARCHAR(255) NOT NULL,
    //   bloqueoPagoCaja BOOLEAN NOT NULL
    //   )
    // `;

    // await db.query(createTableQuery);
    // console.log('Table created');

    routerApp(app, db, bcrypt, saltRounds);
    app.use(logErrors);
    app.use(errorHandler);

    app.get('/', (req, res) => {
      res.send('Welcome to the API');
    });

    console.log('Connected to database');

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Error connecting to the database: ', error);
  }
}

main();

// db.connect((err) => {
//   if (err) {
//     throw new Error('No se pudo conectar: ' + err);
//   }
//   console.log('Connected to database');
// });

// const createTablrQuery = `CREATE TABLE IF NOT EXISTS clientes (
// clienteId INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
// nombreCliente VARCHAR(255) NOT NULL,
// emailCliente VARCHAR(255) NOT NULL,
// telefonoCliente VARCHAR(255) NOT NULL,
// passwordCliente VARCHAR(255) NOT NULL,
// bloqueoPagoCaja BOOLEAN NOT NULL
// )`;

// db.query(createTablrQuery, (err, result) => {
//   if (err) {
//     throw new Error('No se pudo crear la tabla: ' + err);
//   }
//   console.log('Table created');
// });

// routerApp(app); // si truena es porque le faltan parametros como db, bcrypt, saltRounds

// app.get('/', (req, res) => {
//   res.send('Welcome to the API');
// });

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });
