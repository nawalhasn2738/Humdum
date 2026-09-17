const {
  getOpenAnomalyReports,
  THRESHOLDS,
} = require('../services/anomaly.service');

function serializeReport(row) {
  return {
    id: String(row.id),
    entityType: row.entity_type,
    anomalyType: row.anomaly_type,
    severityScore: Number(row.severity_score),
    evidence: row.evidence,
    status: row.status,
    detectedAt: row.detected_at,
    ...(row.listing_id
      ? {
          listing: {
            id: String(row.listing_id),
            title: row.listing_title,
            landlordName: row.listing_owner_name,
          },
        }
      : {}),
    ...(row.user_id
      ? {
          user: {
            id: String(row.user_id),
            name: row.user_name,
            email: row.user_email,
            riskScore: Number(row.user_risk_score),
          },
        }
      : {}),
  };
}

async function getAnomalies(req, res) {
  try {
    const rows = await getOpenAnomalyReports();
    const reports = rows.map(serializeReport);

    return res.json({
      summary: {
        total: reports.length,
        flaggedListings: reports.filter(
          (report) => report.entityType === 'listing'
        ).length,
        suspiciousUsers: reports.filter((report) => report.entityType === 'user')
          .length,
      },
      thresholds: THRESHOLDS,
      reports,
    });
  } catch (error) {
    console.error('Anomaly report fetch failed:', error.message);
    return res.status(500).json({ error: 'Unable to fetch anomaly reports.' });
  }
}

module.exports = { getAnomalies };
