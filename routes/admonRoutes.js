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

  // Consultar todas las clases pendientes de aprobación
  router.get('/clases', async (req, res) => {
    try {
      const pendientes = await service.obtenerClasesPendientes();

      if (!pendientes || pendientes.length === 0) {
        return res
          .status(404)
          .json({ message: 'No hay clases pendientes de aprobación.' });
      }

      res.json(pendientes);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: 'Error al consultar las clases pendientes.' });
    }
  });

  // Consultar el estado de una clase
  router.get('/clases/:claseId', async (req, res) => {
    const { claseId } = req.params;

    try {
      const estado = await service.obtenerClasePendienteEspecifica(claseId);

      if (!estado) {
        return res.status(404).json({ message: 'No se encontró la clase.' });
      }

      res.json(estado);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: 'Error al consultar el estado de la clase.' });
    }
  });

  // Ruta para aprobar una clase
  router.post('/clases/:claseId/approve', async (req, res) => {
    const { claseId } = req.params;

    try {
      const resultado = await service.aprobarClase(claseId);

      if (!resultado) {
        return res
          .status(404)
          .json({ message: 'No se encontró la clase para aprobar.' });
      }

      res.json({ message: 'Clase aprobada exitosamente.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al aprobar la clase.' });
    }
  });

  // Ruta para obtener los horarios
  router.get('/asistencia/horarios', async (req, res) => {
    try {
      const horarios = await service.obtenerHorarios();

      if (!horarios || horarios.length === 0) {
        return res
          .status(404)
          .json({ message: 'No hay horarios disponibles.' });
      }

      res.json(horarios);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al consultar los horarios.' });
    }
  });

  // Ruta para guardar la asistencia de un cliente
  router.post('/asistencia/:claseId/guardar', async (req, res) => {
    const { claseId } = req.params;
    const { asistencia } = req.body;

    try {
      const resultado = await service.guardarAsistencia(claseId, asistencia);

      if (!resultado) {
        return res
          .status(400)
          .json({ message: 'No se pudo guardar la asistencia.' });
      }

      res.json({ message: 'Asistencia guardada exitosamente.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al guardar la asistencia.' });
    }
  });

  // Ruta para obtener la asistencia de un cliente
  router.get('/asistencia/:claseId', async (req, res) => {
    try {
      const { claseId } = req.params;
      const asistencia = await service.obtenerAsistencia(claseId);

      if (!asistencia || asistencia.length === 0) {
        return res
          .status(404)
          .json({ message: 'No se encontró asistencia para el cliente.' });
      }

      res.json(asistencia);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: 'Error al consultar la asistencia del cliente.' });
    }
  });

  // Configuración para que se ejecute cada hora
  cron.schedule('0 * * * *', async () => {
    try {
      await service.cancelarClasesVencidas();
    } catch (error) {
      console.error(
        'Error al ejecutar la tarea de cancelación automática:',
        error
      );
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
