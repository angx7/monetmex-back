// class admonService {
//   constructor(db) {
//     this.db = db;
//   }

//   // Servicio para obtener todos los paquetes pendientes
//   async obtenerPendientes() {
//     try {
//       const query = `
//       SELECT cp.clientePaqueteId, p.nombrePaquete, cp.estado, cp.fechaCreacion, cp.sesionesRestantes
//       FROM clientesPaquetes cp
//       JOIN paquetes p ON cp.paqueteId = p.paqueteId
//       WHERE cp.estado = 'pendiente'
//     `;
//       const [rows] = await this.db.execute(query);

//       // Si no se encuentran registros, retorna un arreglo vacío
//       if (rows.length === 0) {
//         return [];
//       }

//       // Formatear los resultados
//       const pendientes = rows.map((row) => ({
//         clientePaqueteId: row.clientePaqueteId,
//         nombrePaquete: row.nombrePaquete,
//         estado: row.estado,
//         fechaCreacion: row.fechaCreacion.toISOString(), // Fecha en formato ISO
//         sesionesRestantes: row.sesionesRestantes, // Agregar el campo sesionesRestantes
//       }));

//       return pendientes;
//     } catch (error) {
//       console.error('Error al obtener los paquetes pendientes:', error);
//       throw error; // Propaga el error para manejo superior
//     }
//   }

//   // Servicio para consultar el estado de una solicitud específica
//   async consultarEstado(clientePaqueteId) {
//     try {
//       // Actualizar solicitudes vencidas (mayores a 24 horas en estado 'pendiente')
//       const cancelarQuery = `
//       UPDATE clientesPaquetes
//       SET estado = 'cancelado'
//       WHERE clientePaqueteId = ?
//         AND estado = 'pendiente'
//         AND TIMESTAMPDIFF(HOUR, fechaCreacion, NOW()) >= 24
//     `;
//       const [updateResult] = await this.db.execute(cancelarQuery, [
//         clientePaqueteId,
//       ]);
//       console.log('Filas afectadas por el UPDATE:', updateResult.affectedRows);

//       // Obtener el estado actualizado de la solicitud
//       const query = `
//       SELECT cp.clientePaqueteId, p.nombrePaquete, cp.estado, cp.fechaCreacion, cp.sesionesRestantes
//       FROM clientesPaquetes cp
//       JOIN paquetes p ON cp.paqueteId = p.paqueteId
//       WHERE clientePaqueteId = ?
//     `;
//       const [rows] = await this.db.execute(query, [clientePaqueteId]);
//       console.log('Resultado del SELECT:', rows);

//       // Si no se encuentra el paquete, retorna null
//       if (rows.length === 0) {
//         return null;
//       }

//       // Formatear la respuesta
//       const paquete = rows[0];
//       const paqueteResponse = {
//         clientePaqueteId: paquete.clientePaqueteId,
//         nombrePaquete: paquete.nombrePaquete,
//         estado: paquete.estado,
//         fechaCreacion: paquete.fechaCreacion.toISOString(), // Fecha en formato ISO
//         sesionesRestantes: paquete.sesionesRestantes, // Incluir el campo sesionesRestantes
//       };

//       return paqueteResponse;
//     } catch (error) {
//       console.error('Error en consultarEstado:', error);
//       throw error; // Propaga el error para manejo superior
//     }
//   }

//   // Servicio para aprobar una solicitud de paquete
//   async aprobarSolicitud(clientePaqueteId) {
//     try {
//       // Consulta para obtener la duración del paquete
//       const getPackageQuery = `
//       SELECT paquetes.duracionDias
//       FROM clientesPaquetes
//       JOIN paquetes ON clientesPaquetes.paqueteId = paquetes.paqueteId
//       WHERE clientesPaquetes.clientePaqueteId = ? AND clientesPaquetes.estado = 'pendiente'
//     `;
//       const [rows] = await this.db.execute(getPackageQuery, [clientePaqueteId]);

//       if (rows.length === 0) {
//         return {
//           success: false,
//           message: 'La solicitud no existe o no está en estado "pendiente"',
//         };
//       }

//       const duracionDias = rows[0].duracionDias;

//       // Actualizar el estado a "aprobado", la fecha de aprobación y calcular la fecha de expiración
//       const updateQuery = `
//       UPDATE clientesPaquetes
//       SET estado = 'aprobado',
//           fechaAprobacion = NOW(),
//           fechaExpiracion = DATE_ADD(NOW(), INTERVAL ? DAY)
//       WHERE clientePaqueteId = ?
//     `;
//       const [result] = await this.db.execute(updateQuery, [
//         duracionDias,
//         clientePaqueteId,
//       ]);

//       if (result.affectedRows === 0) {
//         return {
//           success: false,
//           message: 'No se pudo actualizar la solicitud',
//         };
//       }

//       // Obtener el estado actualizado de la solicitud
//       const selectQuery = `
//       SELECT cp.clientePaqueteId, p.nombrePaquete, cp.estado, cp.fechaCreacion, cp.fechaAprobacion, cp.fechaExpiracion, cp.sesionesRestantes
//       FROM clientesPaquetes cp
//       JOIN paquetes p ON cp.paqueteId = p.paqueteId
//       WHERE clientePaqueteId = ?
//     `;
//       const [updatedRows] = await this.db.execute(selectQuery, [
//         clientePaqueteId,
//       ]);

//       if (updatedRows.length === 0) {
//         return {
//           success: false,
//           message: 'No se encontró la solicitud después de la aprobación',
//         };
//       }

//       // Formatear la respuesta
//       const paquete = updatedRows[0];
//       const paqueteResponse = {
//         clientePaqueteId: paquete.clientePaqueteId,
//         nombrePaquete: paquete.nombrePaquete,
//         estado: paquete.estado,
//         fechaCreacion: paquete.fechaCreacion.toISOString(),
//         fechaAprobacion: paquete.fechaAprobacion.toISOString(),
//         fechaExpiracion: paquete.fechaExpiracion.toISOString(),
//         sesionesRestantes: paquete.sesionesRestantes,
//       };

//       return { success: true, data: paqueteResponse };
//     } catch (error) {
//       console.error('Error en aprobarSolicitud:', error);
//       throw error; // Propaga el error para manejo superior
//     }
//   }
// }

// module.exports = admonService;

class admonService {
  constructor(db) {
    this.db = db;
  }

  // Servicio para obtener todos los paquetes pendientes
  async obtenerPendientes() {
    try {
      const query = `
        SELECT cp.clientePaqueteId, p.nombrePaquete, cp.estado, cp.fechaCreacion, cp.sesionesRestantes
        FROM clientesPaquetes cp
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

  // Servicio para consultar el estado de una solicitud específica
  async consultarEstado(clientePaqueteId) {
    try {
      const cancelarQuery = `
        UPDATE clientesPaquetes
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
        FROM clientesPaquetes cp
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
        FROM clientesPaquetes
        JOIN paquetes ON clientesPaquetes.paqueteId = paquetes.paqueteId
        WHERE clientesPaquetes.clientePaqueteId = ? AND clientesPaquetes.estado = 'pendiente'
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
        UPDATE clientesPaquetes
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
        FROM clientesPaquetes cp
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

  // Servicio para cancelar automáticamente solicitudes vencidas (más de 24 horas)
  async cancelarSolicitudesVencidas() {
    try {
      const query = `
        UPDATE clientesPaquetes
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
}

module.exports = admonService;
