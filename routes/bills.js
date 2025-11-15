const express = require('express');
const { Bill, Order } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all bills
router.get('/', auth, async (req, res) => {
  try {
    const bills = await Bill.findAll({ include: [Order] });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create bill
router.post('/', auth, async (req, res) => {
  try {
    const bill = await Bill.create(req.body);
    res.status(201).json(bill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get bill by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findByPk(req.params.id, { include: [Order] });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;