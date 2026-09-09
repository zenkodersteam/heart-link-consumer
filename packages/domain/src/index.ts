/**
 * The slice of the backend domain the admin UI genuinely needs.
 *
 * The full package in the API repo is ~6,300 lines of business logic — mail
 * templates, OCR, activation gates, entitlements — none of which belongs in a
 * frontend bundle. Admin imports exactly three symbols, and both source modules
 * are self-contained, so only they are vendored here.
 *
 * Keep in step with heart-link/packages/domain by hand, as with the API
 * contract. Anything beyond these two modules belongs on the server.
 */
export * from './intake-form';
export { canTransitionApplication } from './state-machines/application';
export * from './password-policy';
export * from './field-validation';
