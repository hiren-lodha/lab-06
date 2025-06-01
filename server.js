const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const Joi = require('joi');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// Logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

// Enhanced CORS configuration
const allowedOrigins = [
  'https://community-library-web.vercel.app',
  process.env.NODE_ENV === 'development' && 'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.static(path.join(__dirname, 'public')));

// JWT Configuration
const secretKey = process.env.JWT_SECRET;
if (!secretKey && process.env.NODE_ENV === 'production') {
  console.error('FATAL ERROR: JWT_SECRET not configured');
  process.exit(1);
}

// Enhanced JWT Authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const [bearer, token] = authHeader.split(' ');
  
  if (bearer !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    req.user = decoded;
    next();
  });
};

// Data loading and schemas (unchanged)
let users, books, events;
async function loadData() {
  users = (await fs.readFile(path.join(__dirname, 'data', 'users.json'), 'utf8')).users;
  books = (await fs.readFile(path.join(__dirname, 'data', 'books.json'), 'utf8')).books;
  events = (await fs.readFile(path.join(__dirname, 'data', 'events.json'), 'utf8')).events;
}
loadData().catch(err => {
  console.error('Failed to load initial data:', err);
  process.exit(1);
});

const userSchema = Joi.object({ 
  email: Joi.string().email().required(), 
  password: Joi.string().min(6).required(), 
  role: Joi.string().valid('admin', 'staff', 'member').required() 
});

const bookSchema = Joi.object({ 
  title: Joi.string().required(), 
  author: Joi.string().required(), 
  year: Joi.number().integer().required(), 
  genre: Joi.string().required(), 
  isbn: Joi.string().required(), 
  image: Joi.string().uri().optional(), 
  description: Joi.string().optional(), 
  addedDate: Joi.date().iso().required() 
});

const eventSchema = Joi.object({ 
  title: Joi.string().required(), 
  date: Joi.date().required(), 
  location: Joi.string().required(), 
  image: Joi.string().uri().optional(), 
  isUpcoming: Joi.boolean().required(), 
  description: Joi.string().optional() 
});

// Data saving functions (unchanged)
async function saveUsers() {
  await fs.writeFile(path.join(__dirname, 'data', 'users.json'), JSON.stringify({ users }, null, 2));
}
async function saveBooks() {
  await fs.writeFile(path.join(__dirname, 'data', 'books.json'), JSON.stringify({ books }, null, 2));
}
async function saveEvents() {
  await fs.writeFile(path.join(__dirname, 'data', 'events.json'), JSON.stringify({ events }, null, 2));
}

// Routes (unchanged but with better error handling)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(404).json({ error: 'File not found' });
    }
  });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'), (err) => {
    if (err) {
      console.error('Error serving dashboard.html:', err);
      res.status(404).json({ error: 'File not found' });
    }
  });
});

// API Routes (unchanged functionality but with better security)
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, role: user.role }, secretKey, { expiresIn: '1h' });
    res.status(200).json({ token, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    
    if (users.some(u => u.email === req.body.email)) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    const newUser = { id: Date.now().toString(), ...req.body };
    users.push(newUser);
    await saveUsers();
    res.status(201).json(newUser);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ... [rest of your routes remain exactly the same as in your original code] ...

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(port, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
});