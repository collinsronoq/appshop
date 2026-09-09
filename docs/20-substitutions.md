# Substitutions

`ProductSubstitute` is a reusable household preference. `SubstitutionRequest` is a one-trip
approval decision and stores durable proposal snapshots. A shopper may apply a configured
preferred substitute directly (without a request), or submit a catalogue-backed/ad-hoc proposal
for household approval. Requesters cannot self-approve. Approved replacements remain pending until
the shopper collects the item; requested and purchased snapshots remain separate.

Requests are household-scoped, enforce one pending request per trip item, support JPEG/PNG/WebP
images through the existing local storage validator, and publish post-commit substitution events
using the trip version. Pending requests are discoverable in-app; push notifications are not yet
implemented.
