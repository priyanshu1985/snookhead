const express = require('express');
const router = express.Router();
const { Reservation, TableAsset, User } = require('../models');
const { auth, authorize } = require('../middleware/auth');

// list reservations
router.get('/', auth, async (req, res) => {
  try {
    const list = await Reservation.findAll();
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// get reservations for a user
router.get('/user/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const list = await Reservation.findAll({ where: { user_id: id } });
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// auto assign available table (simple first-free)
router.post('/autoassign', auth, async (req, res) => {
  try {
    const { reservationId } = req.body;
    const r = await Reservation.findByPk(reservationId);
    if (!r) return res.status(404).json({ error: 'Reservation not found' });
    // find an available table
    const t = await TableAsset.findOne({ where: { status: 'available' } });
    if (!t) return res.status(400).json({ error: 'No available table' });
    await r.update({ table_id: t.table_id, status: 'assigned' });
    await t.update({ status: 'occupied' });
    res.json({ success: true, table: t });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// cancel reservation
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await Reservation.findByPk(id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    await r.update({ status: 'cancelled' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
