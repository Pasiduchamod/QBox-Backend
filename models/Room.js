const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: [true, 'Please provide a room name'],
    trim: true,
    maxlength: [100, 'Room name cannot be more than 100 characters']
  },
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 6
  },
  lecturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow null for one-time rooms
  },
  lecturerName: {
    type: String,
    required: true
  },
  questionsVisible: {
    type: Boolean,
    default: true,
    description: 'If false, students can only see their own questions'
  },
  isOneTime: {
    type: Boolean,
    default: false,
    description: 'One-time rooms expire after 1 hour and are not tied to a user account'
  },
  expiresAt: {
    type: Date,
    description: 'Expiration time for one-time rooms'
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  },
  questionCount: {
    type: Number,
    default: 0
  },
  studentsCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date
  }
});

// Generate unique 6-character room code
roomSchema.statics.generateRoomCode = async function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomCode;
  let exists = true;

  while (exists) {
    roomCode = '';
    for (let i = 0; i < 6; i++) {
      roomCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const room = await this.findOne({ roomCode });
    exists = !!room;
  }

  return roomCode;
};

module.exports = mongoose.model('Room', roomSchema);
