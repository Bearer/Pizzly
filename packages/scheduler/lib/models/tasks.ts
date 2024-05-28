import type { JsonValue } from 'type-fest';
import type knex from 'knex';
import type { Result } from '@nangohq/utils';
import { Ok, Err, stringifyError } from '@nangohq/utils';
import type { TaskState, Task, TaskTerminalState, TaskNonTerminalState } from '../types.js';
import { uuidv7 } from 'uuidv7';

export const TASKS_TABLE = 'tasks';

export type TaskProps = Omit<Task, 'id' | 'createdAt' | 'state' | 'lastStateTransitionAt' | 'lastHeartbeatAt' | 'output' | 'terminated'>;

export const taskStates = ['CREATED', 'STARTED', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED'] as const;

interface TaskStateTransition {
    from: TaskState;
    to: TaskState;
}

export const validTaskStateTransitions = [
    { from: 'CREATED', to: 'STARTED' },
    { from: 'CREATED', to: 'CANCELLED' },
    { from: 'CREATED', to: 'EXPIRED' },
    { from: 'STARTED', to: 'SUCCEEDED' },
    { from: 'STARTED', to: 'FAILED' },
    { from: 'STARTED', to: 'CANCELLED' },
    { from: 'STARTED', to: 'EXPIRED' }
] as const;
const validToStates: TaskState[] = taskStates.filter((state) => {
    return validTaskStateTransitions.every((transition) => transition.from !== state);
});
export type ValidTaskStateTransitions = (typeof validTaskStateTransitions)[number];

const TaskStateTransition = {
    validate({ from, to }: { from: TaskState; to: TaskState }): Result<ValidTaskStateTransitions> {
        const transition = validTaskStateTransitions.find((t) => t.from === from && t.to === to);
        if (transition) {
            return Ok(transition);
        } else {
            return Err(new Error(`Invalid state transition from ${from} to ${to}`));
        }
    }
};

interface DbTask {
    readonly id: string;
    readonly name: string;
    readonly payload: JsonValue;
    readonly group_key: string;
    readonly retry_max: number;
    readonly retry_count: number;
    readonly starts_after: Date;
    readonly created_to_started_timeout_secs: number;
    readonly started_to_completed_timeout_secs: number;
    readonly heartbeat_timeout_secs: number;
    readonly created_at: Date;
    state: TaskState;
    last_state_transition_at: Date;
    last_heartbeat_at: Date;
    output: JsonValue | null;
    terminated: boolean;
}
const DbTask = {
    to: (task: Task): DbTask => {
        return {
            id: task.id,
            name: task.name,
            payload: task.payload,
            group_key: task.groupKey,
            retry_max: task.retryMax,
            retry_count: task.retryCount,
            starts_after: task.startsAfter,
            created_to_started_timeout_secs: task.createdToStartedTimeoutSecs,
            started_to_completed_timeout_secs: task.startedToCompletedTimeoutSecs,
            heartbeat_timeout_secs: task.heartbeatTimeoutSecs,
            created_at: task.createdAt,
            state: task.state,
            last_state_transition_at: task.lastStateTransitionAt,
            last_heartbeat_at: task.lastHeartbeatAt,
            output: task.output,
            terminated: task.terminated
        };
    },
    from: (dbTask: DbTask): Task => {
        return {
            id: dbTask.id,
            name: dbTask.name,
            payload: dbTask.payload,
            groupKey: dbTask.group_key,
            retryMax: dbTask.retry_max,
            retryCount: dbTask.retry_count,
            startsAfter: dbTask.starts_after,
            createdToStartedTimeoutSecs: dbTask.created_to_started_timeout_secs,
            startedToCompletedTimeoutSecs: dbTask.started_to_completed_timeout_secs,
            heartbeatTimeoutSecs: dbTask.heartbeat_timeout_secs,
            createdAt: dbTask.created_at,
            state: dbTask.state,
            lastStateTransitionAt: dbTask.last_state_transition_at,
            lastHeartbeatAt: dbTask.last_heartbeat_at,
            output: dbTask.output,
            terminated: dbTask.terminated
        };
    }
};

export async function create(db: knex.Knex, taskProps: TaskProps): Promise<Result<Task>> {
    const now = new Date();
    const newTask: Task = {
        ...taskProps,
        id: uuidv7(),
        createdAt: now,
        state: 'CREATED',
        lastStateTransitionAt: now,
        lastHeartbeatAt: now,
        terminated: false,
        output: null
    };
    try {
        const inserted = await db.from<DbTask>(TASKS_TABLE).insert(DbTask.to(newTask)).returning('*');
        if (!inserted?.[0]) {
            return Err(new Error(`Error: no task '${taskProps.name}' created`));
        }
        return Ok(DbTask.from(inserted[0]));
    } catch (err: unknown) {
        return Err(new Error(`Error creating task '${taskProps.name}': ${stringifyError(err)}`));
    }
}

export async function get(db: knex.Knex, taskId: string): Promise<Result<Task>> {
    const task = await db.from<DbTask>(TASKS_TABLE).where('id', taskId).first();
    if (!task) {
        return Err(new Error(`Task with id '${taskId}' not found`));
    }
    return Ok(DbTask.from(task));
}

export async function list(db: knex.Knex, params?: { groupKey?: string; state?: TaskState; limit?: number }): Promise<Result<Task[]>> {
    const query = db.from<DbTask>(TASKS_TABLE);
    if (params?.groupKey) {
        query.where('group_key', params.groupKey);
    }
    if (params?.state) {
        query.where('state', params.state);
    }
    const limit = params?.limit || 100;
    const tasks = await query.limit(limit);
    return Ok(tasks.map(DbTask.from));
}

export async function heartbeat(db: knex.Knex, taskId: string): Promise<Result<Task>> {
    try {
        const updated = await db.from<DbTask>(TASKS_TABLE).where('id', taskId).update({ last_heartbeat_at: new Date() }).returning('*');
        if (!updated?.[0]) {
            return Err(new Error(`Error: Task with id '${taskId}' not updated`));
        }
        return Ok(DbTask.from(updated[0]));
    } catch (err: unknown) {
        return Err(new Error(`Error updating task ${taskId}: ${stringifyError(err)}`));
    }
}

export async function transitionState(
    db: knex.Knex,
    props:
        | {
              taskId: string;
              newState: TaskTerminalState;
              output: JsonValue;
          }
        | {
              taskId: string;
              newState: TaskNonTerminalState;
          }
): Promise<Result<Task>> {
    const task = await get(db, props.taskId);
    if (task.isErr()) {
        return Err(new Error(`Task with id '${props.taskId}' not found`));
    }

    const transition = TaskStateTransition.validate({ from: task.value.state, to: props.newState });
    if (transition.isErr()) {
        return Err(transition.error);
    }

    const output = 'output' in props ? props.output : null;
    const updated = await db
        .from<DbTask>(TASKS_TABLE)
        .where('id', props.taskId)
        .update({
            state: transition.value.to,
            last_state_transition_at: new Date(),
            terminated: validToStates.includes(transition.value.to),
            output
        })
        .returning('*');
    if (!updated?.[0]) {
        return Err(new Error(`Task with id '${props.taskId}' not found`));
    }
    return Ok(DbTask.from(updated[0]));
}

export async function dequeue(db: knex.Knex, { groupKey, limit }: { groupKey: string; limit: number }): Promise<Result<Task[]>> {
    try {
        const tasks = await db
            .update({
                state: 'STARTED',
                last_state_transition_at: new Date()
            })
            .from<DbTask>(TASKS_TABLE)
            .whereIn(
                'id',
                db
                    .select('id')
                    .from<DbTask>(TASKS_TABLE)
                    .where({ group_key: groupKey, state: 'CREATED' })
                    .where('starts_after', '<=', db.fn.now())
                    .orderBy('created_at')
                    .limit(limit)
                    .forUpdate()
                    .skipLocked()
            )
            .returning('*');
        if (!tasks?.[0]) {
            return Ok([]);
        }
        // Sort tasks by id (uuidv7) to ensure ordering by creation date
        const sorted = tasks.sort((a, b) => a.id.localeCompare(b.id)).map(DbTask.from);
        return Ok(sorted);
    } catch (err: unknown) {
        return Err(new Error(`Error dequeuing tasks for group key '${groupKey}': ${stringifyError(err)}`));
    }
}

export async function expiresIfTimeout(db: knex.Knex): Promise<Result<Task[]>> {
    try {
        const tasks = await db
            .update({
                state: 'EXPIRED',
                last_state_transition_at: new Date(),
                terminated: true,
                output: db.raw(`
                    CASE
                        WHEN state = 'CREATED' AND starts_after + created_to_started_timeout_secs * INTERVAL '1 seconds' < CURRENT_TIMESTAMP THEN '{"reason": "createdToStartedTimeoutSecs_exceeded"}'
                        WHEN state = 'STARTED' AND last_heartbeat_at + heartbeat_timeout_secs * INTERVAL '1 seconds' < CURRENT_TIMESTAMP THEN '{"reason": "heartbeatTimeoutSecs_exceeded"}'
                        WHEN state = 'STARTED' AND last_state_transition_at + started_to_completed_timeout_secs * INTERVAL '1 seconds' < CURRENT_TIMESTAMP THEN '{"reason": "startedToCompletedTimeoutSecs_exceeded"}'
                        ELSE output
                    END
                `)
            })
            .from<DbTask>(TASKS_TABLE)
            .whereIn(
                'id',
                db
                    .select('id')
                    .from<DbTask>(TASKS_TABLE)
                    .where((builder) => {
                        builder
                            .where({ state: 'CREATED' })
                            .andWhere(db.raw(`starts_after + created_to_started_timeout_secs * INTERVAL '1 seconds' < CURRENT_TIMESTAMP`));
                        builder
                            .orWhere({ state: 'STARTED' })
                            .andWhere(db.raw(`last_heartbeat_at + heartbeat_timeout_secs * INTERVAL '1 seconds' < CURRENT_TIMESTAMP`));
                        builder
                            .orWhere({ state: 'STARTED' })
                            .andWhere(db.raw(`last_state_transition_at + started_to_completed_timeout_secs * INTERVAL '1 seconds' < CURRENT_TIMESTAMP`));
                    })
                    .forUpdate()
                    .skipLocked()
                    .debug(true)
            )
            .returning('*');
        if (!tasks?.[0]) {
            return Ok([]);
        }
        return Ok(tasks.map(DbTask.from));
    } catch (err: unknown) {
        return Err(new Error(`Error expiring tasks: ${stringifyError(err)}`));
    }
}
