const express = require('express');
const router = express.Router();
const { Bill } = require('../models');
const { auth, authorize } = require('../middleware/auth');

// list bills
router.get('/', auth, authorize('staff','owner','admin'), async (req, res) => {
  try { const list = await Bill.findAll(); res.json(list); } catch (err) { res.status(500).json({ error: err.message }); }
});

// pay bill
router.post('/:id/pay', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const b = await Bill.findByPk(id);
    if (!b) return res.status(404).json({ error: 'Not found' });
    b.paid = true;
    b.paidAt = new Date();
    await b.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
