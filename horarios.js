const mysql = require('mysql2/promise'); // Importa mysql2 con soporte de promesas
require('dotenv').config(); // Importa y configura dotenv

// Configurar la conexión a MySQL
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// Función para obtener las fechas de un día específico en un año
function obtenerFechasDeDia(diaSemana, year) {
  const dias = {
    lunes: 1,
    martes: 2,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    domingo: 0, // Ignorado explícitamente
  };

  if (diaSemana === 'domingo') {
    return []; // Devuelve una lista vacía si el día es domingo
  }

  const fechas = [];
  let fecha = new Date(year, 0, 1); // Comienza desde el 1 de enero del año especificado

  // Busca el primer día que coincida con el día de la semana
  while (fecha.getDay() !== dias[diaSemana]) {
    fecha.setDate(fecha.getDate() + 1);
  }

  // Recorre el año completo
  while (fecha.getFullYear() === year) {
    fechas.push(new Date(fecha));
    fecha.setDate(fecha.getDate() + 7); // Suma 7 días para el siguiente día de la semana
  }

  return fechas;
}

// Función principal
async function insertarHorarios() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const year = 2025; // Año para generar los horarios

    // 1. Obtener los datos de las tablas 'clases' y 'clasehorarios'
    const [clases] = await connection.execute(
      'SELECT claseId, capacidad FROM clases'
    );
    const [horarios] = await connection.execute(
      'SELECT claseId, diaSemana, horaInicio, horaFin FROM clasehorarios'
    );

    // 2. Generar e insertar horarios
    for (const horario of horarios) {
      const clase = clases.find((c) => c.claseId === horario.claseId); // Encuentra la clase relacionada

      if (!clase) continue; // Si no hay una clase asociada, ignora

      const fechas = obtenerFechasDeDia(horario.diaSemana.toLowerCase(), year);

      for (const fecha of fechas) {
        const fechaFormateada = fecha.toISOString().split('T')[0]; // Formato 'YYYY-MM-DD'

        const query = `
          INSERT INTO horarios (claseId, diaSemana, fecha, horaInicio, horaFin, lugaresDisponibles)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        await connection.execute(query, [
          horario.claseId,
          horario.diaSemana.toLowerCase(), // Sólo el día de la semana
          fechaFormateada, // Fecha específica
          horario.horaInicio,
          horario.horaFin,
          clase.capacidad,
        ]);

        console.log(
          `Horario insertado: Clase ${horario.claseId} - ${horario.diaSemana} - ${fechaFormateada} (${horario.horaInicio} - ${horario.horaFin})`
        );
      }
    }

    console.log('¡Horarios insertados exitosamente para el año completo!');
  } catch (err) {
    console.error('Error al insertar horarios:', err.message);
  } finally {
    await connection.end(); // Cerrar la conexión
  }
}

insertarHorarios();
