const express = require('express');
const router = express.Router();
const admonService = require('../services/admonService');
const cron = require('node-cron');

module.exports = (db) => {
  const service = new admonService(db); // Pasamos db al servicio
  // Consultar todos los paquetes pendientes de aprobación
  router.get('/estado', async (req, res) => {
    try {
      const pendientes = await service.obtenerPendientes();

      if (!pendientes || pendientes.length === 0) {
        return res
          .status(404)
          .json({ message: 'No hay solicitudes pendientes de aprobación.' });
      }

      res.json(pendientes);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: 'Error al consultar las solicitudes pendientes.' });
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

  // Ruta para aprobar una solicitud
  router.post('/estado/:purchaseId/approve', async (req, res) => {
    const { purchaseId } = req.params;

    try {
      const resultado = await service.aprobarSolicitud(purchaseId);

      if (!resultado) {
        return res
          .status(404)
          .json({ message: 'No se encontró la solicitud para aprobar.' });
      }

      res.json({ message: 'Solicitud aprobada exitosamente.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al aprobar la solicitud.' });
    }
  });

  // Configuración para que se ejecute cada hora
  cron.schedule('0 * * * *', async () => {
    try {
      await service.cancelarSolicitudesVencidas();
    } catch (error) {
      console.error(
        'Error al ejecutar la tarea de cancelación automática:',
        error
      );
    }
  });
  return router;
};
