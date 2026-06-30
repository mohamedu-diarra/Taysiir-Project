const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  },

  // Message Content
  content: {
    type: String,
    required: true,
  },
  attachments: [
    {
      fileName: String,
      fileUrl: String,
      fileType: String,
      fileSize: Number,
    },
  ],

  // Message Status
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: Date,

  // Edit History
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: Date,
  originalContent: String,

  // Replies
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for performance
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ isRead: 1 });

const conversationSchema = new mongoose.Schema({
  // Participants
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  ],

  // Info
  conversationType: {
    type: String,
    enum: ["direct", "group"],
    default: "direct",
  },
  conversationName: {
    type: String,
    required: function () {
      return this.conversationType === "group";
    },
  },
  conversationImage: String,

  // Related Course (optional - for course discussions)
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
  },

  // Last Message
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
  },
  lastMessageAt: Date,

  // Unread Count per User
  unreadCount: Map, // userId -> count

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  archivedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ course: 1 });
conversationSchema.index({ lastMessageAt: -1 });

module.exports = {
  Message: mongoose.model("Message", messageSchema),
  Conversation: mongoose.model("Conversation", conversationSchema),
};
