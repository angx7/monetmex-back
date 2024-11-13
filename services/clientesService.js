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
  }) {
    try {
      // Verifica si el correo ya existe
      const existingClient = await this.getClientByEmail(emailCliente);
      if (existingClient) {
        // Si el cliente ya existe, lanza un error con un mensaje personalizado
        const error = new Error('El correo electrónico ya está registrado');
        error.status = 400;
        throw error;
      }

      // Si no existe, inserta el nuevo cliente
      const [result] = await this.db.query(
        'INSERT INTO clientes (nombreCliente, emailCliente, telefonoCliente, passwordCliente, bloqueoPagoCaja) VALUES (?, ?, ?, ?, ?)',
        [
          nombreCliente,
          emailCliente,
          telefonoCliente,
          passwordCliente,
          bloqueoPagoCaja,
        ]
      );
      return {
        id: result.insertId,
        nombreCliente,
        emailCliente,
        telefonoCliente,
      };
    } catch (error) {
      console.error('Error al agregar cliente:', error);
      throw error;
    }
  }

  // Agrega más métodos según sea necesario, usando this.db para las consultas
}

module.exports = ClientService;
