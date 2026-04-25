# Deep Business Audit v2 - Menu Profit Optimizer

## Final Verdict

**GO (build-driven validation)**

This is a go for product-logic validation, not a go for proven market demand.

The right move now is to build the deterministic profit engine, run it against synthetic menus, stress-test the recommendation system, and prove that the product can output useful weekly actions with credible EUR impact. That is enough to justify moving into RM2 and RM3. It is not enough to claim commercial certainty.

## Strategy Shift

Validation in this phase is performed through:

- synthetic menu datasets
- deterministic profit modeling
- scenario-based stress testing
- recommendation quality review

Validation in this phase is **not** driven by interviews.

Reason:

- the product's core risk is currently model quality, not feature breadth
- if the engine cannot produce sharp actions from controlled data, customer interviews are premature
- a premium decision-first product needs a credible internal logic core before external selling pressure is useful

Constraint:

Synthetic validation proves internal product logic. It does **not** prove:

- willingness to pay
- retention
- onboarding feasibility in live restaurants
- real-world data quality tolerance

That commercial uncertainty remains open.

Invoice Scan / Supplier Cost Intake strengthens this thesis because it attacks one of the biggest current product risks directly: stale ingredient cost input.

## 1. Market Reality

### Market Type

- fragmented SMB restaurant market
- low and uneven tech maturity
- high operational pressure
- weak analytical discipline in many venues

### Core Insight

Many restaurants:

- do not trust their own numbers
- do not update pricing frequently
- operate on intuition
- rely on stale spreadsheets or descriptive POS reporting

That creates room for a profit decision tool if it does three things well:

1. compresses complexity
2. produces clear actions
3. shows financial impact fast

A strong extension of that wedge is turning supplier invoices into confirmed cost updates and margin alerts without turning the product into accounting software.

### Commercial Interpretation

This is a real problem space. It is not a clean greenfield market.

The opportunity is not "restaurants need software." The opportunity is:

- restaurants need help converting scattered cost and sales data into decisions
- existing systems often stop at reporting
- smaller operators still behave manually even when software exists

## 2. Competitive Landscape

### Direct

There is **no dominant standalone SMB brand** clearly owning the narrow position of "profit optimization layer for independent restaurants."

That is the real opening.

### Indirect

The indirect competition is strong:

- POS systems such as CompuCash, Lightspeed, and Trivec
- broader food cost / recipe / back-office tools
- Excel / Google Sheets
- internal manager judgment

### Important Correction

It is not accurate to say competitors do nothing beyond storage and reports.

Several adjacent tools already claim:

- recipe costing
- profitability reporting
- menu engineering
- price tracking
- alerts

The actual gap is narrower:

- owner-facing weekly action clarity
- lighter adoption path for small restaurants
- less back-office complexity
- stronger decision-first UX
- easier cost-refresh workflow from real supplier documents

### Key Gap

Most existing systems are one of these:

- data systems first
- operations systems first
- reporting systems first

The wedge for Menu Profit Optimizer is:

- decision system first
- impact expressed in EUR
- small-operator friendly
- premium but operationally simple

## 3. Product Thesis

This product succeeds if:

- it gives 3-5 credible weekly actions
- each action has visible EUR impact
- the logic is explainable
- the UI feels more like a control panel than a spreadsheet
- supplier cost changes can be turned into confirmed updates and dish-impact alerts with low user effort

This product fails if:

- it becomes a reporting dashboard
- recommendations are obvious, generic, or low-value
- it requires too much clean data to be usable
- it looks like Excel with darker colors

### Strong Thesis Version

If a restaurant owner can open the dashboard and immediately see:

- which dishes are leaking profit
- what to change next
- what the change is worth in EUR

then the product has a credible core.

## 4. Core Risk Analysis

### Risk 1 - Bad Data

Typical failure modes:

- incomplete recipes
- missing yield
- inconsistent units
- outdated ingredient costs
- weak sales-volume inputs

