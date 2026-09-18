const { createTenancy } = require('../services/tenancy.service');

function isPositiveId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function serializeDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

async function bookTenancy(req, res) {
  const listingId = req.body.listingId ?? req.body.listing_id;
  const startDate = req.body.startDate ?? req.body.start_date;
  const endDate = req.body.endDate ?? req.body.end_date ?? null;

  if (!req.user.profileId) {
    return res.status(403).json({
      error: 'A registered tenant profile is required to book a listing.',
    });
  }

  if (
    !isPositiveId(listingId) ||
    !isValidDate(startDate) ||
    (endDate !== null && !isValidDate(endDate)) ||
    (endDate !== null && endDate < startDate)
  ) {
    return res.status(400).json({
      error:
        'A valid listingId, startDate, and optional endDate in YYYY-MM-DD format are required.',
    });
  }

  try {
    const tenancy = await createTenancy({
      tenantId: req.user.profileId,
      listingId,
      startDate,
      endDate,
    });

    return res.status(201).json({
      tenancy: {
        id: String(tenancy.id),
        tenantId: String(tenancy.tenant_id),
        listingId: String(tenancy.listing_id),
        startDate: serializeDate(tenancy.start_date),
        endDate: serializeDate(tenancy.end_date),
        status: tenancy.status,
        createdAt: tenancy.created_at,
      },
    });
  } catch (error) {
    if (error.code === 'LISTING_NOT_FOUND') {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    if (
      error.code === 'TENANCY_CONFLICT' ||
      error.code === 'BOOKING_IN_PROGRESS'
    ) {
      return res.status(409).json({ error: error.message });
    }

    console.error('Tenancy booking failed:', error.message);
    return res.status(500).json({ error: 'Unable to create tenancy.' });
  }
}

module.exports = { bookTenancy };
