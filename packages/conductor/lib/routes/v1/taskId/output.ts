import { z } from 'zod';
import type { Json, Scheduler } from '@nangohq/scheduler';
import type { ApiError } from '@nangohq/types';
import type { EndpointRequest, EndpointResponse, RouteHandler, Route } from '@nangohq/utils';
import { validateRequest } from '@nangohq/utils';

interface Output {
    Method: typeof method;
    Path: typeof path;
    Params: {
        taskId: string;
    };
    Error: ApiError<'fetching_failed' | 'task_failed' | 'task_expired' | 'task_cancelled'>;
    Success: { output: Json };
}

const path = '/v1/:taskId/output';
const method = 'GET';

const validate = validateRequest<Output>({
    parseParams: (data) => z.object({ taskId: z.string().nonempty() }).parse(data)
});

const getHandler = (scheduler: Scheduler) => {
    return async (req: EndpointRequest<Output>, res: EndpointResponse<Output>) => {
        const task = await scheduler.get({ taskId: req.params.taskId });
        if (task.isErr()) {
            return res.status(500).json({ error: { code: 'fetching_failed', message: task.error.message } });
        }
        switch (task.value.state) {
            case 'CREATED':
            case 'STARTED':
                return res.status(204).send(); // No content yet
            case 'SUCCEEDED':
                return res.status(200).json({ output: task.value.output });
            case 'FAILED':
                return res.status(404).json({ error: { code: 'task_failed', message: `failed` } });
            case 'EXPIRED':
                return res.status(404).json({ error: { code: 'task_expired', message: `expired` } });
            case 'CANCELLED':
                return res.status(404).json({ error: { code: 'task_cancelled', message: `cancelled` } });
        }
    };
};

export const route: Route<Output> = { path, method };

export const getRouteHandler = (scheduler: Scheduler): RouteHandler<Output> => {
    return {
        ...route,
        validate,
        handler: getHandler(scheduler)
    };
};
