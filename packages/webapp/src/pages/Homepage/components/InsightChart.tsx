import type { ChartConfig } from '../../../components/ui/Chart';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../../components/ui/Chart';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { usePostInsights } from '../../../hooks/useLogs';
import { useStore } from '../../../store';
import type { InsightsHistogramEntry, PostInsights } from '@nangohq/types';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useMemo } from 'react';
import { formatQuantity } from '../../../utils/utils';
import { addDays, format } from 'date-fns';

interface Entry {
    date: Date;
    total: number;
    success: number;
    failure: number;
}

const chartConfig = {
    success: {
        label: 'Success',
        color: '#5BB98B'
    },
    failure: {
        label: 'Failure',
        color: '#E5484D'
    }
} satisfies ChartConfig;

export const InsightChart: React.FC<{ title: string; desc: string; type: PostInsights['Body']['type']; help: React.ReactNode }> = ({
    title,
    type,
    desc,
    help
}) => {
    const env = useStore((state) => state.env);
    const { loading, data } = usePostInsights(env, { type });

    const { histogram, total } = useMemo(() => {
        if (!data) {
            return { histogram: [], total: 0 };
        }

        let total = 0;
        let startDate = addDays(new Date(), -14);
        const endDate = new Date();

        // Create date range
        const dates = [];
        while (startDate <= endDate) {
            dates.push(format(startDate, 'yyyy-MM-dd'));
            startDate = addDays(startDate, 1);
        }

        const tmp: Entry[] = [];
        const map = new Map<string, InsightsHistogramEntry>();
        for (const entry of data.histogram) {
            map.set(entry.key, entry);
        }
        for (const date of dates) {
            const entry = map.get(date);
            total += entry?.total || 0;
            tmp.push({
                date: new Date(date),
                total: entry?.total || 0,
                success: entry?.success || 0,
                failure: entry?.failure || 0
            });
        }

        return { histogram: tmp, total };
    }, [data]);

    if (loading) {
        return (
            <div className="border border-border-gray rounded-xl p-6">
                <h3 className="text-md text-white">{title}</h3>
                <div className="h-[190px] w-full  flex items-center justify-center">
                    <Skeleton style={{ width: '50%' }} />
                </div>
            </div>
        );
    }

    if (total === 0) {
        return (
            <div className="border border-border-gray rounded-xl p-6">
                <h3 className="text-md text-white">{title}</h3>
                <div className="h-[190px] w-full text-text-light-gray text-sm flex items-center justify-center">{help}</div>
            </div>
        );
    }

    return (
        <div className="border border-border-gray rounded-xl p-6">
            <div className="flex justify-between items-start">
                <h3 className="text-md text-white">{title}</h3>
                <div className="flex flex-col items-end">
                    <div className="text-white text-md">{total}</div>

                    <p className="text-text-light-gray text-sm">{desc}</p>
                </div>
            </div>
            <div className="mt-7">
                <ChartContainer config={chartConfig} className="h-[190px] w-full">
                    <BarChart data={histogram}>
                        <CartesianGrid vertical={false} stroke="#323439" />
                        <XAxis
                            dataKey="date"
                            interval={'preserveStartEnd'}
                            tickLine={false}
                            tickMargin={10}
                            minTickGap={20}
                            axisLine={false}
                            tickFormatter={(value) => {
                                return value.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                });
                            }}
                        />
                        <YAxis
                            dataKey="total"
                            interval={'preserveStartEnd'}
                            tickLine={false}
                            tickMargin={10}
                            minTickGap={20}
                            axisLine={false}
                            width={30}
                            amplitude={100}
                            tickFormatter={(value) => {
                                return formatQuantity(value);
                            }}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(_, pl) => {
                                        return new Date(pl[0].payload.date).toLocaleDateString('en-US', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        });
                                    }}
                                />
                            }
                            cursor={{ fill: '#4d4d4d45' }}
                        />
                        <Bar dataKey="success" stackId="a" fill="var(--color-success)" strokeWidth={0} animationDuration={250} animationBegin={0}>
                            {histogram.map((entry, index) => (
                                <Cell key={index} radius={(entry.failure > 0 ? [0, 0, 4, 4] : 4) as unknown as number} />
                            ))}
                        </Bar>
                        <Bar
                            dataKey="failure"
                            stackId="a"
                            fill="var(--color-failure)"
                            strokeWidth={0}
                            animationDuration={250}
                            animationBegin={0}
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ChartContainer>
            </div>
        </div>
    );
};
