# Database Schema

## Schema Goal

The MVP schema should support transparent cost calculation, simple analytics, and rule-based recommendations without introducing premature complexity.

## Core Entities

### Restaurant

- `id`
- `name`
- `currency`
- `created_at`
- `updated_at`

Purpose:

- root owner of data for one restaurant account

### User

- `id`
- `restaurant_id`
- `email`
- `password_hash`
- `role`
- `created_at`
- `updated_at`

Purpose:

- authentication and account access

### Ingredient

- `id`
- `restaurant_id`
- `name`
- `cost_per_unit_cents`
- `unit`
- `last_cost_updated_at`
- `created_at`
- `updated_at`

Purpose:

- source cost object used by recipes
- stores the current effective cost used in live calculations

### Supplier

- `id`
- `restaurant_id`
- `name`

Purpose:

- supplier identity for invoice intake and cost history

### Recipe

- `id`
- `restaurant_id`
- `name`
- `yield_quantity`
- `yield_unit`
- `created_at`
- `updated_at`

Purpose:

- defines a producible item or component with a yield basis

### RecipeIngredient

- `id`
- `recipe_id`
- `ingredient_id`
- `quantity`
- `unit`
- `created_at`
- `updated_at`

Purpose:

- join table connecting ingredients to recipes with quantities

### Dish

- `id`
- `restaurant_id`
- `name`
- `recipe_id`
- `price_cents`
- `sales_volume`
- `is_active`
- `created_at`
- `updated_at`

Purpose:

- sellable menu item linked to one primary recipe in MVP

### PurchaseInvoice

- `id`
- `restaurant_id`
- `supplier_id`
- `invoice_date`
- `invoice_number`
- `source_image_url`
- `parse_status`
- `total_amount_cents`
- `created_at`

Purpose:

- structured intermediate invoice record created from uploaded supplier invoice data

### PurchaseInvoiceLine

- `id`
- `invoice_id`
- `raw_product_name`
- `parsed_quantity`
- `parsed_unit`
- `parsed_unit_price_cents`
- `parsed_line_total_cents`
- `matched_ingredient_id`
- `match_confidence`
- `review_status`

Purpose:

- parsed or corrected invoice line used for ingredient matching and cost update review

### IngredientCostHistory

- `id`
- `ingredient_id`
- `supplier_id`
- `invoice_line_id`
- `cost_per_unit_cents`
- `unit`
- `effective_date`
- `created_at`

Purpose:

- stores historical truth for confirmed ingredient cost changes

### SupplierProductMatch

- `id`
- `restaurant_id`
- `supplier_id`
- `raw_product_name`
- `ingredient_id`
- `confidence`
- `last_confirmed_at`

Purpose:

- remembers confirmed supplier product name to ingredient mapping for future invoice matching

### DishAnalyticsSnapshot

- `id`
- `dish_id`
- `calculated_cost_cents`
- `margin_percent_basis_points`
- `margin_amount_cents`
- `profit_estimate_cents`
- `status`
- `calculated_at`

Purpose:

- optional denormalized snapshot for dashboard speed and historical comparison

### Recommendation

- `id`
- `dish_id`
- `rule_code`
- `action`
- `reasoning`
- `expected_impact_cents`
- `confidence`
- `is_current`
- `created_at`

Purpose:

- stores generated recommendation outputs for review and auditability

## Relationships

- one `Restaurant` has many `Users`
- one `Restaurant` has many `Ingredients`
- one `Restaurant` has many `Suppliers`
- one `Restaurant` has many `Recipes`
- one `Restaurant` has many `Dishes`
- one `Restaurant` has many `PurchaseInvoices`
- one `Restaurant` has many `SupplierProductMatch` rows
- one `Recipe` has many `RecipeIngredients`
- one `Ingredient` can be used by many `RecipeIngredients`
- one `Supplier` has many `PurchaseInvoices`
- one `PurchaseInvoice` has many `PurchaseInvoiceLine` rows
- one `Ingredient` can be matched by many `PurchaseInvoiceLine` rows
- one `Ingredient` has many `IngredientCostHistory` rows
- one `Dish` belongs to one `Recipe` in MVP
- one `Dish` can have many `DishAnalyticsSnapshot` rows
- one `Dish` can have many `Recommendation` rows over time

## Relationship Notes

- `Dish -> Recipe` is one-to-one for MVP simplicity. Multi-recipe dishes, modifiers, and combo meals are deferred.
- `RecipeIngredient.unit` may duplicate ingredient unit data to preserve the entered measurement basis at the time of recipe definition.
- Snapshots are optional early on. They become useful once dashboard performance or historical comparisons matter.
- `Ingredient.cost_per_unit_cents` remains the current effective cost used in live calculations.
- `IngredientCostHistory` stores historical truth from confirmed invoice lines.
- Current ingredient cost must be updated only by confirmed invoice lines, never directly by raw OCR output.

## Example Calculation Path

1. Read all `RecipeIngredient` rows for a recipe.
2. Join each row to its `Ingredient`.
3. Convert quantity into the stored cost unit if needed.
4. Sum ingredient costs.
5. Divide by `Recipe.yield_quantity` to derive per-portion cost.
6. Compare per-portion cost with `Dish.price_cents`.
7. Multiply margin amount by `Dish.sales_volume`.
8. Generate a current recommendation row if rules trigger.

Invoice-driven update path:

1. Upload invoice image or mocked parsed invoice.
2. Create `PurchaseInvoice`.
3. Create parsed `PurchaseInvoiceLine` rows.
4. Let the user confirm supplier, date, matches, and parsed values.
5. Write `IngredientCostHistory` from confirmed lines only.
6. Update `Ingredient.cost_per_unit_cents` from confirmed lines only.
7. Recalculate affected dish costs and generate price-change alerts.

## Deliberately Deferred

- POS transaction tables
- modifier trees
- sub-recipe graphs
- multi-location rollups
- labor cost allocation
- food waste event logging

## Schema Risks

- unit conversion can become messy fast if not normalized early
- recipe completeness determines output reliability
- sales volume without date range semantics is too vague for real analytics
- supplier invoice formats can vary enough to weaken parse quality

## Open Schema Questions

- Do we need `sales_volume_period` in MVP?
- Should `Dish` support manual cost override for incomplete recipe data?
- Do recommendations need restaurant-level summary storage?
- Should recipe yield support decimal portions?
- Should `SupplierProductMatch` support multiple aliases per supplier product line?
- How should review status values be normalized for invoice lines?
