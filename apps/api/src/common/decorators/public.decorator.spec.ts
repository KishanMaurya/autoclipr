import 'reflect-metadata';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public decorator', () => {
  it('exposes the metadata key used to mark public routes', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('attaches isPublic=true metadata to a method', () => {
    class TestController {
      @Public()
      handler() {}
    }

    const value = Reflect.getMetadata(IS_PUBLIC_KEY, TestController.prototype.handler);
    expect(value).toBe(true);
  });

  it('attaches isPublic=true metadata to a class', () => {
    @Public()
    class TestController {}

    const value = Reflect.getMetadata(IS_PUBLIC_KEY, TestController);
    expect(value).toBe(true);
  });
});
