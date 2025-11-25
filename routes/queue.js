const express = require('express');
const router = express.Router();
const { Queue, Reservation, TableAsset } = require('../models');
const { auth, authorize } = require('../middleware/auth');

// list queue
router.get('/', auth, async (req, res) => {
  try { const list = await Queue.findAll(); res.json(list); } catch (err) { res.status(500).json({ error: err.message }); }
});

// move next to active table (simple)
router.post('/next', auth, authorize('staff','owner','admin'), async (req, res) => {
  try {
    const next = await Queue.findOne({ where: { status: 'waiting' }, order: [['createdAt','ASC']] });
    if (!next) return res.status(400).json({ error: 'Queue empty' });
    // find table
    const t = await TableAsset.findOne({ where: { status: 'available' } });
    if (!t) return res.status(400).json({ error: 'No available table' });
    // assign
    next.status = 'seated';
    next.table_id = t.table_id;
    await next.save();
    await t.update({ status: 'occupied' });
    res.json({ success: true, queue: next, table: t });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// clear queue
router.post('/clear', auth, authorize('admin'), async (req, res) => {
  try { await Queue.update({ status: 'cancelled' }, { where: {} }); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
