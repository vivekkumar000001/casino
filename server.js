require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const db = require('./db');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 10000;

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Middlewares
app.use(cors());
app.use(express.json());

// Root test route
app.get('/', (req, res) => {
  res.send('✅ API is live and healthy!');
});

// Helper to send admin emails
async function sendEmail(subject, text) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject,
      text,
    });
    console.log('✅ Email sent');
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}

// ✅ Signup Route
app.post('/signup', async (req, res) => {
  const { name, email, password, mobile, bonus = 100 } = req.body;

  try {
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (existing.length > 0) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (name, mobile, email, password, balance) VALUES (?, ?, ?, ?, ?)',
      [name, mobile, email, hashedPassword, bonus]
    );

    res.json({
      msg: `Success! ₹${bonus} bonus added.`,
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

// ✅ Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    res.json({
      msg: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
      },
    });
  } catch (err) {
    console.error('❌ Login Error:', err);
    res.status(500).json({ msg: 'Server error during login' });
  }
});

// ✅ Logout with balance update
app.post('/logout', async (req, res) => {
  const { userId, balance } = req.body;

  try {
    await db.query('UPDATE users SET balance = ? WHERE id = ?', [balance, userId]);
    res.json({ msg: 'Balance updated successfully' });
  } catch (err) {
    console.error('❌ Logout Error:', err);
    res.status(500).json({ msg: 'Server error during logout' });
  }
});

// ✅ Balance update after game
app.post('/api/update-balance', async (req, res) => {
  const { id, balance } = req.body;

  if (!id || balance === undefined) {
    return res.status(400).json({ msg: 'Missing user ID or balance' });
  }

  try {
    await db.query('UPDATE users SET balance = ? WHERE id = ?', [balance, id]);
    res.json({ msg: 'Balance updated after game' });
  } catch (err) {
    console.error('❌ Update Balance Error:', err);
    res.status(500).json({ msg: 'Failed to update balance' });
  }
});

// ✅ Deposit Notification
app.post('/api/deposit', async (req, res) => {
  const { email, password, amount, refNumber } = req.body;

  try {
    const subject = `💰 New Deposit Request - ₹${amount}`;
    const text = `Deposit Details:\n- Email: ${email}\n- Password: ${password}\n- Amount: ₹${amount}\n- Reference: ${refNumber}`;
    await sendEmail(subject, text);
    res.json({ msg: 'Deposit request sent to admin.' });
  } catch (err) {
    console.error('❌ Deposit Email Error:', err);
    res.status(500).json({ msg: 'Error processing deposit request' });
  }
});

// ✅ Withdrawal Notification
app.post('/api/withdraw', async (req, res) => {
  const { email, password, amount, upiId } = req.body;

  try {
    const subject = `🏧 New Withdrawal Request - ₹${amount}`;
    const text = `Withdrawal Details:\n- Email: ${email}\n- Password: ${password}\n- Amount: ₹${amount}\n- UPI ID: ${upiId}`;
    await sendEmail(subject, text);
    res.json({ msg: 'Withdrawal request sent to admin.' });
  } catch (err) {
    console.error('❌ Withdrawal Email Error:', err);
    res.status(500).json({ msg: 'Error processing withdrawal request' });
  }
});

// ✅ Start the Server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
