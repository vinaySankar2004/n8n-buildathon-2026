// "Source config": the source to collect. Called by the orchestrator, it gets one source object.
// On a test run it falls back to 3-1-1.
const raw = $input.first()?.json ?? {};
const given = raw.headers && raw.body ? raw.body : raw; // the test webhook wraps its input in body
const s = given.dataset ? given : {
  id: "311",
  portal: "https://opendata.vancouver.ca",
  dataset: "3-1-1-service-requests",
  label: "3-1-1 service requests",
  source_note: "City of Vancouver open data, 3-1-1 service requests",
  source_url: "https://opendata.vancouver.ca/explore/dataset/3-1-1-service-requests/",
  unit: "reports",
  date_field: "service_request_open_timestamp",
  category_field: "service_request_type",
  area_field: "local_area",
  date_only: false,
  max_age_hours: 48,
  filter: "",
};
const extra = s.filter ? ` and (${s.filter})` : "";
return [{ json: {
  ...s,
  // Date-only fields are stored at UTC midnight; grouping them in Vancouver time would shift every day back by one.
  timezone: s.date_only ? "UTC" : "America/Vancouver",
  base_url: `${s.portal}/api/explore/v2.1/catalog/datasets/${s.dataset}`,
  newest_select: `max(${s.date_field}) as newest`,
  // Some datasets hold future-dated records, so the newest record is the newest up to now.
  newest_where: `${s.date_field} <= now()${extra}`,
} }];
