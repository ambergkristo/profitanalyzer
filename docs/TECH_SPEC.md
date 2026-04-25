# Technical Specification

## Scope Boundary

This document defines a proposed MVP architecture only. It does not authorize implementation yet. The goal is to keep the first build small, deterministic, and validation-friendly.

## Proposed Stack

### Frontend

- React
- Vite
- Tailwind
- Zustand
- Recharts

### Backend

- Preferred MVP path: Node.js with Express
- Alternative path: Spring Boot

Recommendation: choose Node.js and Express for founder-speed unless there is a strong existing Java advantage. The MVP needs fast iteration more than enterprise ceremony.

### Data Layer

- Postgres
- Prisma if Node stack is chosen
- JPA if Spring stack is chosen

## Architecture Overview

### Frontend Modules

- authentication
- onboarding and data entry
- dashboard
- dishes list
- dish detail
- simulation panel
- shared calculation display components

### Backend Modules

- auth and accounts
- ingredients
- recipes
- dishes
- analytics
- simulation
- recommendation engine

### Core Services

- cost calculation service
- margin calculation service
- profit estimation service
- recommendation rules service

## Proposed API

### Dish Data

- `GET /dishes`
- `POST /dishes`
- `GET /dishes/:id`
- `PATCH /dishes/:id`

### Supporting Data

- `GET /ingredients`
- `POST /ingredients`
- `GET /recipes`
- `POST /recipes`

### Analytics

- `GET /analytics/overview`
- `GET /analytics/dish/:id`

### Simulation

- `POST /simulate/price`

Payload idea for `POST /simulate/price`:

- dish id
- current price
- simulated price
- optional simulated ingredient cost overrides

Response idea:

- current margin percent
- simulated margin percent
- current profit estimate
- simulated profit estimate
- delta

## Calculation Engine

### Core Formulas

Dish cost:

`sum(recipe ingredient unit cost * recipe ingredient quantity) / recipe yield`

Margin percent:

`(dish price - dish cost) / dish price`

Margin amount:

`dish price - dish cost`

Profit estimate:

`margin amount * sales volume`

### Calculation Principles

- Store money in integer cents, not floats.
- Store quantities using decimal precision.
- Persist the current calculated result for fast dashboard rendering if needed, but treat formulas as reproducible from source data.
- Capture assumptions explicitly when yield or unit conversion is involved.

## Data Handling Principles

- Manual input must be first-class in MVP.
- Imports can be CSV-only at first.
- Do not require POS integration for MVP.
- Every calculation should be traceable to source ingredients.
- The user must be able to see why a dish cost looks wrong.

## Recommendation Engine

MVP recommendation engine should be deterministic and rules-based:

- easier to validate
- easier to explain
- easier to debug
- lower risk than opaque scoring

The recommendation engine should consume:

- margin percent
- margin amount
- sales volume
- recent cost changes if available

It should output:

- action
- reasoning
- expected impact
- confidence

## Data Freshness

MVP reality:

- most data will be manually updated
- freshness is bounded by user discipline
- system should display last-updated timestamps and stale-data warnings

## Security and Access

- single-tenant user accounts are sufficient for MVP
- one restaurant account with one or more internal users
- basic role split can be deferred unless multi-user workflows appear in pilots

## Missing Technical Questions

- Will recipes support sub-recipes in MVP or only flat ingredient lists?
- How will units and conversions be normalized?
- How should waste, prep loss, and edible yield be modeled?
- Are taxes ignored in the pricing model?
- Do sales volumes come from manual input, import, or integration first?
- How should archived dishes be handled in analytics?
- Do recommendations need versioning for auditability?
- What is the minimum dataset required to show a reliable dashboard?

## Technical Constraints

- Calculation correctness matters more than animation quality.
- Traceability matters more than automation in v1.
- The API should stay narrow enough to support a manual-first onboarding motion.

