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
      const db = await mysql.createConnection({
        host: '192.168.1.15', // Cambiar por la IP de tu máquina
        user: 'Admin', // Cambiar por tu usuario
        password: '',
        database: 'monettest',
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
