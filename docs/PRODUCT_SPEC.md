# Product Specification

## Product Status

Profit Analyzer is no longer positioned as only an MVP or controlled pilot demo.

Current status:

- RM1-RM9 are complete as a controlled pilot package
- the product is now a launch-quality product candidate for founding partner restaurants
- production SaaS readiness is not yet claimed

## Product Summary

Profit Analyzer helps restaurant owners and managers understand dish-level profitability, supplier-cost movement, and the next best profit action.

The product must help a restaurant:

- set up menu and cost data
- keep ingredient costs current through invoice review-confirm
- understand dish-level margin pressure
- see supplier-driven risk quickly
- test price changes before acting

## Launch-Quality Requirements

The founding partner launch candidate must include:

- real onboarding
- data persistence
- full menu setup
- ingredient setup
- recipe setup
- dish setup
- invoice intake
- OCR provider optional behind a safe draft boundary
- supplier alerts
- weekly action dashboard
- confidence and explanation layer
- admin and pilot tools
- export and import
- clear error states
- mobile usability

## Core Product Capabilities

### Decision Layer

The product should show:

- estimated dish cost
- current price
- margin percent
- gross profit per sale
- estimated profit contribution using sales volume
- status: profitable / warning / loss
- next suggested action

### Supplier Cost Layer

The product should show:

- confirmed ingredient cost updates
- ingredient cost history
- supplier price changes
- affected dishes
- invoice-driven action priority

### Setup Layer

The product should allow:

- ingredient creation and editing
- recipe creation and editing
- dish creation and editing
- recipe-to-dish linkage
- safer import validation
- export and reset

## Mobile-First Invoice Requirement

Invoice intake is a mobile-first workflow.

For founding partner launch quality, the product must support:

- opening the app on a phone
- selecting or taking invoice photos via browser file input
- uploading image or PDF from mobile
- creating OCR or manual review drafts only
- reviewing invoice lines on mobile without desktop-only tables
- confirming or ignoring lines with touch-friendly controls
- keeping confirmation blocked when unresolved lines remain

## Core User Flows

### Setup Flow

1. restaurant opens onboarding
2. restaurant creates or imports ingredient data
3. restaurant creates recipes
4. restaurant links dishes to recipes
5. dashboard becomes meaningful

### Invoice Flow

1. user opens invoice intake on phone or desktop
2. user uploads file or uses manual or sample flow
3. system creates draft only
4. user reviews supplier, date, lines, ingredient matches, prices, and confidence
5. user confirms
6. system updates cost history, current ingredient costs, alerts, and action stack

### Weekly Decision Flow

1. user opens dashboard
2. sees top actions
3. opens affected dish
4. understands cost driver
5. tests price in simulator
6. chooses action

## Non-Goals

Still out of scope in this phase:

- full accounting
- full inventory
- POS integration
- supplier API sync
- automated blind OCR import
- billing and subscriptions
- complex auth and RBAC

## Jobs To Be Done

### Functional

- When ingredient prices change, help me see which dishes are now risky.
- When I upload or photograph a supplier invoice, help me turn it into confirmed cost updates.
- When I review the menu, help me identify which dishes need attention first.
- When I consider a price change, show me the likely profit impact immediately.
- When I suspect a dish is underperforming, show me the ingredient-level reason.

### Emotional

- Help me feel in control of menu profitability.
- Reduce fear that I am selling popular dishes at weak margins.
- Replace vague gut feel with a simple action list.

### Social

- Help the owner or manager explain pricing decisions confidently to staff, partners, or investors.

## Primary User

- Restaurant owner, founder, chef-owner, or manager
- Uses both phone and laptop
- Time-poor and operationally busy
- Wants operationally useful output, not generic analytics

## Launch Candidate Success Criteria

### Product Success

- Restaurant can complete setup without needing manual JSON editing for normal use
- User can review and confirm a supplier invoice without blind trust in OCR
- User can understand why a dish is flagged without reading documentation
- Dashboard generates at least one clear high-value action from realistic data
- Mobile invoice review is usable without desktop-only interaction

### Commercial Success

- 3-5 founding partner restaurants agree to serious evaluation
- partners can complete onboarding with limited founder support
- at least some partners report a concrete pricing or margin action influenced by the product

## Acceptance Criteria For Launch-Quality Candidate

- A user can create and edit ingredients, recipes, and dishes.
- Dishes are linked to recipes.
- The system calculates dish cost from recipe ingredients and yield.
- Dashboard ranks issues and actions clearly.
- Supplier invoice drafts route through review-confirm only.
- OCR remains draft-only.
- Mobile invoice workflow is usable.
- Export, backup, and safer import validation exist.
- Clear error states exist for setup and invoice flows.
