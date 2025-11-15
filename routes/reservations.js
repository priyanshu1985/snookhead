const express = require('express');
const router = express.Router();
const { Reservation } = require('../models');

router.get('/', async (req, res) => {
  const list = await Reservation.findAll();
  res.json(list);
});

router.post('/', async (req, res) => {
  try {
    const r = await Reservation.create(req.body);
    res.status(201).json(r);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;
