require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const db = require('./db');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 10000; // Render is detecting 10000, not 3001

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // From .env
    pass: process.env.EMAIL_PASS, // From .env
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Root test route
app.get('/', (req, res) => {
  res.send('✅ API is live and healthy!');
});

// Helper function to send emails
async function sendEmail(subject, text) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: subject,
      text: text,
    });
    console.log('✅ Email sent successfully');
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

// ✅ Signup endpoint
app.post('/signup', async (req, res) => {
  const { name, mobile, email, password, bonus = 100 } = req.body;

  try {
    const [existing] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO users (name, mobile, email, password, balance) VALUES (?, ?, ?, ?, ?)',
      [name, mobile, email, hashedPassword, bonus]
    );

    res.json({
      msg: `Success! ₹${bonus} bonus added to your account`,
      user: {
        id: result.insertId,
        name,
        email,
        balance: bonus,
      },
    });
  } catch (err) {
    console.error('❌ Signup Error:', err);
    res.status(500).json({ msg: 'Server error during signup' });
  }
});

// ✅ Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
    };

    res.json({
      msg: 'Login successful',
      user: userData,
    });
  } catch (err) {
    console.error('❌ Login Error:', err);
    res.status(500).json({ msg: 'Server error during login' });
  }
});

// ✅ Logout & balance update
app.post('/logout', async (req, res) => {
  const { userId, balance } = req.body;

  try {
    await db.query(
      'UPDATE users SET balance = ? WHERE id = ?',
      [balance, userId]
    );

    res.json({ msg: 'Balance updated successfully' });
  } catch (err) {
    console.error('❌ Logout Error:', err);
    res.status(500).json({ msg: 'Server error during logout' });
  }
});

// ✅ Game balance update
app.post('/api/update-balance', async (req, res) => {
  const { id, balance } = req.body;

  if (!id || balance === undefined) {
    return res.status(400).json({ msg: 'Missing user ID or balance' });
  }

  try {
    await db.query(
      'UPDATE users SET balance = ? WHERE id = ?',
      [balance, id]
    );

    res.json({ msg: 'Balance updated after game' });
  } catch (err) {
    console.error('❌ Update Balance Error:', err);
    res.status(500).json({ msg: 'Failed to update balance' });
  }
});

// ✅ Deposit notification
app.post('/api/deposit', async (req, res) => {
  const { email, password, amount, refNumber } = req.body;

  try {
    const subject = `New Deposit Request - ₹${amount}`;
    const text = `
New deposit request received:
- Email: ${email}
- Password: ${password}
- Amount: ₹${amount}
- Reference Number: ${refNumber}
    `;
    await sendEmail(subject, text);

    res.json({ msg: 'Deposit request received. You will be notified.' });
  } catch (err) {
    console.error('❌ Deposit Email Error:', err);
    res.status(500).json({ msg: 'Error processing deposit request' });
  }
});

// ✅ Withdrawal notification
app.post('/api/withdraw', async (req, res) => {
  const { email, password, amount, upiId } = req.body;

  try {
    const subject = `New Withdrawal Request - ₹${amount}`;
    const text = `
New withdrawal request received:
- Email: ${email}
- Password: ${password}
- Amount: ₹${amount}
- UPI ID: ${upiId}
    `;
    await sendEmail(subject, text);

    res.json({ msg: 'Withdrawal request received. You will be notified.' });
  } catch (err) {
    console.error('❌ Withdrawal Email Error:', err);
    res.status(500).json({ msg: 'Error processing withdrawal request' });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
