class admonService {
  constructor(db) {
    this.db = db;
  }

  // Servicio para obtener todos los paquetes pendientes
  async obtenerPendientes() {
    try {
      const query = `
        SELECT cp.clientePaqueteId, p.nombrePaquete, cp.estado, cp.fechaCreacion, cp.sesionesRestantes
        FROM clientespaquetes cp
        JOIN paquetes p ON cp.paqueteId = p.paqueteId
        WHERE cp.estado = 'pendiente'
      `;
      const [rows] = await this.db.execute(query);

      if (rows.length === 0) {
        return []; // Retorna un arreglo vacío si no hay resultados
      }

      return rows.map((row) => ({
        clientePaqueteId: row.clientePaqueteId,
        nombrePaquete: row.nombrePaquete,
        estado: row.estado,
        fechaCreacion: row.fechaCreacion.toISOString(), // Fecha en formato ISO
        sesionesRestantes: row.sesionesRestantes,
      }));
    } catch (error) {
      console.error('Error al obtener los paquetes pendientes:', error);
      throw error;
    }
  }

  async obtenerClasesPendientes() {
    try {
      const query = `
      SELECT a.*, c.nombreCliente
      FROM asistencia a
      JOIN clientes c ON a.clienteId = c.clienteId
      WHERE a.estadoPago = 'pendiente'
    `;
      const [rows] = await this.db.execute(query);
      return rows;
    } catch (error) {
      console.error('Error al obtener las clases pendientes:', error);
      throw error;
    }
  }

  async obtenerClasePendienteEspecifica(claseId) {
    try {
      const query = `
      SELECT a.*, c.nombreCliente
      FROM asistencia a
      JOIN clientes c ON a.clienteId = c.clienteId
      WHERE a.estadoPago = 'pendiente' AND a.id = ?
    `;
      const [rows] = await this.db.execute(query, [claseId]);
      return rows;
    } catch (error) {
      console.error('Error al obtener la clase pendiente específica:', error);
      throw error;
    }
  }

  // Servicio para consultar el estado de una solicitud específica
  async consultarEstado(clientePaqueteId) {
    try {
      const cancelarQuery = `
        UPDATE clientespaquetes
        SET estado = 'cancelado'
        WHERE clientePaqueteId = ? AND estado = 'pendiente'
        AND TIMESTAMPDIFF(HOUR, fechaCreacion, NOW()) >= 24
      `;
      const [updateResult] = await this.db.execute(cancelarQuery, [
        clientePaqueteId,
      ]);
      console.log('Filas afectadas por el UPDATE:', updateResult.affectedRows);

      const query = `
        SELECT cp.clientePaqueteId, p.nombrePaquete, cp.estado, cp.fechaCreacion, cp.sesionesRestantes
        FROM clientespaquetes cp
        JOIN paquetes p ON cp.paqueteId = p.paqueteId
        WHERE clientePaqueteId = ?
      `;
      const [rows] = await this.db.execute(query, [clientePaqueteId]);

      if (rows.length === 0) {
        return null; // No se encontró el paquete
      }

      const paquete = rows[0];
      return {
        clientePaqueteId: paquete.clientePaqueteId,
        nombrePaquete: paquete.nombrePaquete,
        estado: paquete.estado,
        fechaCreacion: paquete.fechaCreacion.toISOString(),
        sesionesRestantes: paquete.sesionesRestantes,
      };
    } catch (error) {
      console.error('Error en consultarEstado:', error);
      throw error;
    }
  }

