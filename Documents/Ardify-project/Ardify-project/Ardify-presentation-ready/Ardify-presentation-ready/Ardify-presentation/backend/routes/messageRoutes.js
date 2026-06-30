const express = require("express");
const { Message, Conversation } = require("../models/Message");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// @POST /api/messages/conversation/create
// Create or get conversation
router.post("/conversation/create", verifyToken, async (req, res) => {
  try {
    const { participantIds, courseId } = req.body;

    // Add current user to participants if not already there
    if (!participantIds.includes(req.userId)) {
      participantIds.push(req.userId);
    }

    // Check if conversation already exists (for direct messages)
    if (participantIds.length === 2) {
      const existingConversation = await Conversation.findOne({
        conversationType: "direct",
        participants: { $all: participantIds },
      });

      if (existingConversation) {
        return res.json(existingConversation);
      }
    }

    // Create new conversation
    const conversation = new Conversation({
      participants: participantIds,
      conversationType: participantIds.length === 2 ? "direct" : "group",
      course: courseId,
      unreadCount: new Map(),
    });

    await conversation.save();
    await conversation.populate(
      "participants",
      "firstName lastName profileImage",
    );

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @GET /api/messages/conversations
// Get all conversations for user
router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId,
      archivedBy: { $ne: req.userId },
    })
      .populate("participants", "firstName lastName profileImage")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 });

    res.json({
      conversations,
      total: conversations.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @GET /api/messages/conversation/:conversationId
// Get conversation details
router.get("/conversation/:conversationId", verifyToken, async (req, res) => {
  try {
    const conversation = await Conversation.findById(
      req.params.conversationId,
    ).populate("participants", "firstName lastName profileImage");

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Check if user is participant
    if (
      !conversation.participants.some((p) => p._id.toString() === req.userId)
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @GET /api/messages/conversation/:conversationId/messages
// Get messages from conversation
router.get(
  "/conversation/:conversationId/messages",
  verifyToken,
  async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const skip = (page - 1) * limit;

      const conversation = await Conversation.findById(
        req.params.conversationId,
      );
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Check if user is participant
      if (!conversation.participants.includes(req.userId)) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const messages = await Message.find({
        conversation: req.params.conversationId,
      })
        .populate("sender", "firstName lastName profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      // Mark messages as read
      await Message.updateMany(
        {
          conversation: req.params.conversationId,
          isRead: false,
          sender: { $ne: req.userId },
        },
        { isRead: true, readAt: Date.now() },
      );

      res.json({
        messages: messages.reverse(),
        pagination: {
          page: Number(page),
          limit: Number(limit),
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// @POST /api/messages/send
// Send message
router.post("/send", verifyToken, async (req, res) => {
  try {
    const { conversationId, content, attachments } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Message content is required" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Check if user is participant
    if (!conversation.participants.includes(req.userId)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const message = new Message({
      sender: req.userId,
      conversation: conversationId,
      content,
      attachments: attachments || [],
    });

    await message.save();
    await message.populate("sender", "firstName lastName profileImage");

    // Update last message in conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = Date.now();
    await conversation.save();

    res.status(201).json({
      message,
      conversationId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @PUT /api/messages/:messageId/edit
// Edit message
router.put("/:messageId/edit", verifyToken, async (req, res) => {
  try {
    const { content } = req.body;

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    message.originalContent = message.content;
    message.content = content;
    message.isEdited = true;
    message.editedAt = Date.now();
    await message.save();

    res.json({ message: "Message updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @DELETE /api/messages/:messageId
// Delete message
router.delete("/:messageId", verifyToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await Message.findByIdAndDelete(req.params.messageId);

    res.json({ message: "Message deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
