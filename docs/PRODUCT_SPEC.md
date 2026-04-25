# Product Specification

## Product Summary

Menu Profit Optimizer helps restaurant owners and managers understand dish-level profitability and take the next best menu action. The MVP is a decision-first margin tool, not a back-office suite.

## MVP Scope

### In Scope

1. Dish cost calculator
2. Margin calculation
3. Dashboard with top KPIs and top recommended actions
4. Dish table with status indicators
5. Dish detail with ingredient cost breakdown
6. Simple what-if price simulator

### MVP Output Expectations

For every dish, the product should be able to show:

- estimated dish cost
- current price
- margin percent
- gross profit per sale
- estimated profit contribution using sales volume
- status: profit / warning / loss
- next suggested action

## Non-Goals

- POS replacement
- full inventory management
- accounting workflows
- supplier ordering
- labor optimization
- kitchen prep workflows
- automated invoice parsing in MVP
- multi-location management in MVP
- AI-generated recommendations in MVP

## Jobs To Be Done

### Functional

- When ingredient prices change, help me see which dishes are now risky.
- When I review the menu, help me identify which dishes need attention first.
- When I consider a price change, show me the likely profit impact immediately.
- When I suspect a dish is underperforming, show me the ingredient-level reason.

### Emotional

- Help me feel in control of menu profitability.
- Reduce fear that I am selling popular dishes at weak margins.
- Replace vague gut feel with a simple action list.

### Social

- Help the owner or manager explain pricing decisions confidently to staff or partners.

## Primary User

- Restaurant owner or manager
- Works on phone and laptop
- Understands revenue and costs in broad terms
- Does not want a spreadsheet workflow

## Success Metrics

### Product Success

- Time to first useful insight under 5 minutes for guided demo data
- At least one clear recommended action generated for a typical sample menu
- User can complete a price simulation without help
- User can understand why a dish is flagged without reading documentation

### Commercial Success

- 5 paid pilot customers
- at least 3 of 5 customers complete onboarding
- at least 3 of 5 customers report one concrete pricing or menu decision influenced by the product

## Core User Flow

1. User creates account
2. User enters or imports menu, recipe, ingredient, and price data
3. System calculates dish cost and margin
4. Dashboard highlights margin problems and recommended actions
5. User opens a flagged dish for cost breakdown
6. User adjusts price or cost assumptions in the simulator
7. System shows updated margin and estimated profit impact

## User Stories

- As an owner, I want to see which dishes make money so I can stop guessing.
- As a manager, I want to identify low-margin high-volume dishes so I can prioritize price changes.
- As an operator, I want to test a new dish price before changing the printed menu.
- As a buyer, I want a simple tool that tells me what action matters most this week.

## Acceptance Criteria For MVP

- A user can create ingredients, recipes, and dishes manually.
- The system calculates dish cost from recipe ingredients and recipe yield.
- The dashboard ranks dishes by issue severity and expected impact.
- The simulator updates calculations instantly after price input changes.
- The interface remains usable on mobile without spreadsheet-style horizontal scrolling as the default experience.

