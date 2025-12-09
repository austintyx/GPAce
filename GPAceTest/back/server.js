const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT;

app.use(express.json());

// CORS - Allow frontend to connect
app.use(cors({
  origin: 'http://localhost:3000', // Your React app URL
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
const authRoutes = require('./src/routes/auth.js');
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('GPAce API is running!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});