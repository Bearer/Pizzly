import { z } from 'zod';
import { createAction } from '../../models.js';

// Action
export default createAction({
    name: 'My Action',
    description: 'This is an action',
    endpoint: { method: 'POST', path: '/my-action', group: 'My Group' },
    integrationId: 'unauthenticated',
    input: z.object({ foo: z.string() }),
    output: z.number(),
    version: '0.0.1',
    runAction: async (nango, input) => {
        await nango.log('coucou');
        console.log(input.foo);
        console.log(input.bar);

        return 1;
    }
});

function name(top: string) {
    console.log(top);
}

name(1);
