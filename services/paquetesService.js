// class paquetesService {
//   constructor(db) {
//     this.db = db;
//   }

//   // Crear una nueva solicitud de paquete
//   async crearSolicitud(clienteId, paqueteId) {
//     const query = `
//       INSERT INTO clientesPaquetes (clienteId, paqueteId, estado)
//       VALUES (?, ?, 'pendiente')
//     `;
//     const [result] = await this.db.execute(query, [clienteId, paqueteId]);
//     return result; // Retorna el resultado para obtener el ID generado
//   }

//   // Aprobar una solicitud existente
//   async aprobarSolicitud(id) {
//     const query = `
//       UPDATE clientesPaquetes
//       SET estado = 'aprobado', fechaAprobacion = NOW()
//       WHERE clientePaqueteId = ? AND estado = 'pendiente'
//     `;
//     const [result] = await this.db.execute(query, [id]);
//     return result.affectedRows > 0; // Retorna true si se actualizó
//   }

//   // Consultar el estado de una solicitud
//   async consultarEstado(clienteId, paqueteId) {
//     // Actualizar solicitudes vencidas
//     const cancelarQuery = `
//       UPDATE clientesPaquetes
//       SET estado = 'cancelado'
//       WHERE clienteId = ? AND paqueteId = ?
//         AND estado = 'pendiente'
//         AND TIMESTAMPDIFF(HOUR, fecha_creacion, NOW()) >= 24
//     `;
//     await this.db.execute(cancelarQuery, [clienteId, paqueteId]);

//     // Obtener el estado actualizado
//     const query = `
//       SELECT estado, fecha_aprobacion, fecha_creacion
//       FROM clientesPaquetes
//       WHERE clienteId = ? AND paqueteId = ?
//     `;
//     const [rows] = await this.db.execute(query, [clienteId, paqueteId]);

//     return rows[0] || null; // Retorna el estado o null si no existe
//   }
// }

// module.exports = paquetesService;

class PaquetesService {
  constructor(db) {
    this.db = db;
  }

  // Crear una nueva solicitud de paquete
  async crearSolicitud(clienteId, paqueteId) {
    const query = `
      INSERT INTO clientesPaquetes (clienteId, paqueteId, estado)
      VALUES (?, ?, 'pendiente')
    `;
    const [result] = await this.db.execute(query, [clienteId, paqueteId]);
    return result; // Retorna el resultado para obtener el ID generado
  }

  // Aprobar una solicitud existente y calcular la fecha de expiración
  async aprobarSolicitud(id) {
    // Consulta para obtener la duración del paquete
    const getPackageQuery = `
      SELECT paquetes.duracionDias
      FROM clientesPaquetes
      JOIN paquetes ON clientesPaquetes.paqueteId = paquetes.paqueteId
      WHERE clientesPaquetes.clientePaqueteId = ? AND clientesPaquetes.estado = 'pendiente'
    `;
    const [rows] = await this.db.execute(getPackageQuery, [id]);

    if (rows.length === 0) {
      return false; // La solicitud no existe o no está en estado "pendiente"
    }

    const duracionDias = rows[0].duracionDias;

    // Actualizar el estado a "aprobado", la fecha de aprobación y calcular la fecha de expiración
    const updateQuery = `
      UPDATE clientesPaquetes
      SET estado = 'aprobado',
          fechaAprobacion = NOW(),
          fechaExpiracion = DATE_ADD(NOW(), INTERVAL ? DAY)
      WHERE clientePaqueteId = ?
    `;
    const [result] = await this.db.execute(updateQuery, [duracionDias, id]);

    return result.affectedRows > 0; // Retorna true si se actualizó
  }

  // Consultar el estado de una solicitud
  async consultarEstado(clientePaqueteId) {
    try {
      // Actualizar solicitudes vencidas
      const cancelarQuery = `
      UPDATE clientesPaquetes
      SET estado = 'cancelado'
      WHERE clientePaqueteId = ?
        AND estado = 'pendiente'
        AND TIMESTAMPDIFF(HOUR, fechaCreacion, NOW()) >= 24
    `;
      const [updateResult] = await this.db.execute(cancelarQuery, [
        clientePaqueteId,
      ]);
      console.log('Filas afectadas por el UPDATE:', updateResult.affectedRows);

      // Obtener el estado actualizado
      const query = `
      SELECT estado, fechaAprobacion, fechaExpiracion, fechaCreacion
      FROM clientesPaquetes
      WHERE clientePaqueteId = ?
    `;
      const [rows] = await this.db.execute(query, [clientePaqueteId]);
      console.log('Resultado del SELECT:', rows);

      return rows[0] || null; // Retorna el estado o null si no existe
    } catch (error) {
      console.error('Error en consultarEstado:', error);
      throw error; // Propaga el error para manejo superior
    }
  }
}

module.exports = PaquetesService;
