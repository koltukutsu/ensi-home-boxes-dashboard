"use client";

import { LineChart as Chart } from "@tremor/react";

export interface ChartData {
    name: string;
    value: number;
    device?: string;
}

interface LineChartProps {
    data: ChartData[];
    categories: string[];
    index: string;
    colors: string[];
    valueFormatter: (value: number) => string;
    className?: string;
}

export function LineChart({
    data,
    categories,
    index,
    colors,
    valueFormatter,
    className = "",
}: LineChartProps) {
    return (
        <Chart
            data={data}
            categories={categories}
            index={index}
            colors={colors}
            valueFormatter={valueFormatter}
            className={className}
            showLegend={false}
            showGridLines={true}
            curveType="monotone"
        />
    );
}
