const pool = require('../db');
const { detectMessagingAnomalies } = require('./anomaly.service');
const {
  applyMessagePrivacy,
  serializeContact,
} = require('../middleware/privacy');

const VERIFIED_TENANCY_STATUSES = ['active', 'completed', 'ended'];

async function hasVerifiedRelationship(client, listingId, firstUserId, secondUserId) {
  const result = await client.query(
    `SELECT EXISTS (
       SELECT 1
       FROM tenancies
       WHERE listing_id = $1
         AND tenant_id IN ($2, $3)
         AND LOWER(status) = ANY($4::text[])
     ) AS verified`,
    [listingId, firstUserId, secondUserId, VERIFIED_TENANCY_STATUSES]
  );

  return result.rows[0].verified;
}

function serializeMessage(row, viewerRole) {
  const isVerifiedContact = row.verified_contact;
  const privacy = applyMessagePrivacy({
    content: row.content,
    viewerRole,
    isVerifiedContact,
  });
  const canRevealContactDetails = viewerRole === 'admin' || isVerifiedContact;

  return {
    id: String(row.id),
    listingId: String(row.listing_id),
    sender: serializeContact(
      {
        id: row.sender_id,
        name: row.sender_name,
        role: row.sender_role,
        email: row.sender_email,
        phone: row.sender_phone,
        masked_phone: row.sender_masked_phone,
      },
      canRevealContactDetails
    ),
    receiver: serializeContact(
      {
        id: row.receiver_id,
        name: row.receiver_name,
        role: row.receiver_role,
        email: row.receiver_email,
        phone: row.receiver_phone,
        masked_phone: row.receiver_masked_phone,
      },
      canRevealContactDetails
    ),
    content: privacy.content,
    isMasked: row.is_masked || privacy.isMasked,
    contactStatus: isVerifiedContact ? 'verified' : 'preliminary',
    createdAt: row.created_at,
  };
}

async function sendMessage({ senderId, senderRole, receiverId, listingId, content }) {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const contextResult = await client.query(
      `SELECT
         listings.id AS listing_id,
         listings.landlord_id,
         sender.id AS sender_id,
         sender.name AS sender_name,
         sender.email AS sender_email,
         sender.phone AS sender_phone,
         sender.masked_phone AS sender_masked_phone,
         sender.role AS sender_role,
         receiver.id AS receiver_id,
         receiver.name AS receiver_name,
         receiver.email AS receiver_email,
         receiver.phone AS receiver_phone,
         receiver.masked_phone AS receiver_masked_phone,
         receiver.role AS receiver_role
       FROM listings
       INNER JOIN users sender ON sender.id = $2
       INNER JOIN users receiver ON receiver.id = $3
       WHERE listings.id = $1`,
      [listingId, senderId, receiverId]
    );

    if (contextResult.rowCount === 0) {
      const error = new Error('Listing or user not found.');
      error.code = 'MESSAGE_CONTEXT_NOT_FOUND';
      throw error;
    }

    const context = contextResult.rows[0];
    const isParticipant =
      senderRole === 'admin' ||
      String(context.landlord_id) === String(senderId) ||
      String(context.landlord_id) === String(receiverId);

    if (!isParticipant) {
      const error = new Error('Conversation must include the listing landlord.');
      error.code = 'MESSAGE_FORBIDDEN';
      throw error;
    }

    const verifiedContact =
      senderRole === 'admin' ||
      (await hasVerifiedRelationship(client, listingId, senderId, receiverId));
    const privacy = applyMessagePrivacy({
      content,
      viewerRole: senderRole,
      isVerifiedContact: verifiedContact,
    });

    const result = await client.query(
      `INSERT INTO messages (
         sender_id,
         receiver_id,
         listing_id,
         content,
         is_masked
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sender_id, receiver_id, listing_id, content, is_masked, created_at`,
      [senderId, receiverId, listingId, privacy.content, privacy.isMasked]
    );

    await client.query('COMMIT');

    try {
      await detectMessagingAnomalies(senderId);
    } catch (anomalyError) {
      console.error('Messaging anomaly detection failed:', anomalyError.message);
    }

    return {
      message: result.rows[0],
      sender: context,
      receiver: context,
      verifiedContact,
    };
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client?.release();
  }
}

