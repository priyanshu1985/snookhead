const express = require('express');
const router = express.Router();
const { ActiveTable, TableAsset, Order, Bill } = require('../models');
const { auth, authorize } = require('../middleware/auth');

// Start a table session
// body: { table_id, game_id, user_id? }
router.post('/start', auth, authorize('staff','owner','admin'), async (req, res) => {
  try {
    const { table_id, game_id, user_id } = req.body;

    // verify table exists for given game
    const table = await TableAsset.findOne({
      where: {
        id: table_id,
        game_id
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Table for this game not found' });
    }

    if (table.status !== 'available') {
      return res.status(400).json({ error: 'Table is not available' });
    }

    // create active session
    const session = await ActiveTable.create({
      table_id: String(table_id),   // active_tables.table_id is VARCHAR
      game_id,
      start_time: new Date(),
      status: 'active'
    });

    // create order linked to this session
    const order = await Order.create({
      userId: user_id ?? req.user.id ?? null,
      total: 0,
      status: 'pending',
      active_id: session.active_id
    });

    await table.update({ status: 'reserved' });

    res.status(201).json({
      message: 'Session started',
      session,
      order
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// Stop a table session and generate bill
// body: { active_id }
router.post('/stop', auth, authorize('staff','owner','admin'), async (req, res) => {
  try {
    const { active_id } = req.body;

    const session = await ActiveTable.findByPk(active_id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // close session
    const endTime = new Date();
    const startTime = new Date(session.start_time);
    session.end_time = endTime;
    session.status = 'completed';
    await session.save();

    // get table info (pricePerMin + frameCharge)
    const table = await TableAsset.findOne({
      where: {
        id: session.table_id,
        game_id: session.game_id
      }
    });

    if (!table) {
      return res.status(500).json({ error: 'Linked table not found for billing' });
    }

    // compute time in minutes (rounded up)
    const diffMs = endTime - startTime;
    const minutes = Math.ceil(diffMs / 60000);

    const pricePerMin = Number(table.pricePerMin || 0);
    const frameCharge = Number(table.frameCharge || 0);
    const tableAmount = minutes * pricePerMin + frameCharge;

    // get food total from order
    const order = await Order.findOne({
      where: { active_id: session.active_id }
    });

    const foodTotal = order ? Number(order.total || 0) : 0;
    const grandTotal = tableAmount + foodTotal;

    if (order) {
      order.total = grandTotal;
      order.status = 'paid';
      await order.save();
    }

    // create bill record
    const bill = await Bill.create({
      orderId: order ? order.id : null,
      total: grandTotal,
      status: 'pending',
      details: JSON.stringify({
        table_id: session.table_id,
        game_id: session.game_id,
        minutes,
        pricePerMin,
        frameCharge,
        tableAmount,
        foodTotal
      })
    });

    // free the table
    if (table) {
      await table.update({ status: 'available' });
    }

    res.json({
      message: 'Bill generated',
      session,
      bill,
      breakdown: {
        minutes,
        tableAmount,
        foodTotal,
        total: grandTotal
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
