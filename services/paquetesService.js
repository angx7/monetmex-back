class PaquetesService {
  constructor(db) {
    this.db = db;
  }

  async getAll() {
    try {
      const [rows] = await this.db.query('SELECT * FROM paquetes');
      return rows;
    } catch (error) {
      console.error('Error al obtener los paquetes:', error);
      throw error;
    }
  }

  // Crear una nueva solicitud de paquete
  async crearSolicitud(clienteId, paqueteId) {
    const query = `
    INSERT INTO clientespaquetes (clienteId, paqueteId, estado, sesionesRestantes, fechaCreacion)
    SELECT ?, ?, 'pendiente', paquetes.cantidadDeSesiones, NOW()
    FROM paquetes
    WHERE paquetes.paqueteId = ?
  `;
    const [result] = await this.db.execute(query, [
      clienteId,
      paqueteId,
      paqueteId,
    ]);
    return result; // Retorna el resultado para obtener el ID generado
  }

  // Aprobar una solicitud existente y calcular la fecha de expiración
  async aprobarSolicitud(id) {
    // Consulta para obtener la duración del paquete
    const getPackageQuery = `
    SELECT paquetes.duracionDias
    FROM clientespaquetes
    JOIN paquetes ON clientespaquetes.paqueteId = paquetes.paqueteId
    WHERE clientespaquetes.clientePaqueteId = ? AND clientespaquetes.estado = 'pendiente'
  `;
    const [rows] = await this.db.execute(getPackageQuery, [id]);

    if (rows.length === 0) {
      return false; // La solicitud no existe o no está en estado "pendiente"
    }

    const duracionDias = rows[0].duracionDias;

    // Actualizar el estado a "aprobado", la fecha de aprobación y calcular la fecha de expiración
    const updateQuery = `
    UPDATE clientespaquetes
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
      UPDATE clientespaquetes
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
      SELECT estado, fechaAprobacion, fechaExpiracion, fechaCreacion, sesionesRestantes
      FROM clientespaquetes
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

  // Obtener todos los paquetes de un cliente específico
  async obtenerPaquetesPorCliente(clienteId) {
    try {
      const query = `
      SELECT
        p.paqueteId,
        p.nombrePaquete,
        p.duracionDias,
        cp.estado,
        cp.sesionesRestantes,
        cp.fechaAprobacion,
        cp.fechaExpiracion
      FROM clientespaquetes cp
      JOIN paquetes p ON cp.paqueteId = p.paqueteId
      WHERE cp.clienteId = ?
    `;
      const [rows] = await this.db.execute(query, [clienteId]);
      return rows;
    } catch (error) {
      console.error('Error al obtener los paquetes del cliente:', error);
      throw error;
    }
  }
}

module.exports = PaquetesService;
