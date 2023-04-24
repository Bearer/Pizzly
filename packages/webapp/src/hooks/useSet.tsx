import { useState, useCallback } from 'react';

export default function useSet<T>(initialValue?: T[], limit?: number) {
    const [, setInc] = useState(false);

    const set = new Set<T>(initialValue);

    const add = useCallback(
        (item: T) => {
            if (set.has(item) || (limit && Array.from(set.values()).length >= limit)) return;
            setInc((prev) => !prev);
            set.add(item);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [setInc]
    );

    const remove = useCallback(
        (item: T) => {
            if (!set.has(item)) return;
            setInc((prev) => !prev);
            set.delete(item);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [setInc]
    );

    return [set, add, remove] as const;
}
