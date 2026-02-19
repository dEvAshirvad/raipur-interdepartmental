const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const { name, department, subject, message, email, phone } = req.body;

  if (!name || !subject || !message || !email) {
    return res.status(400).json({ error: 'Name, email, subject, and message are required.' });
  }

  if (name.length > 200 || subject.length > 300 || message.length > 5000 || email.length > 254) {
    return res.status(400).json({ error: 'One or more fields exceed maximum length.' });
  }

  // TODO: In production, save to a database table or forward via email (nodemailer).
  // Logging only non-PII metadata for operational visibility.
  console.log('Contact form submitted:', { department: department || 'N/A', subject });

  res.status(200).json({
    success: true,
    message: 'Your message has been received. The concerned department will respond within 3 working days.'
  });
});

module.exports = router;