async function getConversation({ viewerId, viewerRole, listingId, participantId }) {
  const listingResult = await pool.query(
    'SELECT id, title FROM listings WHERE id = $1',
    [listingId]
  );

  if (listingResult.rowCount === 0) {
    return null;
  }

  const result = await pool.query(
    `SELECT
       messages.*,
       sender.name AS sender_name,
       sender.email AS sender_email,
       sender.phone AS sender_phone,
       sender.masked_phone AS sender_masked_phone,
       sender.role AS sender_role,
       receiver.name AS receiver_name,
       receiver.email AS receiver_email,
       receiver.phone AS receiver_phone,
       receiver.masked_phone AS receiver_masked_phone,
       receiver.role AS receiver_role,
       EXISTS (
         SELECT 1
         FROM tenancies
         WHERE tenancies.listing_id = messages.listing_id
           AND tenancies.tenant_id IN (messages.sender_id, messages.receiver_id)
           AND LOWER(tenancies.status) = ANY($3::text[])
       ) AS verified_contact
     FROM messages
     INNER JOIN users sender ON sender.id = messages.sender_id
     INNER JOIN users receiver ON receiver.id = messages.receiver_id
     WHERE messages.listing_id = $1
       AND ($2::boolean OR messages.sender_id = $4 OR messages.receiver_id = $4)
       AND (
         $5::bigint IS NULL
         OR messages.sender_id = $5
         OR messages.receiver_id = $5
       )
     ORDER BY messages.created_at ASC, messages.id ASC`,
    [
      listingId,
      viewerRole === 'admin',
      VERIFIED_TENANCY_STATUSES,
      viewerId,
      participantId,
    ]
  );

  return {
    listing: {
      id: String(listingResult.rows[0].id),
      title: listingResult.rows[0].title,
    },
    messages: result.rows.map((row) => serializeMessage(row, viewerRole)),
  };
}

async function getConversationThreads({ viewerId, viewerRole }) {
  const result = await pool.query(
    `SELECT DISTINCT ON (
       messages.listing_id,
       CASE
         WHEN messages.sender_id = $1 THEN messages.receiver_id
         ELSE messages.sender_id
       END
     )
       messages.*,
       listings.title AS listing_title,
       sender.name AS sender_name,
       sender.email AS sender_email,
       sender.phone AS sender_phone,
       sender.masked_phone AS sender_masked_phone,
       sender.role AS sender_role,
       receiver.name AS receiver_name,
       receiver.email AS receiver_email,
       receiver.phone AS receiver_phone,
       receiver.masked_phone AS receiver_masked_phone,
       receiver.role AS receiver_role,
       EXISTS (
         SELECT 1
         FROM tenancies
         WHERE tenancies.listing_id = messages.listing_id
           AND tenancies.tenant_id IN (messages.sender_id, messages.receiver_id)
           AND LOWER(tenancies.status) = ANY($2::text[])
       ) AS verified_contact
     FROM messages
     INNER JOIN listings ON listings.id = messages.listing_id
     INNER JOIN users sender ON sender.id = messages.sender_id
     INNER JOIN users receiver ON receiver.id = messages.receiver_id
     WHERE messages.sender_id = $1 OR messages.receiver_id = $1
     ORDER BY
       messages.listing_id,
       CASE
         WHEN messages.sender_id = $1 THEN messages.receiver_id
         ELSE messages.sender_id
       END,
       messages.created_at DESC,
       messages.id DESC`,
    [viewerId, VERIFIED_TENANCY_STATUSES]
  );

  return result.rows.map((row) => {
    const message = serializeMessage(row, viewerRole);
    const peer = String(row.sender_id) === String(viewerId)
      ? message.receiver
      : message.sender;

    return {
      id: `${row.listing_id}:${peer.id}`,
      listing: {
        id: String(row.listing_id),
        title: row.listing_title,
      },
      participant: peer,
      latestMessage: message,
    };
  });
}

module.exports = { getConversation, getConversationThreads, sendMessage };


