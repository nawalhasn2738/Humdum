const pool = require('../db');
const { actorOwnsInquiry, canTransitionInquiry } = require('./inquiry-policy.service');
const { PUBLIC_LISTING_STATUS } = require('./listing-visibility.service');

const INQUIRY_SELECT = `
  SELECT
    inquiries.id,
    inquiries.tenant_id,
    inquiries.listing_id,
    inquiries.status,
    inquiries.created_at,
    inquiries.updated_at,
    listings.title AS listing_title,
    listings.landlord_id,
    tenants.name AS tenant_name
  FROM inquiries
  INNER JOIN listings ON listings.id = inquiries.listing_id
  INNER JOIN users tenants ON tenants.id = inquiries.tenant_id`;

function makeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function createInquiry({ tenantId, listingId }) {
  try {
    const result = await pool.query(
      `INSERT INTO inquiries (tenant_id, listing_id, status)
       SELECT $1, listings.id, 'pending'
       FROM listings
       WHERE listings.id = $2 AND listings.moderation_status = $3
       RETURNING id`,
      [tenantId, listingId, PUBLIC_LISTING_STATUS]
    );

    if (result.rowCount === 0) {
      throw makeError('LISTING_NOT_FOUND', 'Listing not found.');
    }

    return getInquiryById(result.rows[0].id);
  } catch (error) {
    if (error.code === '23505') {
      throw makeError(
        'DUPLICATE_ACTIVE_INQUIRY',
        'You already have a pending or accepted inquiry for this listing.'
      );
    }
    throw error;
  }
}

async function getInquiryById(id, client = pool) {
  const result = await client.query(`${INQUIRY_SELECT} WHERE inquiries.id = $1`, [id]);
  return result.rows[0] || null;
}

async function listTenantInquiries(tenantId) {
  const result = await pool.query(
    `${INQUIRY_SELECT}
     WHERE inquiries.tenant_id = $1
     ORDER BY inquiries.created_at DESC, inquiries.id DESC`,
    [tenantId]
  );
  return result.rows;
}

async function listLandlordInquiries(landlordId) {
  const result = await pool.query(
    `${INQUIRY_SELECT}
     WHERE listings.landlord_id = $1
     ORDER BY inquiries.created_at DESC, inquiries.id DESC`,
    [landlordId]
  );
  return result.rows;
}

async function updateInquiryStatus({ inquiryId, actorId, actorRole, nextStatus }) {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const currentResult = await client.query(
      `${INQUIRY_SELECT} WHERE inquiries.id = $1 FOR UPDATE OF inquiries`,
      [inquiryId]
    );
    const inquiry = currentResult.rows[0];

    if (!inquiry) {
      throw makeError('INQUIRY_NOT_FOUND', 'Inquiry not found.');
    }

    const ownsInquiry = actorOwnsInquiry({
      actorRole,
      actorId,
      tenantId: inquiry.tenant_id,
      landlordId: inquiry.landlord_id,
    });

    if (!ownsInquiry) {
      throw makeError('INQUIRY_FORBIDDEN', 'You cannot update this inquiry.');
    }

    if (!canTransitionInquiry({
      actorRole,
      currentStatus: inquiry.status,
      nextStatus,
    })) {
      throw makeError('INVALID_INQUIRY_TRANSITION', 'This inquiry status transition is not allowed.');
    }

    await client.query(
      `UPDATE inquiries
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [nextStatus, inquiryId]
    );
    const updated = await getInquiryById(inquiryId, client);
    await client.query('COMMIT');
    return updated;
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (rollbackError) {
        console.error('Inquiry rollback failed:', rollbackError.message);
      }
    }
    throw error;
  } finally {
    client?.release();
  }
}

module.exports = {
  createInquiry,
  listLandlordInquiries,
  listTenantInquiries,
  updateInquiryStatus,
};
