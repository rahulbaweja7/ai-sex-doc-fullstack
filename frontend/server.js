const express = require('express');
const path = require('path');
const cors = require('cors'); // Install with: npm install cors

const app = express();

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API endpoint
app.post('/api/message', (req, res) => {
  try {
    const userMsg = req.body.message;
    
    if (!userMsg || typeof userMsg !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    // Replace this with your OpenAI call later
    const fakeReply = `Thanks for asking about "${userMsg}". Always happy to help with your sexual health questions.`;

    res.json({ reply: fakeReply });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});