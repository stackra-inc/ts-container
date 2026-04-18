/**
 * Injection Token Type
 *
 * An injection token is the identifier that the container uses to look up
 * a provider binding. It can be a class reference, a string, a symbol,
 * or a function.
 *
 * @module interfaces/injection-token
 */

import type { Type } from './type.interface';

/**
 * A token that uniquely identifies a provider in the DI container.
 *
 * Four forms are supported:
 *
 * 1. **Class reference** — the most common form. The class itself is the token.
 *    ```typescript
 *    @Injectable()
 *    class UserService {}
 *    // Token is: UserService (the class constructor)
 *    ```
 *
 * 2. **String** — useful for configuration values or when you don't have a class.
 *    ```typescript
 *    { provide: 'DATABASE_URL', useValue: 'postgres://...' }
 *    ```
 *
 * 3. **Symbol** — the recommended approach for non-class tokens. Prevents collisions.
 *    ```typescript
 *    const CACHE_CONFIG = Symbol('CACHE_CONFIG');
 *    { provide: CACHE_CONFIG, useValue: { default: 'memory' } }
 *    ```
 *
 * 4. **Function** — for factory-based tokens or abstract classes.
 *
 * @typeParam T - The type of the provider instance this token resolves to
 */
export type InjectionToken<T = any> = string | symbol | Type<T> | Function;
