const { getConversation, sendMessage } = require('../services/message.service');
const { serializeContact } = require('../middleware/privacy');

const MAX_MESSAGE_LENGTH = 4000;

function isPositiveId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

async function createMessage(req, res) {
  const listingId = req.body.listingId ?? req.body.listing_id;
  const receiverId = req.body.receiverId ?? req.body.receiver_id;
  const content = req.body.content;

  if (!req.user.profileId) {
    return res.status(403).json({
      error: 'A registered user profile is required to send messages.',
    });
  }

  if (
    !isPositiveId(listingId) ||
    !isPositiveId(receiverId) ||
    String(receiverId) === String(req.user.profileId) ||
    typeof content !== 'string' ||
    !content.trim() ||
    content.trim().length > MAX_MESSAGE_LENGTH
  ) {
    return res.status(400).json({
      error:
        'Valid listingId, receiverId, and content between 1 and 4000 characters are required.',
    });
  }

  try {
    const result = await sendMessage({
      senderId: req.user.profileId,
      senderRole: req.user.role,
      receiverId,
      listingId,
      content: content.trim(),
    });
    const canRevealContactDetails =
      req.user.role === 'admin' || result.verifiedContact;

    return res.status(201).json({
      message: {
        id: String(result.message.id),
        listingId: String(result.message.listing_id),
        senderId: String(result.message.sender_id),
        receiver: serializeContact(
          {
            id: result.receiver.receiver_id,
            name: result.receiver.receiver_name,
            role: result.receiver.receiver_role,
            email: result.receiver.receiver_email,
            phone: result.receiver.receiver_phone,
            masked_phone: result.receiver.receiver_masked_phone,
          },
          canRevealContactDetails
        ),
        content: result.message.content,
        isMasked: result.message.is_masked,
        contactStatus: result.verifiedContact ? 'verified' : 'preliminary',
        createdAt: result.message.created_at,
      },
    });
  } catch (error) {
    if (error.code === 'MESSAGE_CONTEXT_NOT_FOUND') {
      return res.status(404).json({ error: 'Listing or recipient not found.' });
    }

    if (error.code === 'MESSAGE_FORBIDDEN') {
      return res.status(403).json({ error: error.message });
    }

    console.error('Message send failed:', error.message);
    return res.status(500).json({ error: 'Unable to send message.' });
  }
}

async function getMessages(req, res) {
  if (!req.user.profileId) {
    return res.status(403).json({
      error: 'A registered user profile is required to view messages.',
    });
  }

  if (!isPositiveId(req.params.listingId)) {
    return res.status(400).json({ error: 'A valid listing ID is required.' });
  }

  try {
    const conversation = await getConversation({
      viewerId: req.user.profileId,
      viewerRole: req.user.role,
      listingId: req.params.listingId,
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    return res.json(conversation);
  } catch (error) {
    console.error('Conversation fetch failed:', error.message);
    return res.status(500).json({ error: 'Unable to fetch conversation.' });
  }
}

module.exports = { createMessage, getMessages };
