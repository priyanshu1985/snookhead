const express = require('express');
const router = express.Router();
const { MenuItem } = require('../models');
const { auth, authorize } = require('../middleware/auth');

// --------------------------------------------------
// GET ALL MENU ITEMS + Filters + Search + Pagination
// --------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, page = 1, limit = 20 } = req.query;

    const where = {};

    if (category) where.category = category;
    if (minPrice) where.price = { ...where.price, $gte: minPrice };
    if (maxPrice) where.price = { ...where.price, $lte: maxPrice };
    if (search) where.name = { $like: `%${search}%` };

    const items = await MenuItem.findAll({
      where,
      offset: (page - 1) * limit,
      limit: parseInt(limit)
    });

    res.json({
      total: items.length,
      currentPage: page,
      data: items
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// GET MENU ITEM BY ID
// --------------------------------------------------
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });

    res.json(item);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// ADD MENU ITEM
// --------------------------------------------------
router.post('/', auth, authorize('staff', 'admin'), async (req, res) => {
  try {
    const { name, category, price } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ error: 'name, category, and price are required' });
    }

    const allowedCategories = ['prepared', 'packed', 'cigarette'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const item = await MenuItem.create(req.body);

    res.status(201).json({
      message: "Menu item created successfully",
      item
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// UPDATE MENU ITEM
// --------------------------------------------------
router.put('/:id', auth, authorize('staff', 'admin'), async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);

    if (!item) return res.status(404).json({ error: 'Menu item not found' });

    await item.update(req.body);

    res.json({
      message: "Menu item updated successfully",
      item
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// DELETE MENU ITEM
// --------------------------------------------------
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);

    if (!item) return res.status(404).json({ error: 'Menu item not found' });

    await item.destroy();

    res.json({ message: 'Menu item deleted successfully' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// UPDATE STOCK (increase / decrease)
// --------------------------------------------------
router.patch('/:id/stock', auth, authorize('staff', 'admin'), async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity == null) {
      return res.status(400).json({ error: "Quantity is required" });
    }

    const item = await MenuItem.findByPk(req.params.id);

    if (!item) return res.status(404).json({ error: 'Menu item not found' });

    // Update stock
    item.stock = item.stock + Number(quantity);

    if (item.stock < 0) item.stock = 0;

    await item.save();

    res.json({
      message: "Stock updated",
      stock: item.stock
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------
// GET LOW STOCK ITEMS
// --------------------------------------------------
router.get('/alerts/low-stock', auth, authorize('staff', 'admin'), async (req, res) => {
  try {
    const items = await MenuItem.findAll({
      where: {
        $expr: { $lt: ["stock", "threshold"] }
      }
    });

    res.json({
      total: items.length,
      lowStockItems: items
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
