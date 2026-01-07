const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { auth } = require('../middleware/auth');
const {
  validateRequired,
  validateNumeric,
  validateEnum,
} = require('../middleware/validation');

// Get models
let models;
const getModels = () => {
  if (!models) {
    models = require('../models');
  }
  return models;
};

// Validation middleware for inventory items
const validateInventoryItem = (req, res, next) => {
  const { item_name, category, current_quantity, minimum_threshold, unit } = req.body;
  
  const errors = [];
  
  if (!item_name || item_name.trim().length === 0) {
    errors.push('Item name is required');
  }
  
  if (!category) {
    errors.push('Category is required');
  }
  
  if (current_quantity !== undefined && (isNaN(current_quantity) || current_quantity < 0)) {
    errors.push('Current quantity must be a non-negative number');
  }
  
  if (minimum_threshold !== undefined && (isNaN(minimum_threshold) || minimum_threshold < 0)) {
    errors.push('Minimum threshold must be a non-negative number');
  }
  
  if (!unit || unit.trim().length === 0) {
    errors.push('Unit is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
    });
  }
  
  next();
};

// Test endpoint to check if routes are working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Inventory routes are working!', 
    timestamp: new Date().toISOString() 
  });
});

// GET /api/inventory - List all inventory items
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/inventory - Starting request...');
    
    const models = getModels();
    console.log('Models loaded:', Object.keys(models));
    
    const { Inventory } = models;
    if (!Inventory) {
      throw new Error('Inventory model not found');
    }
    
    console.log('Inventory model found, executing query...');
    
    const {
      category,
      status,
      search,
      sort_by = 'item_name',
      sort_order = 'asc',
      page = 1,
      limit = 50,
      include_inactive = 'false',
    } = req.query;

    // Build where clause
    const whereClause = {};
    
    if (include_inactive !== 'true') {
      whereClause.is_active = true;
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { item_name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { supplier: { [Op.like]: `%${search}%` } },
      ];
    }

    // Pagination
    const offset = (page - 1) * limit;
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 items per page

    // Order clause
    const orderClause = [[sort_by, sort_order.toUpperCase()]];

    const { count, rows } = await Inventory.findAndCountAll({
      where: whereClause,
      order: orderClause,
      limit: limitNum,
      offset: offset,
    });

    // Filter by status if requested
    let filteredRows = rows;
    if (status) {
      if (status === 'low_stock') {
        filteredRows = rows.filter(item => item.current_quantity <= item.minimum_threshold);
      } else if (status === 'out_of_stock') {
        filteredRows = rows.filter(item => item.current_quantity === 0);
      } else if (status === 'in_stock') {
        filteredRows = rows.filter(item => item.current_quantity > item.minimum_threshold);
      }
    }

    // Calculate summary statistics
    const summary = {
      total_items: count,
      active_items: rows.filter(item => item.is_active).length,
      low_stock_items: filteredRows.filter(item => item.current_quantity <= item.minimum_threshold).length,
      out_of_stock_items: filteredRows.filter(item => item.current_quantity === 0).length,
      total_value: filteredRows.reduce((sum, item) => sum + ((item.cost_per_unit || 0) * item.current_quantity), 0),
      categories: await Inventory.findAll({
        attributes: ['category', [Inventory.sequelize.fn('COUNT', '*'), 'count']],
        where: { is_active: true },
        group: ['category'],
        raw: true,
      }),
    };

    res.json({
      success: true,
      data: filteredRows,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: count,
        pages: Math.ceil(count / limitNum),
      },
      summary,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      error: 'Failed to fetch inventory items',
      details: error.message,
    });
  }
});

// GET /api/inventory/:id - Get single inventory item
router.get('/:id', auth, async (req, res) => {
  try {
    const { Inventory } = getModels();
    const { id } = req.params;

    const item = await Inventory.findByPk(id);

    if (!item) {
      return res.status(404).json({
        error: 'Inventory item not found',
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      error: 'Failed to fetch inventory item',
      details: error.message,
    });
  }
});

// POST /api/inventory - Add new inventory item
router.post('/', auth, validateInventoryItem, async (req, res) => {
  try {
    const { Inventory } = getModels();
    const {
      item_name,
      category,
      current_quantity = 0,
      minimum_threshold = 10,
      unit,
      cost_per_unit,
      supplier,
      description,
      last_restocked,
    } = req.body;

    // Check if item already exists
    const existingItem = await Inventory.findOne({
      where: { item_name: item_name.trim() },
    });

    if (existingItem) {
      return res.status(409).json({
        error: 'Inventory item already exists',
        suggestion: 'Use PUT /api/inventory/:id to update existing item',
      });
    }

    // Create new inventory item
    const newItem = await Inventory.create({
      item_name: item_name.trim(),
      category,
      current_quantity: parseInt(current_quantity),
      minimum_threshold: parseInt(minimum_threshold),
      unit: unit.trim(),
      cost_per_unit: cost_per_unit ? parseFloat(cost_per_unit) : null,
      supplier: supplier ? supplier.trim() : null,
      description: description ? description.trim() : null,
      last_restocked: last_restocked ? new Date(last_restocked) : null,
      is_active: true,
    });

    // Fetch the created item with virtual fields
    const itemWithVirtuals = await Inventory.findByPk(newItem.id);

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: itemWithVirtuals,
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(err => err.message),
      });
    }
    
    res.status(500).json({
      error: 'Failed to create inventory item',
      details: error.message,
    });
  }
});

