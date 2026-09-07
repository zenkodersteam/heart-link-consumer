# @heartlink/consumer-content

Member-facing copy that the website and the phone app both render: the policy
documents and the support answers.

It holds text and nothing else — no components, no styling, and nothing that
imports `react-native` or the DOM, so either surface can lay it out its own way.

It is separate from `@heartlink/consumer-api` on purpose: that package is the
HTTP client, and legal wording does not belong inside it.

A second copy of this text is the failure worth avoiding. The policy versions
are recorded against a member's consent server-side, and the support answers
describe what the product actually does — two drifting copies means one of them
is telling members something untrue.
