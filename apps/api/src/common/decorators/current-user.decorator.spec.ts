import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { AuthUser } from '../guards/jwt-auth.guard';

/**
 * NestJS custom param decorators built with createParamDecorator don't expose
 * their factory function directly. The documented way to unit test them is to
 * apply the decorator to a throwaway class, pull the factory back out of the
 * ROUTE_ARGS_METADATA reflection metadata, and invoke it directly.
 * See: https://docs.nestjs.com/custom-decorators#testing
 */
function getParamDecoratorFactory(decoratorFactory: Function) {
  const Deco = decoratorFactory as (...args: unknown[]) => ParameterDecorator;

  class TestDecorator {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public test(@Deco() _value: unknown) {
      /* noop */
    }
  }

  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestDecorator,
    'test',
  );
  return args[Object.keys(args)[0]].factory;
}

function buildContext(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

describe('CurrentUser decorator', () => {
  const factory = getParamDecoratorFactory(CurrentUser);

  it('returns the user attached to the request by the auth guard', () => {
    const user: AuthUser = { sub: 'user-123', email: 'a@b.com' };
    const ctx = buildContext({ user });

    expect(factory(undefined, ctx)).toBe(user);
  });

  it('returns undefined when no user has been attached to the request', () => {
    const ctx = buildContext({});

    expect(factory(undefined, ctx)).toBeUndefined();
  });
});
