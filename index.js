require('dotenv').config();
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
  const maxRetries = 5;
  const retryDelay = 5000;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log('DB_HOST', process.env.DB_HOST);
      console.log('Connecting to database...', process.env.DB_NAME);
      console.log('connecting to database...');
      const db = await mysql.createConnection({
        host: process.env.DB_HOST, // Cambiar por la IP de tu máquina
        user: process.env.DB_USER, // Cambiar por tu usuario
        password: process.env.DB_PASSWORD, // Cambiar por tu contraseña
        database: process.env.DB_NAME,
      });

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

      break;
    } catch (error) {
      retries++;
      console.error('Error connecting to the database: ', error);

      if (retries === maxRetries) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

main();
