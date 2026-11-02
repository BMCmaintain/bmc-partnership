# BMC Tender Watch

BMC Tender Watch scans public procurement sources every morning and ranks opportunities against The Building and Maintenance Company's service profile.

## Included now

- Contracts Finder OCDS search feed
- Find a Tender OCDS release packages
- Public Contracts Scotland OCDS API
- Configurable placeholders/adapters for Sell2Wales, NEPO Open, Atamis and In-tend/Sell2UK
- Relevance scoring from BMC service keywords, priority terms, exclusions, buyer types and value
- Browser dashboard with score, stars, buyer, value, deadline and matched keywords
- Admin page for changing keywords, thresholds, regions and sources
- GitHub Actions schedule at 07:00 UTC every day plus manual workflow dispatch

## Admin saving

The admin page can save `config.json` directly through the GitHub Contents API. Use a fine-grained token limited to this repository with Contents read/write permission only. The token is kept in `sessionStorage` and is not committed to the repository.

## Portal limitations

Some commercial procurement portals do not permit anonymous feed access. These sources stay disabled until BMC has an authorised feed URL, API access or a public export endpoint. The scanner does not bypass logins, CAPTCHAs or access controls.

## Main files

- `index.html` - tender dashboard
- `admin.html` - configurable admin settings
- `config.json` - filtering and source configuration
- `scripts/scan.mjs` - daily collector, normaliser and scorer
- `data/tenders.json` - latest scan output
- `.github/workflows/bmc-tender-watch.yml` - scheduled automation