Mitigation:

- defaults
- estimation layer
- confidence labels
- partial-data mode
- explicit assumptions
- invoice photo upload plus confirm screen to reduce stale cost input

Assessment:

This risk is still high. Synthetic validation does not remove it. It only helps define how tolerant the engine can be to imperfect inputs.

### Risk 2 - Low Retention

Failure mode:

- user logs in once
- sees an audit-like result
- never comes back

Mitigation:

- weekly action report
- visible financial impact
- stale-data prompts
- recurring scenario changes
- supplier invoice cost-intake workflow as a natural return trigger

Assessment:

This is still unresolved without live usage, but the product can be designed to support retention from the start.

### Risk 3 - One-Time Tool

Failure mode:

- product is useful once during pricing review
- then behaves like an annual audit, not a recurring system

Mitigation:

- dynamic price-change simulation
- ingredient cost change handling
- recurring alert logic
- weekly action rhythm

Assessment:

This is a business-model risk, not just a product risk.

### Risk 4 - Trivial Recommendations

Failure mode:

- "raise price" appears everywhere
- recommendations are obvious to any operator
- output does not justify software value

Mitigation:

- include impact ranking
- include interaction between sales volume and low margin
- generate tradeoff-aware actions
- test multiple restaurant archetypes

Assessment:

This is the most important short-term product risk. Synthetic validation is the correct tool for it.

## 5. Monetization Analysis

### Working Price Band

Expected early willingness to pay remains roughly:

- `EUR 30-100/month`

That is a reasonable starting band for a single-location SMB product.

### Value Anchor

If the tool can credibly show:

- `EUR 300-500` monthly recoverable profit

then a `EUR 49-99/month` price becomes easy to justify.

### Pricing Logic

The price cannot be justified by feature count.
It must be justified by:

- profit recovered
- time saved
- confidence created

### Practical Conclusion

The current monetization story is acceptable for a build-driven phase.

No pricing model should be treated as validated until the engine proves it can generate non-trivial profit deltas across realistic menus.

Invoice Scan / Supplier Cost Intake improves the business case indirectly:

- it reduces stale input data risk
- it creates a recurring weekly or monthly workflow
- it makes price-change alerts more credible
- it improves retention potential

It does not remove the risk of bad OCR, bad units, or bad supplier invoice formats.

## 6. Synthetic Validation Model

### Objective

Validate whether the core engine can produce useful, ranked, financially meaningful actions before live customer discovery.

### Step 1 - Create 3 Menu Datasets

Create at minimum:

1. high-margin restaurant
2. low-margin restaurant
3. mixed restaurant

Each dataset should include:

- 15-30 dishes
- ingredient list
- costs
- recipe quantities
- yields
- prices
- sales volume

### Step 2 - Run The Engine

For each dataset:

- calculate dish cost
- calculate margin
- calculate profit contribution
- classify status
- generate top recommendations

### Step 3 - Stress Test Scenarios

Run scenarios such as:

- ingredient cost spike in top-selling dish
- low-margin bestseller
- low-sales high-margin item
- across-the-board food inflation
- missing yield assumptions
- partial recipe data
- operator price increase of `EUR 0.50`, `EUR 1.00`, and `EUR 2.00`
- invoice parse with medium-confidence ingredient matches
- supplier invoice with mixed units across similar product lines

### Step 4 - Evaluate Recommendation Quality

Questions to answer:

- are recommendations logically consistent?
- do they rank the right problems first?
- do they avoid trivial outputs?
- do they generate meaningful profit delta?
- do they remain explainable under imperfect data?

### Step 5 - Score The Engine

Use a deterministic review score:

- recommendation relevance
- recommendation specificity
- estimated EUR impact quality
- robustness under missing data
- clarity of explanation

## 7. Success Criteria (No Interviews In This Phase)

Product logic is valid if:

- outputs actionable decisions
- decisions produce measurable profit delta
- recommendation logic holds across multiple datasets
- top actions remain stable under reasonable stress tests
- explanation quality stays clear

