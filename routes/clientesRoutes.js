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
        return res.status(400).json({ message: 'Faltan datos' });
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
  router.post('/login', async (req, res, next) => {
    const { emailCliente, passwordCliente } = req.body;

    if (!emailCliente || !passwordCliente) {
      return res
        .status(400)
        .json({ message: 'Faltan datos de inicio de sesión' });
    }

    try {
      const user = await service.getClientByEmail(emailCliente);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      // Validar la contraseña
      const isMatch = await bcrypt.compare(
        passwordCliente,
        user.passwordCliente
      );
      if (!isMatch) {
        return res.status(401).json({ message: 'Contraseña incorrecta' });
      }

      // Aquí podrías generar un token JWT si estás usando autenticación basada en tokens
      res.status(200).json({
        message: 'Inicio de sesión exitoso',
        nombreCliente: user.nombreCliente,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
