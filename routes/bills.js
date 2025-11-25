const express = require('express');
const router = express.Router();
const { Bill, Order, ActiveTable } = require('../models');
const { auth, authorize } = require('../middleware/auth');

// list bills
router.get('/', auth, authorize('staff','owner','admin'), async (req, res) => {
  try {
    const list = await Bill.findAll();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// pay bill
router.post('/:id/pay', auth, authorize('staff','owner','admin'), async (req, res) => {
  try {
    const bill = await Bill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Not found' });

    bill.status = 'paid';
    await bill.save();

    res.json({ success: true, bill });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get all bills for a given game + table
router.get('/by-game-table/:game_id/:table_id', auth, authorize('staff','owner','admin'), async (req, res) => {
  try {
    const { game_id, table_id } = req.params;

    const bills = await Bill.findAll({
      include: [{
        model: Order,
        include: [{
          model: ActiveTable,
          where: {
            game_id: Number(game_id),
            table_id: String(table_id)
          }
        }]
      }]
    });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
