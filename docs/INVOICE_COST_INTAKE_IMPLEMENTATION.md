# Invoice Cost Intake Implementation

## What Was Built

Sprint 6 closes the deterministic RM7 workflow:

- canonical mock invoice samples
- deterministic mock invoice parser
- manual structured invoice draft creation
- review-confirm API workflow
- `/invoices` frontend route
- `/alerts` frontend route
- ingredient cost history records and dish-detail history visibility
- supplier product match creation and refresh
- supplier price-change alerts
- affected dish impact summary
- invoice-driven action integration into the ranked dashboard stack
- OCR adapter intake boundary that creates the same draft shape before review-confirm

The workflow is intentionally review-first. Parsed invoice lines do not update current ingredient costs until the user confirms them.

## Mobile-First Invoice Requirement

Invoice cost intake is a core mobile workflow.

The practical requirement is:

- a restaurant owner or kitchen manager should be able to upload an invoice from a phone
- OCR or manual intake should still create a draft only
- invoice lines should be reviewable and editable on mobile
- no ingredient cost should update before confirmation

## Mock Parser Architecture

The mock parser lives in `packages/core/src/invoices.ts`.

It:

- resolves supplier suggestions from normalized names
- derives missing unit price from line total and quantity when possible
- accepts manual structured invoice lines through the same parser shape
- resolves ingredient matches from confirmed supplier aliases first
- falls back to deterministic token-overlap matching
- assigns confidence
- raises warnings for unresolved matches or unit mismatch
- produces a structured `ParsedInvoiceDraft`

This keeps RM7 deterministic and testable before OCR variance enters the workflow.

## Review-Confirm Rules

- Only `confirmed` lines with a resolved `matchedIngredientId` can update costs.
- `ignored` lines never change ingredient cost or cost history.
- `needs_review` lines block confirmation.
- Current `Ingredient.costPerUnitCents` updates only after confirmation.
- Repeated confirmation of the same invoice is blocked.
- Manual structured drafts never bypass review-confirm.
- OCR-created drafts never bypass review-confirm.
- Unit mismatch remains a review problem until the user changes the line or ignores it.

## Review UI Expectations

The review UI should not depend on desktop tables as the primary pattern.

Mobile expectations:

- responsive invoice line cards
- touch-friendly confirm and ignore controls
- visible unresolved-line states
- readable confidence and warning labels
- clear primary confirm CTA

## Cost History Model

`IngredientCostHistory` stores:

- ingredient id
- supplier id
- invoice line id
- previous cost per unit
- new cost per unit
- unit
- effective date
- created timestamp

This is the historical record. Current ingredient cost remains the latest effective value in the in-memory dataset session.

Frontend visibility now exposes that history inside dish detail so a cost change can be traced from invoice to ingredient to affected dish.

## OCR Adapter Boundary

Sprint 8 closes RM8 without changing the trust model:

- photo or PDF upload is accepted only as OCR draft intake
- fixture OCR remains the default provider path
- provider selection is backend-controlled through the OCR provider registry
- external provider support now exists as an env-driven pilot and stays disabled when unconfigured
- fixture or external OCR output is normalized into the same `ParsedInvoiceDraft` shape used by sample and manual drafts
- OCR quality is evaluated before the draft reaches review
- low-confidence OCR lines become `needs_review`
- OCR warnings stay visible in the shared review UI
- OCR jobs expose provider, status, quality summary, and failure reason
- confirmation still happens only through `POST /api/invoices/:id/review-confirm`

This means OCR can plug into the product without inventing a second confirmation path.

## OCR Quality Gate

The quality gate classifies OCR drafts before review:

- `quick_review`
- `careful_review`
- `manual_entry_recommended`

The quality report checks:

- overall confidence
- unresolved lines
- missing prices
- unknown products
- missing supplier or invoice date
- unit warnings

This report informs the user, but it does not confirm data automatically.

## Alert Thresholds

The confirmation engine currently emits:

- `ingredient_price_up`
- `ingredient_price_down`
- `dish_margin_at_risk_due_to_cost_change`

Threshold rules:

- price increase `>= 5%` creates an up alert
- price decrease `<= -5%` creates a down alert
- strong cost rises affecting at-risk dishes create dish-margin alerts
- severity escalates for large increases, high-sales dishes, or dishes that fall into loss

Affected dishes are recalculated by finding recipes that use the updated ingredient and comparing old vs new dish metrics.

## Alert-To-Action Integration

Confirmed invoice alerts now feed back into the ranked decision stack:

- supplier price increases create supplier-origin reason codes
- large cost spikes can elevate dish actions
- affected high-sales dishes are prioritized higher
- duplicate alert spam for the same dish and ingredient is suppressed into a single supplier-price review action

This keeps invoice cost intake connected to the same action layer the dashboard already uses.

## Known Limitations

- OCR upload currently uses a deterministic fixture adapter, not a live provider
- External provider support is only a safe seam unless env configuration and a real adapter are added later
- No camera capture yet
- No persistence beyond in-memory demo state
- No supplier API sync
- No automated supplier normalization beyond deterministic string matching
- No accounting, inventory, or POS workflows
- mobile camera capture is still browser-based rather than native

## Why Real OCR Is Still Deferred

The current RM8 slice proves the adapter boundary and safety gate, not OCR accuracy. A live provider still needs:

- provider credentials and secret management
- request and retry policy
- raw text and field extraction tuning
- invoice-format variance handling
- accuracy validation against real supplier documents

That integration belongs on top of the existing draft and review-confirm boundary, not around it.
