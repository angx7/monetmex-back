const express = require('express');
const router = express.Router();
const classService = require('../services/classService');

module.exports = (db) => {
  const service = new classService(db); // Pasamos db al servicio

  // Ruta de reserva
  router.post('/reserve', async (req, res, next) => {
    const { idClase, idCliente, metodoPago, paqueteId, diaSemana } = req.body;

    // Validación de datos necesarios
    if (!idClase || !idCliente || !metodoPago || !diaSemana) {
      return res.status(400).json({
        message: 'Faltan datos: idClase, idCliente, metodoPago o diaSemana',
      });
    }

    try {
      // Llamamos al servicio para realizar la reserva
      const result = await service.reserveClass({
        claseId: idClase,
        clienteId: idCliente,
        metodoPago,
        paqueteId,
        diaSemana,
      });

      // Si la reserva fue exitosa, retornamos el resultado
      res.json(result);
    } catch (error) {
      // Manejo de errores específicos, como el bloqueo de pago en caja
      if (
        error.message === 'El cliente no puede pagar en caja debido a bloqueo'
      ) {
        return res.status(403).json({ message: error.message });
      }

      // Si ocurre cualquier otro error, lo pasamos al siguiente middleware
      next(error);
    }
  });

  // Ruta para obtener paquetes aprobados por nombre
  router.get('/approved-packages', async (req, res, next) => {
    const { clienteId, searchTerm } = req.query;

    if (!clienteId || !searchTerm) {
      return res.status(400).json({ message: 'Faltan clienteId o searchTerm' });
    }

    try {
      const result = await service.getApprovedPackagesByName(
        clienteId,
        searchTerm
      );
      if (!result || result.length === 0) {
        return res
          .status(404)
          .json({ message: 'No se encontraron paquetes aprobados' });
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Ruta para obtener horarios de clases por día

  router.get('/availability', async (req, res, next) => {
    const { diaSemana } = req.query;

    if (!diaSemana) {
      return res.status(400).json({ message: 'Falta el día de la semana' });
    }

    try {
      const result = await service.getClassesByDay(diaSemana);
      if (!result || result.length === 0) {
        return res.status(404).json({ message: 'No se encontraron clases' });
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Ruta para obtener horarios por día de la semana y disciplina

  // Ruta para obtener horarios por día de la semana y disciplina
  router.get('/horarios', async (req, res, next) => {
    const { diaSemana, disciplina } = req.query;

    if (!diaSemana || !disciplina) {
      return res
        .status(400)
        .json({ message: 'Faltan datos: diaSemana o disciplina' });
    }

    try {
      const result = await service.getHorariosByDayAndDisciplina(
        diaSemana,
        disciplina
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
