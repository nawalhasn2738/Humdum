const {
  createInquiry,
  listLandlordInquiries,
  listTenantInquiries,
  updateInquiryStatus,
} = require('../services/inquiry.service');
const { INQUIRY_STATUSES } = require('../services/inquiry-policy.service');

function isPositiveId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

function serializeInquiry(row) {
  return {
    id: String(row.id),
    tenant: {
      id: String(row.tenant_id),
      name: row.tenant_name,
    },
    listing: {
      id: String(row.listing_id),
      title: row.listing_title,
    },
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sendInquiryError(res, error) {
  if (error.code === 'LISTING_NOT_FOUND' || error.code === 'INQUIRY_NOT_FOUND') {
    return res.status(404).json({ error: error.message });
  }
  if (error.code === 'INQUIRY_FORBIDDEN') {
    return res.status(403).json({ error: error.message });
  }
  if (error.code === 'DUPLICATE_ACTIVE_INQUIRY' || error.code === 'INVALID_INQUIRY_TRANSITION') {
    return res.status(409).json({ error: error.message });
  }
  console.error('Inquiry request failed:', error.message);
  return res.status(500).json({ error: 'Unable to process inquiry.' });
}

async function create(req, res) {
  const listingId = req.body.listingId ?? req.body.listing_id;
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered tenant profile is required.' });
  if (!isPositiveId(listingId)) return res.status(400).json({ error: 'A valid listingId is required.' });

  try {
    const inquiry = await createInquiry({ tenantId: req.user.profileId, listingId });
    return res.status(201).json({ inquiry: serializeInquiry(inquiry) });
  } catch (error) {
    return sendInquiryError(res, error);
  }
}

async function mine(req, res) {
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered tenant profile is required.' });
  try {
    const inquiries = await listTenantInquiries(req.user.profileId);
    return res.json({ inquiries: inquiries.map(serializeInquiry) });
  } catch (error) {
    return sendInquiryError(res, error);
  }
}

async function landlord(req, res) {
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered landlord profile is required.' });
  try {
    const inquiries = await listLandlordInquiries(req.user.profileId);
    return res.json({ inquiries: inquiries.map(serializeInquiry) });
  } catch (error) {
    return sendInquiryError(res, error);
  }
}

async function updateStatus(req, res) {
  const status = typeof req.body.status === 'string' ? req.body.status.trim().toLowerCase() : '';
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered profile is required.' });
  if (!isPositiveId(req.params.id) || !INQUIRY_STATUSES.includes(status) || status === 'pending') {
    return res.status(400).json({ error: 'A valid inquiry ID and status are required.' });
  }

  try {
    const inquiry = await updateInquiryStatus({
      inquiryId: req.params.id,
      actorId: req.user.profileId,
      actorRole: req.user.role,
      nextStatus: status,
    });
    return res.json({ inquiry: serializeInquiry(inquiry) });
  } catch (error) {
    return sendInquiryError(res, error);
  }
}

module.exports = { create, landlord, mine, updateStatus };