### Strong Pass Signals

- each dataset yields 3-5 actions worth reviewing
- at least one action per dataset creates material profit improvement
- recommendation ranking matches operator common sense
- the engine does not collapse when some data is estimated

### Suggested Quantitative Bar

Treat the synthetic engine as promising if:

- top recommendations show a modeled profit improvement of at least `5-10%` on affected dishes or meaningful monthly EUR gains
- recommendation outputs remain non-trivial across all three base datasets
- partial-data mode still produces useful but lower-confidence outputs

## 8. Failure Criteria

Kill or pivot if:

- recommendations are trivial or obvious
- modeled profit impact is below `5%` in meaningful scenarios
- output quality depends on unrealistically perfect data
- ranking is unstable or nonsensical
- the system cannot explain why a recommendation exists

### Hard Failure Examples

- every output is "raise price"
- high-sales low-margin dishes are not prioritized
- missing yield makes the engine useless instead of gracefully uncertain
- mixed dataset produces noisy, low-value actions

## 9. Go-Forward Decision

Proceed with:

- RM2
- RM3

That means:

- build the core action layer
- build the dish detail and breakdown views
- validate recommendation usefulness through simulation

Do **not**:

- pause for interviews in this phase
- overbuild integrations
- turn this into a broad analytics suite

Focus:

`build -> simulate -> refine`

## 10. What This Means For The Roadmap

### Immediate Priority

The next sprint should prove:

- the recommendation engine is worth looking at
- the UI can present actions clearly
- dish-level drill-down supports trust

### Build Sequence

1. deterministic cost and margin engine
2. synthetic dataset library
3. recommendation rules and ranking
4. action-first dashboard layer
5. dish detail explanation layer
6. scenario simulation harness

### Not Yet

- POS integrations
- supplier sync
- customer interviews as the gating mechanism
- marketplace or partnership work
- enterprise multi-location logic

## 11. Product Requirements For This Validation Mode

### Must Exist

- accurate formulas
- stable recommendation ranking
- synthetic datasets with clear archetypes
- before/after profit delta views
- action cards with explanation
- data-confidence treatment
- confirm-before-write discipline for supplier invoice cost intake

### Can Wait

- live onboarding
- real customer imports
- alert delivery system
- payments and billing
- full authentication model

### UX Requirement

Even in build-driven validation, the UI cannot look disposable.

Reason:

- a weak UI will hide whether the decision model is actually persuasive
- this product's value is partly analytical and partly presentation-driven

The first customer-facing surfaces should already look like a premium decision console.

## 12. Revised Business Position

### Why This Is Still A Go

- the problem space is real
- the core wedge is still credible
- synthetic validation is appropriate for model testing
- the product can be de-risked through deterministic scenarios before live field work

### Why This Is Not A Blind Go

Build-driven validation reduces product risk.
It does not remove:

- market risk
- pricing risk
- retention risk
- onboarding risk

So the correct interpretation is:

**GO for product-core build and simulation**

not:

**GO with proven demand**

## 13. Recommended Next Codex Sprint

Build only the validation core:

1. create synthetic restaurant datasets
2. implement deterministic margin and profit modeling
3. implement recommendation rules
4. build action-first dashboard mock or product slice
5. build dish detail breakdown
6. build scenario stress-test flow
7. compare recommendation outputs across archetypes

## 14. Final Recommendation

Proceed.

Do not stop for interviews now.
Do not overcomplicate market analysis in this phase.
Do not pretend the category is empty.

Build the decision engine and the premium action layer first.
Then test whether the product produces sharp, non-trivial, financially meaningful outputs across controlled restaurant scenarios.

Once the core is stable, Invoice Scan / Supplier Cost Intake is the right V2 validation feature because it reduces stale cost risk and improves retention potential without changing the product into an accounting tool.

If the product cannot impress in simulation, it will not impress in the field.