  // Servicio para aprobar una solicitud de paquete
  async aprobarSolicitud(clientePaqueteId) {
    try {
      const getPackageQuery = `
        SELECT paquetes.duracionDias
        FROM clientespaquetes
        JOIN paquetes ON clientespaquetes.paqueteId = paquetes.paqueteId
        WHERE clientespaquetes.clientePaqueteId = ? AND clientespaquetes.estado = 'pendiente'
      `;
      const [rows] = await this.db.execute(getPackageQuery, [clientePaqueteId]);

      if (rows.length === 0) {
        return {
          success: false,
          message: 'La solicitud no existe o no está en estado "pendiente"',
        };
      }

      const duracionDias = rows[0].duracionDias;
      const updateQuery = `
        UPDATE clientespaquetes
        SET estado = 'aprobado', fechaAprobacion = NOW(), fechaExpiracion = DATE_ADD(NOW(), INTERVAL ? DAY)
        WHERE clientePaqueteId = ?
      `;
      const [result] = await this.db.execute(updateQuery, [
        duracionDias,
        clientePaqueteId,
      ]);

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: 'No se pudo actualizar la solicitud',
        };
      }

      const selectQuery = `
        SELECT cp.clientePaqueteId, p.nombrePaquete, cp.estado, cp.fechaCreacion, cp.fechaAprobacion, cp.fechaExpiracion, cp.sesionesRestantes
        FROM clientespaquetes cp
        JOIN paquetes p ON cp.paqueteId = p.paqueteId
        WHERE clientePaqueteId = ?
      `;
      const [updatedRows] = await this.db.execute(selectQuery, [
        clientePaqueteId,
      ]);

      if (updatedRows.length === 0) {
        return {
          success: false,
          message: 'No se encontró la solicitud después de la aprobación',
        };
      }

