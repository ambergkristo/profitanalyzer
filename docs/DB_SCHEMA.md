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
- one `Restaurant` has many `Recipes`
- one `Restaurant` has many `Dishes`
- one `Recipe` has many `RecipeIngredients`
- one `Ingredient` can be used by many `RecipeIngredients`
- one `Dish` belongs to one `Recipe` in MVP
- one `Dish` can have many `DishAnalyticsSnapshot` rows
- one `Dish` can have many `Recommendation` rows over time

## Relationship Notes

- `Dish -> Recipe` is one-to-one for MVP simplicity. Multi-recipe dishes, modifiers, and combo meals are deferred.
- `RecipeIngredient.unit` may duplicate ingredient unit data to preserve the entered measurement basis at the time of recipe definition.
- Snapshots are optional early on. They become useful once dashboard performance or historical comparisons matter.

## Example Calculation Path

1. Read all `RecipeIngredient` rows for a recipe.
2. Join each row to its `Ingredient`.
3. Convert quantity into the stored cost unit if needed.
4. Sum ingredient costs.
5. Divide by `Recipe.yield_quantity` to derive per-portion cost.
6. Compare per-portion cost with `Dish.price_cents`.
7. Multiply margin amount by `Dish.sales_volume`.
8. Generate a current recommendation row if rules trigger.

## Deliberately Deferred

- supplier tables
- invoice tables
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

## Open Schema Questions

- Do we need `sales_volume_period` in MVP?
- Should `Dish` support manual cost override for incomplete recipe data?
- Do recommendations need restaurant-level summary storage?
- Should recipe yield support decimal portions?

