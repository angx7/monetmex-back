const express = require('express');
const router = express.Router();
const paqueteService = require('../services/paquetesService');

module.exports = (db) => {
  const service = new paqueteService(db); // Pasamos db al servicio

  // Comprar un paquete
  router.post('/comprar', async (req, res) => {
    const { clienteId, paqueteId } = req.body;

    if (!clienteId || !paqueteId) {
      return res
        .status(400)
        .json({ message: 'Faltan datos requeridos: clienteId o paqueteId.' });
    }

    try {
      // Crear la solicitud de paquete
      const result = await service.crearSolicitud(clienteId, paqueteId);
      res.status(201).json({
        message: 'Solicitud creada. Pendiente de aprobación.',
        solicitud_id: result.insertId, // ID de la solicitud creada
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al crear la solicitud.' });
    }
  });

  // Aprobar una solicitud de paquete
  router.patch('/aprobar/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const actualizado = await service.aprobarSolicitud(id);

      if (!actualizado) {
        return res
          .status(404)
          .json({ message: 'Solicitud no encontrada o ya aprobada.' });
      }

      res.json({
        message:
          'Solicitud aprobada exitosamente con fecha de expiración calculada.',
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al aprobar la solicitud.' });
    }
  });

  // Consultar el estado de una solicitud
  router.get('/estado/:clientePaqueteId', async (req, res) => {
    const { clientePaqueteId } = req.params;

    try {
      const estado = await service.consultarEstado(clientePaqueteId);

      if (!estado) {
        return res
          .status(404)
          .json({ message: 'No se encontró la solicitud.' });
      }

      res.json(estado);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: 'Error al consultar el estado de la solicitud.' });
    }
  });

  return router;
};
