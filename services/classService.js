class classService {
  constructor(db) {
    this.db = db;
  }

  // Función para calcular el próximo día según el día de la semana
  getNextDay(date, diaSemana) {
    const dayNames = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miercoles',
      'Jueves',
      'Viernes',
      'Sabado',
    ];

    const today = new Date(date);
    const currentDay = today.getDay(); // 0 es Domingo, 1 es Lunes, etc.

    // Obtener el índice del día de la semana solicitado
    const targetDay = dayNames.indexOf(diaSemana);

    if (targetDay === -1) {
      throw new Error('Día de la semana inválido: ' + diaSemana);
    }

    // Calcular la diferencia en días para el próximo día solicitado
    const daysToTarget = (targetDay - currentDay + 7) % 7; // Si el día es el mismo, devuelve 0
    today.setDate(today.getDate() + daysToTarget);

    return today;
  }

  async getBloqueoPagoCaja(clienteId) {
    try {
      const query = 'SELECT bloqueoPagoCaja FROM clientes WHERE clienteId = ?';
      const [rows] = await this.db.query(query, [clienteId]);
      return rows[0].bloqueoPagoCaja;
    } catch (error) {
      console.error('Error al obtener el bloqueo de pago en caja:', error);
      throw error;
    }
  }

  // Función para realizar la reserva
  async reserveClass({ claseId, clienteId, metodoPago, paqueteId, diaSemana }) {
    const today = new Date();

    // Calculamos el próximo día de la semana
    const nextDay = this.getNextDay(today, diaSemana); // Se pasa diaSemana desde el frontend
    const formattedDate = nextDay.toISOString().split('T')[0]; // YYYY-MM-DD

    // Verificar si el pago es en "Caja" y el cliente puede pagar en caja
    let estadoPago = ''; // Definimos la variable estadoPago aquí

    if (metodoPago === 'Caja') {
      const bloqueoPagoCaja = await this.getBloqueoPagoCaja(clienteId);

      // Si el cliente tiene bloqueoPagoCaja en true, no puede pagar en caja
      if (bloqueoPagoCaja === 1) {
        throw new Error('El cliente no puede pagar en caja debido a bloqueo');
      }

      // Si el pago es en caja, se establece el estado de pago como "pagado"
      estadoPago = 'pagado';
    } else {
      // Si el pago es digital, el estado de pago será "pendiente"
      estadoPago = 'pendiente';
    }

    // Si el paqueteId no se proporciona, lo dejamos como null
    if (!paqueteId) {
      paqueteId = null;
    } else {
      // Verificar que el paquete pertenezca al cliente
      const queryPaquete = `
      SELECT clienteId, sesionesRestantes, fechaExpiracion
      FROM clientespaquetes
      WHERE clienteId = ? AND paqueteId = ? AND sesionesRestantes > 0 AND fechaExpiracion > NOW()
        `;
      const [rowsPaquete] = await this.db.query(queryPaquete, [
        clienteId,
        paqueteId,
      ]);
      if (rowsPaquete.length === 0) {
        throw new Error(
          'El paquete no pertenece al cliente, no tiene sesiones restantes o ha expirado'
        );
      }
      const updateSesiones = `
      UPDATE clientespaquetes
      SET sesionesRestantes = sesionesRestantes - 1
      WHERE clienteId = ? AND paqueteId = ?
      `;
      await this.db.query(updateSesiones, [clienteId, paqueteId]);
      metodoPago = 'Paquete';
    }

    // revisar si hay lugares disponibles
    const queryLugares = `
    SELECT lugaresDisponibles
    FROM horarios
    WHERE id = ?
  `;
    const [rowsLugares] = await this.db.query(queryLugares, [claseId]);
    const lugaresDisponibles = rowsLugares[0].lugaresDisponibles;
    if (lugaresDisponibles === 0) {
      throw new Error('No hay lugares disponibles en esta clase');
    }

    // Insertar la reserva en la base de datos
    const queryInsert = `
    INSERT INTO asistencia (claseId, clienteId, fecha, metodoPago, estadoPago, paqueteId)
    VALUES (?, ?, ?, ?, ?, ?)
    `;

    const queryUpdate = `
    UPDATE horarios
    SET lugaresDisponibles = lugaresDisponibles - 1
    WHERE id = ?
    `;

    try {
      // Iniciar una transacción
      // await this.db.beginTransaction();

      // Insertar la reserva en la tabla asistencia
      const [result] = await this.db.query(queryInsert, [
        claseId,
        clienteId,
        formattedDate,
        metodoPago,
        estadoPago,
        paqueteId,
      ]);

      // Actualizar los lugares disponibles en la tabla horarios
      await this.db.query(queryUpdate, [claseId]);

      // Confirmar la transacción
      // await this.db.commit();

      return { message: 'Reserva realizada', idReserva: result.insertId };
    } catch (err) {
      // Revertir la transacción en caso de error
      await this.db.rollback();
      throw new Error('Error al realizar la reserva: ' + err.message);
    }
  }

  async getApprovedPackagesByName(clienteId, searchTerm) {
    try {
      const query = `
        SELECT
            cp.clienteId,
            cp.paqueteId,
            p.nombrePaquete AS nombrePaquete,
            cp.estado,
            cp.sesionesRestantes,
            cp.fechaExpiracion
        FROM
            clientespaquetes cp
        INNER JOIN
            paquetes p ON cp.paqueteId = p.paqueteId
        WHERE
            cp.clienteId = ? AND
            cp.estado = 'aprobado' AND
            cp.sesionesRestantes > 0 AND
            cp.fechaExpiracion > NOW() AND
            p.nombrePaquete LIKE ?;
      `;
      const [rows] = await this.db.query(query, [clienteId, `%${searchTerm}%`]);
      return rows;
    } catch (error) {
      console.error('Error al obtener paquetes aprobados por nombre:', error);
      throw error;
    }
  }

  async getClassesByDay(diaSemana) {
    try {
      const [rows] = await this.db.query(
        `SELECT * FROM horarios WHERE diaSemana = ?`,
        [diaSemana]
      );
      return rows;
    } catch (error) {
      console.error('Error al obtener clases por día:', error);
      throw error;
    }
  }

  // Método para obtener horarios por día de la semana y disciplina
  async getHorariosByDayAndDisciplina(diaSemana, disciplina) {
    try {
      const query = `
        SELECT
            h.id AS Clase,
            h.lugaresDisponibles,
            h.horaInicio,
            c.disciplina
        FROM
            horarios h
        INNER JOIN
            clases c ON h.claseId = c.claseId
        WHERE
            h.diaSemana = ? AND
            c.disciplina LIKE ?;
      `;
      const [rows] = await this.db.query(query, [diaSemana, `%${disciplina}%`]);
      return rows;
    } catch (error) {
      console.error('Error al obtener los horarios:', error);
      throw error;
    }
  }
}

module.exports = classService;