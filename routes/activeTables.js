const express = require('express');
const router = express.Router();
const { ActiveTable, TableAsset, Bill } = require('../models');
const { auth, authorize } = require('../middleware/auth');

// start a table session
router.post('/start', auth, authorize('staff','owner','admin'), async (req, res) => {
  try {
    const { table_id, user_id } = req.body;
    const t = await TableAsset.findByPk(table_id);
    if (!t) return res.status(404).json({ error: 'Table not found' });
    if (t.status === 'occupied') return res.status(400).json({ error: 'Table occupied' });
    const session = await ActiveTable.create({ table_id, user_id, start_time: new Date(), status: 'active' });
    await t.update({ status: 'occupied' });
    res.json(session);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// stop session and create a simple bill
router.post('/stop', auth, authorize('staff','owner','admin'), async (req, res) => {
  try {
    const { session_id } = req.body;
    const s = await ActiveTable.findByPk(session_id);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    s.end_time = new Date();
    s.status = 'closed';
    await s.save();
    const t = await TableAsset.findByPk(s.table_id);
    if (t) await t.update({ status: 'available' });
    // create a minimal bill (you may enhance calculation)
    const bill = await Bill.create({ table_id: s.table_id, amount: req.body.amount || 0, paid: false, createdAt: new Date() });
    res.json({ session: s, bill });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