// PUT /api/inventory/:id - Update inventory item
router.put('/:id', auth, async (req, res) => {
  try {
    const { Inventory } = getModels();
    const { id } = req.params;
    const updateData = req.body;

    const item = await Inventory.findByPk(id);
    if (!item) {
      return res.status(404).json({
        error: 'Inventory item not found',
      });
    }

    // Handle quantity updates
    if (updateData.current_quantity !== undefined) {
      updateData.current_quantity = parseInt(updateData.current_quantity);
      if (updateData.current_quantity > item.current_quantity) {
        updateData.last_restocked = new Date();
      }
    }

    // Update the item
    await item.update(updateData);

    // Fetch updated item with virtual fields
    const updatedItem = await Inventory.findByPk(id);

    res.json({
      success: true,
      message: 'Inventory item updated successfully',
      data: updatedItem,
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(err => err.message),
      });
    }
    
    res.status(500).json({
      error: 'Failed to update inventory item',
      details: error.message,
    });
  }
});

// PATCH /api/inventory/:id/quantity - Update item quantity (stock in/out)
router.patch('/:id/quantity', auth, async (req, res) => {
  try {
    const { Inventory } = getModels();
    const { id } = req.params;
    const { quantity_change, operation = 'add', reason } = req.body;

    if (!quantity_change || isNaN(quantity_change) || quantity_change <= 0) {
      return res.status(400).json({
        error: 'Valid quantity_change is required',
      });
    }

    const item = await Inventory.findByPk(id);
    if (!item) {
      return res.status(404).json({
        error: 'Inventory item not found',
      });
    }

    let newQuantity;
    if (operation === 'add') {
      newQuantity = item.current_quantity + parseInt(quantity_change);
    } else if (operation === 'subtract') {
      newQuantity = item.current_quantity - parseInt(quantity_change);
    } else {
      return res.status(400).json({
        error: 'Operation must be "add" or "subtract"',
      });
    }

    if (newQuantity < 0) {
      return res.status(400).json({
        error: 'Insufficient stock. Current quantity would become negative.',
        current_quantity: item.current_quantity,
        requested_change: quantity_change,
      });
    }

    // Update quantity and last_restocked if adding stock
    const updateData = {
      current_quantity: newQuantity,
    };
    
    if (operation === 'add') {
      updateData.last_restocked = new Date();
    }

    await item.update(updateData);

    // Fetch updated item
    const updatedItem = await Inventory.findByPk(id);

    res.json({
      success: true,
      message: `Stock ${operation}ed successfully`,
      data: updatedItem,
      change_summary: {
        operation,
        quantity_change: parseInt(quantity_change),
        previous_quantity: item.current_quantity,
        new_quantity: newQuantity,
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error('Error updating inventory quantity:', error);
    res.status(500).json({
      error: 'Failed to update inventory quantity',
      details: error.message,
    });
  }
});

// DELETE /api/inventory/:id - Delete (deactivate) inventory item
router.delete('/:id', auth, async (req, res) => {
  try {
    const { Inventory } = getModels();
    const { id } = req.params;
    const { permanent = false } = req.query;

    const item = await Inventory.findByPk(id);
    if (!item) {
      return res.status(404).json({
        error: 'Inventory item not found',
      });
    }

    if (permanent === 'true') {
      await item.destroy();
      res.json({
        success: true,
        message: 'Inventory item permanently deleted',
      });
    } else {
      await item.update({ is_active: false });
      res.json({
        success: true,
        message: 'Inventory item deactivated',
        data: item,
      });
    }
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      error: 'Failed to delete inventory item',
      details: error.message,
    });
  }
});

// GET /api/inventory/low-stock - Get items running low
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const { Inventory } = getModels();
    
    const lowStockItems = await Inventory.findAll({
      where: {
        is_active: true,
        current_quantity: {
          [Op.lte]: Inventory.sequelize.col('minimum_threshold'),
        },
      },
      order: [['current_quantity', 'ASC']],

    });

    const outOfStockItems = lowStockItems.filter(item => item.current_quantity === 0);
    const criticallyLowItems = lowStockItems.filter(
      item => item.current_quantity > 0 && item.current_quantity <= (item.minimum_threshold * 0.5)
    );

    res.json({
      success: true,
      data: lowStockItems,
      alerts: {
        out_of_stock: outOfStockItems.length,
        critically_low: criticallyLowItems.length,
        total_low_stock: lowStockItems.length,
      },
      summary: {
        out_of_stock_items: outOfStockItems,
        critically_low_items: criticallyLowItems,
      },
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({
      error: 'Failed to fetch low stock items',
      details: error.message,
    });
  }
});

module.exports = router;