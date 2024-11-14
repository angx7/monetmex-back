// clientesRoutes.js
const express = require('express');
const router = express.Router();
const clientService = require('../services/clientesService');

module.exports = (db, bcrypt, saltRounds) => {
  const service = new clientService(db); // Pasamos db al servicio

  router.get('/', async (req, res, next) => {
    try {
      const result = await service.getAll();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const {
        nombreCliente,
        emailCliente,
        telefonoCliente,
        passwordCliente,
        bloqueoPagoCaja = false,
      } = req.body;

      if (
        !nombreCliente ||
        !emailCliente ||
        !telefonoCliente ||
        !passwordCliente
      ) {
        const error = new Error('Faltan datos');
        error.status = 400;
        throw error;
      }

      // Hasheamos la contraseña antes de guardarla
      const hashedPassword = await bcrypt.hash(passwordCliente, saltRounds);
      const result = await service.addCliente({
        nombreCliente,
        emailCliente,
        telefonoCliente,
        passwordCliente: hashedPassword,
        bloqueoPagoCaja,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Ruta de login
  router.post('/login', async (req, res) => {
    const { emailCliente, passwordCliente } = req.body;

    if (!emailCliente || !passwordCliente) {
      return res.status(400).send('Faltan datos de inicio de sesión');
    }

    try {
      const user = await service.getClientByEmail(emailCliente);
      if (!user) {
        return res.status(404).send('Usuario no encontrado');
      }

      // Validar la contraseña
      const isMatch = await bcrypt.compare(
        passwordCliente,
        user.passwordCliente
      );
      if (!isMatch) {
        return res.status(401).send('Contraseña incorrecta');
      }

      // Aquí podrías generar un token JWT si estás usando autenticación basada en tokens
      res.status(200).json({
        message: 'Inicio de sesión exitoso',
        nombreCliente: user.nombreCliente,
      });
    } catch (error) {
      console.error('Error al validar el login:', error);
      res.status(500).send('Error al validar el login');
    }
  });

  return router;
};
