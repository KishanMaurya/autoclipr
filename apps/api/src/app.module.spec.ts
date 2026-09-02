import { AppModule } from './app.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { RetentionModule } from './modules/retention/retention.module';
import { BillingModule } from './modules/billing/billing.module';

/**
 * Every feature module must actually be registered on AppModule.
 *
 * A module can be fully written, unit-tested and type-checked yet never
 * imported here — an unimported module is not an *unused* import, so tsc says
 * nothing and every unit test still passes. That is exactly how
 * POST /api/v1/assistant/chat shipped as a 404 while its own 17 tests were
 * green.
 *
 * Asserted against the module metadata rather than a booted HTTP server: this
 * needs no Redis, no Supabase and no teardown, so it stays fast and cannot
 * itself become flaky.
 */
describe('AppModule wiring', () => {
  const imports = (Reflect.getMetadata('imports', AppModule) ?? []) as unknown[];

  // forwardRef entries arrive as thunks, so resolve those before comparing.
  const resolved = imports.map((m) => {
    const maybe = m as { forwardRef?: () => unknown };
    return typeof maybe?.forwardRef === 'function' ? maybe.forwardRef() : m;
  });

  it.each([
    ['AssistantModule', AssistantModule],
    ['CouponsModule', CouponsModule],
    ['CampaignsModule', CampaignsModule],
    ['RetentionModule', RetentionModule],
    ['BillingModule', BillingModule],
  ])('registers %s', (_name, mod) => {
    expect(resolved).toContain(mod);
  });
});
