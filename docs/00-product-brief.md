# Household Shopping Assistant — Product Brief

## 1. Product Summary

The Household Shopping Assistant is a collaborative household purchasing and restocking application designed to help families coordinate shopping, remember the exact products they prefer, and build a reusable history of what they buy.

The product is not positioned as only a shared grocery checklist. Its long-term value is to become a household purchasing memory: a system that remembers preferred brands, sizes, quantities, substitutes, past purchases, and eventually likely restocking needs.

## 2. Core Problem

Household shopping is often coordinated informally through memory, calls, messaging apps, or handwritten lists. This creates recurring problems:

- the shopper does not know the exact brand, size, quantity, or variant required;
- household members forget items until someone is already at the store;
- the same commonly purchased items are manually listed repeatedly;
- product substitutions require calls or chat messages;
- there is no durable household record of what was purchased and when;
- families cannot easily use purchase history to predict future restocking needs.

## 3. Primary Audience

### MVP audience
Households with two or more people who participate in household shopping.

Typical examples:

- couples;
- families;
- shared homes;
- households where one person prepares the list and another shops;
- households that regularly purchase the same brands and quantities.

### Future audience
The domain model should leave room for later business-oriented inventory and procurement products, but business inventory is explicitly outside the MVP.

## 4. Value Proposition

The application should help a household answer four questions:

1. What do we need?
2. What exact product should be purchased?
3. Who is currently shopping and what has already been collected?
4. What do we normally buy and when might we need it again?

## 5. Product Principles

### Household-first
Resources belong to a household workspace rather than to a shared login.

### Product memory
Frequently purchased products should retain preferred brand, variant, size, quantity, notes, image, and substitute preferences.

### Collaboration
Multiple household members must be able to update a list without refreshing the application.

### Low-friction entry
A user must be able to add a simple ad-hoc item without first creating a fully structured product.

### Historical integrity
Shopping intent, actual shopping activity, and completed purchase history are separate concepts.

### Progressive intelligence
Restocking intelligence should emerge from reliable purchase history before introducing AI or machine learning.

## 6. MVP Scope

The first production-capable version includes:

- user registration and authentication;
- household creation;
- household invitations and membership;
- household product catalogue;
- categories;
- product attributes and images;
- preferred substitutes;
- shared shopping lists;
- ad-hoc shopping list items;
- realtime collaboration;
- shopping mode;
- shopping trips;
- collect, skip, and undo actions;
- substitution requests and decisions;
- trip completion;
- purchase history;
- recent and frequently purchased products;
- push notifications for important collaborative events.

## 7. Explicit Non-Goals for MVP

The MVP does not include:

- AI chat assistant;
- receipt OCR;
- retailer catalogue integrations;
- price comparison across stores;
- exact household inventory counts;
- barcode catalogue integration;
- delivery fulfilment;
- budgeting engine;
- loyalty programme integrations;
- business inventory;
- automated procurement;
- machine-learning based restocking.

## 8. Long-Term Product Direction

The intended progression is:

1. Shared household shopping
2. Household purchasing memory
3. Restocking suggestions
4. Receipt ingestion
5. Price history
6. Store comparison
7. Household purchasing intelligence

The MVP should collect the structured data needed for these later stages without implementing them prematurely.
