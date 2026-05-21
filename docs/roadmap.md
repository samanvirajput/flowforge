# Roadmap

## Near-term
- [ ] Workflow import from OpenAPI/Swagger spec -- auto-generate
      workflow steps from existing API documentation
- [ ] Persistent run history -- SQLite/PostgreSQL storage for
      historical runs and baseline data (currently in-memory)
- [ ] HTML report export -- downloadable run report with charts
      and anomaly summary

## Medium-term
- [ ] GitHub Actions integration -- official action for running
      FlowForge workflows in CI pipelines with pass/fail on
      anomaly threshold breach
- [ ] Distributed load runner -- coordinate workers across
      multiple machines for higher RPS targets
- [ ] Assertions -- per-step response body assertions beyond
      status code checking

## Long-term
- [ ] gRPC workflow support -- extend beyond HTTP to gRPC
      endpoint testing
- [ ] Plugin system -- custom anomaly detectors, custom
      reporters, custom step types
- [ ] SaaS mode -- multi-tenant hosted version with team
      collaboration on workflow libraries
