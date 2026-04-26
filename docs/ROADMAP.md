# Roadmap

## RM1 - Core Engine + Basic UI

### Goal

Working system that calculates dish cost and margin from manually entered data.

### Scope

- Ingredient, Recipe, RecipeIngredient, and Dish models
- Cost calculation logic
- Margin calculation
- Basic API
- Simple dish table UI

### Exit Criteria

- User can input dishes manually
- System shows correct dish cost and margin
- Calculations are deterministic and test-covered

### Validation Check

Manual check: create dishes manually, verify cost and margin results against hand calculations, and confirm deterministic outputs across repeated runs.

## RM2 - Dashboard + Core Insights

Status: completed in MAX SPRINT 2.

### Goal

Turn cost and margin data into owner-facing decisions.

### Scope

- KPI cards
- Basic alerts
- Top 3 recommendations
- Rule-based decision output
- Low margin and loss flags

### Exit Criteria

- Dashboard shows actionable insights
- User can see what to fix first
- Recommendations include expected impact and confidence

### Validation Check

Manual check: with seeded data, the dashboard surfaces the top problem dishes and shows ranked actions with impact and confidence.

## RM3 - Dish Detail + Cost Breakdown

Status: completed in MAX SPRINT 2.

### Goal

Explain why a dish is profitable, risky, or loss-making.

### Scope

- Ingredient breakdown
- Cost visualization
- Margin explanation
- Cost driver highlighting
- Simple margin trend placeholder if needed

### Exit Criteria

- User can open a dish and understand the main cost drivers
- Dish detail supports decision-making, not just data display

### Validation Check

Manual check: open a flagged dish and explain the result using the detail view without external notes.

## RM4 - Price Simulator

Status: completed in MAX SPRINT 2.

### Goal

Allow the user to test price changes instantly.

### Scope

- Price slider
- Real-time margin update
- Profit impact estimation
- Before or after comparison

### Exit Criteria

- User can simulate a price change instantly
- UI shows margin and estimated profit delta

### Validation Check

Manual check: simulate 0.50 EUR, 1.00 EUR, and 2.00 EUR price changes and confirm instant recalculation of margin and profit delta.

## RM5 - Synthetic Restaurant Validation

Status: completed in MAX SPRINT 3.

### Goal

Validate the decision engine with realistic simulated restaurant datasets before customer interviews become mandatory.

### Scope

- High-margin restaurant dataset
- Low-margin restaurant dataset
- Mixed restaurant dataset
- 15-30 dishes per dataset
- Ingredients, quantities, yields, prices, and sales volume
- Stress cases:
  - ingredient cost spike
  - high-sales low-margin bestseller
  - low-sales high-margin dish
  - missing yield
  - partial recipe data
  - 0.50 EUR, 1.00 EUR, and 2.00 EUR price changes

### Exit Criteria

- Each dataset produces 3-5 plausible actions
- At least one action per dataset shows meaningful profit impact
- Recommendation ranking is stable and explainable
- Partial data still produces useful output with lower confidence
- Engine does not collapse when input data is imperfect

### Validation Check

Manual check: run all three restaurant datasets through the engine, verify action quality, and compare ranking stability across stress scenarios.

## RM6 - UX Polish + Decision-First Interface

Status: completed in MAX SPRINT 4.

### Goal

Make the product feel premium, fast, and decision-first.

### Scope

- Apply full visual design system
- Dark premium dashboard
- KPI cards
- Action cards
- Heat-colored dish table
- No default Tailwind look
- No Excel-like primary screens
- Mobile-first improvements

### Exit Criteria

- UI looks production-grade
- Main user path is clear
- Important actions are visible without digging

### Validation Check

Manual check: complete the main dashboard-to-dish-detail-to-simulator flow on desktop and mobile without relying on spreadsheet-like layouts.

## RM7 - Invoice Scan Cost Intake

Status: not started. Preflight only documented in MAX SPRINT 4.

### Goal

Turn supplier invoice data into confirmed ingredient cost updates and price-change alerts.

Important:

This milestone must first use a mocked or structured parser. Real OCR or vision integration does not belong here.

### Scope

- Supplier model
- PurchaseInvoice model
- PurchaseInvoiceLine model
- IngredientCostHistory model
- SupplierProductMatch or IngredientAlias model
- Mock parsed invoice input
- Upload, review, and confirm workflow
- Ingredient matching suggestions
- Confirm screen
- Cost update service
- Price-change alert service
- Affected dish recalculation trigger

### Required Workflow

1. User uploads or submits a sample invoice or mocked parsed invoice.
2. System creates a structured invoice draft.
3. System shows invoice review screen.
4. User confirms supplier, date, invoice lines, quantities, units, prices, and ingredient matches.
5. System writes cost history only for confirmed lines.
6. System updates `Ingredient` current effective cost only after confirmation.
7. System creates price-change alerts.
8. Dashboard shows affected dishes and recommended actions.

### Exit Criteria

- User can review parsed invoice lines before saving
- Unknown or low-confidence lines do not update costs automatically
- Confirmed invoice lines create `IngredientCostHistory` records
- `Ingredient` current cost updates only after confirmation
- Price-change alerts are created
- Affected dishes are recalculated or flagged
- Dashboard shows at least one invoice-driven action card

### Validation Check

Manual check: load a mocked invoice, correct low-confidence lines, confirm the draft, verify cost history creation, and confirm the dashboard surfaces invoice-driven actions.

## RM8 - Real OCR/Vision Adapter

### Goal

Add real phone photo or image-based invoice parsing after the review-confirm cost intake workflow is stable.

### Scope

- Image upload handling
- OCR or vision adapter interface
- Raw text capture
- Field extraction for:
  - supplier
  - invoice number
  - invoice date
  - product name
  - quantity
  - unit
  - unit price or line total
- Confidence scoring
- Needs-review status for uncertain fields
- Error handling for poor image quality

### Exit Criteria

- System can process a simple one-page supplier invoice image
- Parsed fields are shown in the existing review screen
- Low-confidence fields are clearly marked
- No OCR result can update ingredient costs without user confirmation
- Existing mock parser tests still pass

### Validation Check

Manual check: submit a simple invoice image, verify parsed fields flow into the existing review screen, and confirm low-confidence fields require review before any cost update.

## RM9 - First Customer Ready / Pilot Package

### Goal

Prepare the product for a first controlled restaurant pilot.

### Scope

- Auth
- Data persistence
- Basic onboarding
- Demo restaurant data
- Deployment readiness
- Seed data
- Basic error states
- Pilot checklist
- Manual fallback flow for bad invoice scans

### Exit Criteria

- One restaurant can be onboarded
- User can enter dishes manually
- User can see dashboard insights
- User can simulate price changes
- User can test invoice cost intake
- System can produce a credible weekly profit action summary

### Validation Check

Manual check: onboard one pilot restaurant, complete the manual data flow, run the dashboard and simulator, test invoice cost intake, and produce a weekly profit action summary.
