import express from 'express';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser'; 
import { agentes } from './data/agentes.js';

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para parsear JSON en las solicitudes
app.use(express.json());

// Servir archivos estáticos desde la carpeta public
app.use(express.static('public'));

// Endpoint para servir el archivo index.html
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

// Endpoint para autenticar a un agente y generar un token JWT
app.post('/SignIn', (req, res) => {
  const { email, password } = req.body;

  console.log(`Email: ${email}, Password: ${password}`); // Agrega esto para depuración

  // Buscar al agente por email y contraseña en la lista de agentes
  const agente = agentes.find(
    (agente) => agente.email === email && agente.password === password
  );

  if (!agente) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  // Generar el token JWT con los datos del agente
  const token = jwt.sign(
    {
      email: agente.email,
    },
    'claveSecreta', 
    { expiresIn: '2m' } // Token expira en 2 minutos
  );

  // Devolver el HTML y guardar el token en SessionStorage
  const htmlResponse = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Agente Autorizado</title>
    </head>
    <body>
      <h1>¡Bienvenido, agente ${agente.email}!</h1>
      <p>Se ha generado un token para su sesión.</p>
      <script>
        // Guardar el token en SessionStorage
        sessionStorage.setItem('token', '${token}');
        // Redirigir al agente a la ruta restringida con el token en los encabezados
        fetch('/ruta-restringida', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + sessionStorage.getItem('token')
          }
        })
        .then(response => {
          if (response.ok) {
            return response.text();
          } else {
            throw new Error('Error: ' + response.status);
          }
        })
        .then(html => {
          document.open();
          document.write(html);
          document.close();
        })
        .catch(error => {
          console.error(error);
          alert('No autorizado o error al cargar la página restringida.');
        });
      </script>
    </body>
    </html>
  `;

  res.send(htmlResponse);
});

// Ruta restringida que verifica el token JWT
app.get('/ruta-restringida', verificarToken, (req, res) => {
  res.send(`<h1>Bienvenido a la ruta restringida, agente ${req.agente.email}!</h1>`);
});

// Middleware para verificar el token JWT
function verificarToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, 'claveSecreta', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.agente = decoded; // Agregar los datos del agente al request
    next();
  });
}

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
