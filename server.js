const express = require('express');
const path = require('path');
const app = express();

// Your API routes (import your existing backend)
app.use('/api', require('./server/routes')); // Adjust path as needed

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});