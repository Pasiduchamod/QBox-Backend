const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Question = require('../models/Question');
const { protect } = require('../middleware/auth');

// @route   POST /api/rooms/one-time
// @desc    Create a one-time anonymous room (no authentication required)
// @access  Public
router.post('/one-time', async (req, res) => {
  try {
    const { lecturerName } = req.body;

    if (!lecturerName || !lecturerName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your name'
      });
    }

    // Generate unique room code
    const roomCode = await Room.generateRoomCode();

    // Create one-time room (expires in 1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    const room = await Room.create({
      roomName: `${lecturerName.trim()}'s Room`,
      roomCode,
      lecturer: null, // No user account
      lecturerName: lecturerName.trim(),
      questionsVisible: true,
      isOneTime: true,
      expiresAt
    });

    res.status(201).json({
      success: true,
      message: 'One-time room created successfully',
      data: {
        room: {
          _id: room._id,
          roomName: room.roomName,
          code: room.roomCode,
          lecturerName: room.lecturerName,
          expiresAt: room.expiresAt
        }
      }
    });
  } catch (error) {
    console.error('Create one-time room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private (Lecturer)
router.post('/', protect, async (req, res) => {
  try {
    const { roomName, questionsVisible } = req.body;

    if (!roomName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a room name'
      });
    }

    // Check if lecturer already has a room with this name
    const existingRoom = await Room.findOne({
      lecturer: req.user._id,
      roomName: roomName.trim()
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'You already have a room with this name. Please choose a different name.'
      });
    }

    // Generate unique room code
    const roomCode = await Room.generateRoomCode();

    // Create room
    const room = await Room.create({
      roomName,
      roomCode,
      lecturer: req.user._id,
      lecturerName: req.user.name,
      questionsVisible: questionsVisible !== undefined ? questionsVisible : true
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room
    });
  } catch (error) {
    console.error('Create Room Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating room',
      error: error.message
    });
  }
});

// @route   GET /api/rooms
// @desc    Get all rooms for logged-in lecturer
// @access  Private (Lecturer)
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find({ lecturer: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Get Rooms Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rooms',
      error: error.message
    });
  }
});

// @route   GET /api/rooms/:id
// @desc    Get single room by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is the lecturer of this room
    if (room.lecturer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this room'
      });
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get Room Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching room',
      error: error.message
    });
  }
});

// @route   POST /api/rooms/join
// @desc    Join a room with room code (for students)
// @access  Public
router.post('/join', async (req, res) => {
  try {
    const { roomCode } = req.body;

    if (!roomCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a room code'
      });
    }

    const room = await Room.findOne({ 
      roomCode: roomCode.toUpperCase(),
      status: 'active'
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Invalid room code or room is closed'
      });
    }

    // Increment students count
    room.studentsCount += 1;
    await room.save();

    res.status(200).json({
      success: true,
      message: 'Joined room successfully',
      data: {
        roomId: room._id,
        roomName: room.roomName,
        roomCode: room.roomCode,
        lecturerName: room.lecturerName,
        questionsVisible: room.questionsVisible,
        status: room.status
      }
    });
  } catch (error) {
    console.error('Join Room Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error joining room',
      error: error.message
    });
  }
});

// @route   PUT /api/rooms/:id/toggle-visibility
// @desc    Toggle question visibility (public/private)
// @access  Private (Lecturer)
router.put('/:id/toggle-visibility', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is the lecturer
    if (room.lecturer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this room'
      });
    }

    // Toggle visibility
    room.questionsVisible = !room.questionsVisible;
    await room.save();

    res.status(200).json({
      success: true,
      message: `Questions are now ${room.questionsVisible ? 'public' : 'private'}`,
      data: room
    });
  } catch (error) {
    console.error('Toggle Visibility Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling question visibility',
      error: error.message
    });
  }
});

// @route   PUT /api/rooms/:id/close
// @desc    Close a room
// @access  Private (Lecturer)
router.put('/:id/close', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is the lecturer
    if (room.lecturer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to close this room'
      });
    }

    if (room.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Room is already closed'
      });
    }

    room.status = 'closed';
    room.closedAt = Date.now();
    await room.save();

    res.status(200).json({
      success: true,
      message: 'Room closed successfully',
      data: room
    });
  } catch (error) {
    console.error('Close Room Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing room',
      error: error.message
    });
  }
});

// @route   DELETE /api/rooms/:id
// @desc    Delete a room
// @access  Private (Lecturer)
router.delete('/:id', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is the lecturer
    if (room.lecturer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this room'
      });
    }

    // Delete all questions in this room
    await Question.deleteMany({ room: room._id });

    // Delete room
    await room.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Room and all associated questions deleted successfully'
    });
  } catch (error) {
    console.error('Delete Room Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting room',
      error: error.message
    });
  }
});

module.exports = router;
