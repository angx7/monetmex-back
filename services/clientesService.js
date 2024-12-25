// clientesService.js
class ClientService {
  constructor(db) {
    this.db = db;
  }

  async getAll() {
    try {
      const [rows] = await this.db.query('SELECT * FROM clientes');
      return rows;
    } catch (error) {
      console.error('Error al obtener los clientes:', error);
      throw error;
    }
  }

  async getClientByEmail(emailCliente) {
    try {
      const [rows] = await this.db.query(
        'SELECT * FROM clientes WHERE emailCliente = ?',
        [emailCliente]
      );
      return rows[0]; // Devolver el primer resultado encontrado o undefined si no hay resultados
    } catch (error) {
      console.error('Error al obtener cliente por email:', error);
      throw error;
    }
  }

  async addCliente({
    nombreCliente,
    emailCliente,
    telefonoCliente,
    passwordCliente,
    bloqueoPagoCaja,
    admon = false, // Nuevo parámetro con valor predeterminado
  }) {
    try {
      // Verifica si el correo ya existe
      const existingClient = await this.getClientByEmail(emailCliente);
      if (existingClient) {
        const error = new Error('El correo electrónico ya está registrado');
        error.status = 400;
        throw error;
      }

      // Inserta el nuevo cliente
      const [result] = await this.db.query(
        `INSERT INTO clientes
      (nombreCliente, emailCliente, telefonoCliente, passwordCliente, bloqueoPagoCaja, admon)
      VALUES (?, ?, ?, ?, ?, ?)`,
        [
          nombreCliente,
          emailCliente,
          telefonoCliente,
          passwordCliente,
          bloqueoPagoCaja,
          admon, // Incluye el nuevo campo
        ]
      );
      return {
        id: result.insertId,
        nombreCliente,
        emailCliente,
        telefonoCliente,
        admon, // Devuelve el estado de admon
      };
    } catch (error) {
      console.error('Error al agregar cliente:', error);
      throw error;
    }
  }

  async cancelarClase(clienteId, claseId, fecha) {
    try {
      // Verificar si la clase existe
      const [existingClass] = await this.db.query(
        'SELECT * FROM asistencia WHERE clienteId = ? AND claseId = ? AND fecha = ?',
        [clienteId, claseId, fecha]
      );

      if (!existingClass.length) {
        throw new Error(
          'La clase no existe o no está registrada para el cliente'
        );
      }
      // Verificar que el metodoPago sea diferente de "Caja"
      const [metodoPago] = await this.db.query(
        'SELECT metodoPago FROM asistencia WHERE clienteId = ? AND claseId = ? AND fecha = ?',
        [clienteId, claseId, fecha]
      );

      // if (!metodoPago.length) {
      //   throw new Error('Método de pago no encontrado');
      // }

      if (metodoPago[0].metodoPago === 'Caja') {
        // Cancelar la clase
        const query = `
        DELETE FROM asistencia
        WHERE clienteId = ? AND claseId = ? AND fecha = ?
      `;
        const [result] = await this.db.query(query, [
          clienteId,
          claseId,
          fecha,
        ]);

        // Aumentar los lugares disponibles en la tabla horarios
        await this.db.query(
          'UPDATE horarios SET lugaresDisponibles = lugaresDisponibles + 1 WHERE claseId = ? AND fecha = ?',
          [claseId, fecha]
        );

        return {
          message: 'Clase cancelada correctamente',
          metodoPago: metodoPago[0].metodoPago,
        };
      }

      // Obtener la hora de inicio de la clase
      const [clase] = await this.db.query(
        'SELECT horaInicio FROM horarios WHERE claseId = ? AND fecha = ?',
        [claseId, fecha]
      );

      if (!clase.length) {
        throw new Error('Clase no encontrada');
      }

      const horaInicio = clase[0].horaInicio;

      // Combinar la fecha y la hora de inicio para obtener el DateTime de la clase
      const fechaHoraClase = new Date(`${fecha}T${horaInicio}`);

      // Obtener la fecha y hora actual
      const ahora = new Date();

      // Verificar si faltan más de 24 horas para la clase
      const diferenciaHoras = (fechaHoraClase - ahora) / (1000 * 60 * 60);

      if (diferenciaHoras > 24) {
        // Obtener la disciplina de la clase
        const [disciplina] = await this.db.query(
          'SELECT disciplina FROM clases WHERE claseId = ?',
          [claseId]
        );

        if (!disciplina.length) {
          throw new Error('Disciplina no encontrada');
        }

        const nombreDisciplina = disciplina[0].disciplina;

        // Obtener el paquete de cancelación correspondiente a la disciplina
        const [paquete] = await this.db.query(
          'SELECT paqueteId FROM paquetes WHERE nombrePaquete = ?',
          [`${nombreDisciplina} Cancelacion`]
        );

        if (!paquete.length) {
          throw new Error('Paquete de cancelación no encontrado');
        }

        const paqueteId = paquete[0].paqueteId;

        // Insertar el paquete de cancelación en la tabla clientespaquetes
        await this.db.query(
          `INSERT INTO clientespaquetes (clienteId, paqueteId, estado, sesionesRestantes, fechaCreacion, fechaAprobacion, fechaExpiracion)
          SELECT ?, ?, 'aprobado', paquetes.cantidadDeSesiones, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL paquetes.duracionDias DAY)
          FROM paquetes
          WHERE paquetes.paqueteId = ?`,
          [clienteId, paqueteId, paqueteId]
        );
        console.log('Clase cancelada con más de 24 horas de anticipación');
      }

      // Cancelar la clase
      const query = `
        DELETE FROM asistencia
        WHERE clienteId = ? AND claseId = ? AND fecha = ?
      `;
      const [result] = await this.db.query(query, [clienteId, claseId, fecha]);

      // Aumentar los lugares disponibles en la tabla horarios
      await this.db.query(
        'UPDATE horarios SET lugaresDisponibles = lugaresDisponibles + 1 WHERE claseId = ? AND fecha = ?',
        [claseId, fecha]
      );

      return {
        message: 'Clase cancelada correctamente',
        metodoPago: metodoPago[0].metodoPago,
      };
    } catch (error) {
      console.error('Error al cancelar la clase:', error);
      throw error;
    }
  }

  async getNextClass(clienteId) {
    try {
      const [user] = await this.db.query(
        'SELECT * FROM clientes WHERE clienteId = ?',
        [clienteId]
      );

      if (!user.length) {
        throw new Error('Cliente no encontrado');
      }
      const [clase] = await this.db.query(
        `SELECT clases.disciplina, horarios.fecha, horarios.horaInicio, horarios.horaFin
        FROM asistencia
        JOIN horarios ON asistencia.claseId = horarios.claseId AND asistencia.fecha = horarios.fecha
        JOIN clases ON asistencia.claseId = clases.claseId
        WHERE asistencia.clienteId = ?
        ORDER BY horarios.fecha ASC
        LIMIT 1`,
        [clienteId]
      );

      if (!clase.length) {
        return { message: 'No hay clases próximas' };
      }

      return clase[0];
    } catch (error) {
      console.error('Error al obtener la próxima clase:', error);
      throw error;
    }
  }
}

module.exports = ClientService;
