const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

// CORS - Allow frontend to connect
// Trailing slashes are stripped defensively — an origin the browser sends
// never has one (https://example.com, not https://example.com/), but it's
// an easy typo to make when pasting a URL into an env var, and a mismatch
// here silently blocks every request.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Passing an Error here makes the cors middleware forward it to
    // Express's error handling, and with no custom error handler that
    // becomes a 500 — which makes a plain CORS mismatch look like the
    // server itself is broken (it shows up as "preflight failed with
    // status 500" instead of a clean CORS block). Calling back with
    // `false` instead just omits the CORS headers, so the browser blocks
    // the response the normal way and the real cause stays visible in the
    // console as an access-control error rather than a server crash.
    console.warn(`CORS: rejected request from origin "${origin}". Allowed origins: ${allowedOrigins.join(', ')}`);
    return callback(null, false);
  },
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
const authRoutes = require('./src/routes/auth.js');
const academicRoutes = require('./src/routes/academics.js');
app.use('/api/auth', authRoutes);
app.use('/api/academics', academicRoutes);

app.get('/', (req, res) => {
  res.send('GPAce API is running!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});
