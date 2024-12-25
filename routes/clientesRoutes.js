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
        admon = false, // Nuevo parámetro
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
        admon, // Pasar el nuevo campo
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
        clienteId: user.clienteId,
        admon: user.admon,
      });
    } catch (error) {
      next(error);
    }
  });

  // Ruta para cancelar una clase
  router.post('/cancelar', async (req, res, next) => {
    const { claseId, clienteId, fecha } = req.body;

    if (!claseId || !clienteId || !fecha) {
      return res.status(400).json({ message: 'Faltan datos' });
    }

    try {
      const result = await service.cancelarClase(clienteId, claseId, fecha);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Ruta para obtener la proxima clase de un cliente
  router.get('/nextclass', async (req, res, next) => {
    const { clienteId } = req.query;

    if (!clienteId) {
      return res.status(400).json({ message: 'Falta el ID del cliente' });
    }

    try {
      const result = await service.getNextClass(clienteId);
      res.json(result);
    } catch (error) {
      if (error.message === 'Cliente no encontrado') {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  });
  return router;
};
