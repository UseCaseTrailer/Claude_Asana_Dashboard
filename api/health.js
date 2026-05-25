// api/health.js
// GET /api/health — confirms the API is up and PAT is configured

export default async function handler(req, res) {
  const hasToken = !!process.env.ASANA_PAT;
  const workspace = process.env.ASANA_WORKSPACE_GID || '1115662927527527';

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    asana_pat_configured: hasToken,
    workspace_gid: workspace,
    version: '1.0.0',
  });
}