      const paquete = updatedRows[0];
      return {
        success: true,
        data: {
          clientePaqueteId: paquete.clientePaqueteId,
          nombrePaquete: paquete.nombrePaquete,
          estado: paquete.estado,
          fechaCreacion: paquete.fechaCreacion.toISOString(),
          fechaAprobacion: paquete.fechaAprobacion.toISOString(),
          fechaExpiracion: paquete.fechaExpiracion.toISOString(),
          sesionesRestantes: paquete.sesionesRestantes,
        },
      };
    } catch (error) {
      console.error('Error en aprobarSolicitud:', error);
      throw error;
    }
  }

  // Servicio para aprobar una clase
  async aprobarClase(claseId) {
    try {
      const query = `
        UPDATE asistencia
        SET estadoPago = 'pagado'
        WHERE id = ?
      `;
      const [result] = await this.db.execute(query, [claseId]);

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: 'No se pudo actualizar la clase',
        };
      }

      const selectQuery = `
        SELECT a.*, c.nombreCliente
        FROM asistencia a
        JOIN clientes c ON a.clienteId = c.clienteId
        WHERE a.id = ?
      `;
      const [updatedRows] = await this.db.execute(selectQuery, [claseId]);

      if (updatedRows.length === 0) {
        return {
          success: false,
          message: 'No se encontró la clase después de la aprobación',
        };
      }

      const clase = updatedRows[0];
      return {
        success: true,
        data: {
          id: clase.id,
          clienteId: clase.clienteId,
          nombreCliente: clase.nombreCliente,
          fecha: clase.fecha.toISOString(),
          estadoPago: clase.estadoPago,
        },
      };
    } catch (error) {
      console.error('Error en aprobarClase:', error);
      throw error;
    }
  }

  // Servicio para cancelar automáticamente solicitudes vencidas (más de 24 horas)
  async cancelarSolicitudesVencidas() {
    try {
      const query = `
        UPDATE clientespaquetes
        SET estado = 'cancelado'
        WHERE estado = 'pendiente'
        AND TIMESTAMPDIFF(HOUR, fechaCreacion, NOW()) >= 24
      `;
      const [updateResult] = await this.db.execute(query);
      console.log(
        'Solicitudes vencidas canceladas:',
        updateResult.affectedRows
      );

      return {
        success: true,
        message: `${updateResult.affectedRows} solicitudes vencidas han sido canceladas automáticamente.`,
      };
    } catch (error) {
      console.error('Error al cancelar las solicitudes vencidas:', error);
      throw error;
    }
  }

  // Servicio para cancelar automáticamente clases pendientes (más de 24 horas)
  async cancelarClasesVencidas() {
    try {
      const query = `
        UPDATE asistencia
        SET estadoPago = 'cancelado'
        WHERE estadoPago = 'pendiente'
        AND TIMESTAMPDIFF(HOUR, fecha, NOW()) >= 24
      `;
      const [updateResult] = await this.db.execute(query);
      console.log('Clases vencidas canceladas:', updateResult.affectedRows);

      return {
        success: true,
        message: `${updateResult.affectedRows} clases vencidas han sido canceladas automáticamente.`,
      };
    } catch (error) {
      console.error('Error al cancelar las clases vencidas:', error);
      throw error;
    }
  }

  async obtenerAsistencia(claseId) {
    try {
      const query = `
        SELECT a.*, c.nombreCliente
        FROM asistencia a
        JOIN clientes c ON a.clienteId = c.clienteId
        WHERE a.claseId = ? AND a.metodoPago = 'Caja'
      `;
      const [rows] = await this.db.execute(query, [claseId]);

      if (rows.length === 0) {
        return [];
      }

      return rows.map((row) => ({
        id: row.id,
        clienteId: row.clienteId,
        nombreCliente: row.nombreCliente,
        fecha: row.fecha.toISOString(),
        metodoPago: row.metodoPago,
        estadoPago: row.estadoPago,
        paqueteId: row.paqueteId,
      }));
    } catch (error) {
      console.error('Error al obtener la asistencia:', error);
      throw error;
    }
  }

  async obtenerHorarios() {
    try {
      const query = `
        SELECT h.*, c.disciplina
        FROM horarios h
        JOIN clases c ON h.claseId = c.claseId
      `;
      const [rows] = await this.db.execute(query);

      if (rows.length === 0) {
        return [];
      }

      return rows.map((row) => ({
        id: row.id,
        claseId: row.claseId,
        diaSemana: row.diaSemana,
        horaInicio: row.horaInicio,
        lugaresDisponibles: row.lugaresDisponibles,
        disciplina: row.disciplina,
      }));
    } catch (error) {
      console.error('Error al obtener los horarios:', error);
      throw error;
    }
  }

  async guardarAsistencia(claseId, asistencia) {
    try {
      if (!claseId || !asistencia || asistencia.length === 0) {
        throw new Error(
          `Parámetros inválidos: claseId=${claseId}, asistencia=${JSON.stringify(
            asistencia
          )}`
        );
      }

      console.log('Guardando asistencia:', asistencia, 'clase:', claseId);

      for (const record of asistencia) {
        if (!record.id || !record.asistencia) {
          throw new Error(
            `Datos de asistencia inválidos: ${JSON.stringify(record)}`
          );
        }

        // Verificar si existe el registro de asistencia
        const query = `
        SELECT * FROM asistencia
        WHERE claseId = ? AND id = ? AND metodoPago = 'Caja'
      `;
        const [rows] = await this.db.execute(query, [claseId, record.id]);

        if (!rows || rows.length === 0) {
          console.log(
            `No se encontró el registro de asistencia para el cliente ID ${record.id}`
          );
          continue; // Continuar con el siguiente registro
        }

        const clienteId = rows[0].clienteId;
        if (!clienteId) {
          throw new Error(
            `clienteId no definido en el registro de asistencia para el ID ${record.id}`
          );
        }

        // Si el cliente faltó, actualizar su estado de bloqueo
        if (record.asistencia === 'falto') {
          const updateQuery = `
          UPDATE clientes
          SET bloqueoPagoCaja = true
          WHERE clienteId = ?
        `;
          await this.db.execute(updateQuery, [clienteId]);
        }
      }

      return {
        success: true,
        message: `Asistencia procesada correctamente.`,
      };
    } catch (error) {
      console.error('Error en guardarAsistencia:', error.message);
      throw error; // Lanzamos el error para que lo maneje el middleware o llamada superior
    }
  }
}

module.exports = admonService;
