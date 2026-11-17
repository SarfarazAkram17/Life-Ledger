import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

type IncomeTrendPoint = {
  monthStart: number;
  monthLabel: string;
  amount: number;
};

type IncomeTrendChartProps = {
  data: IncomeTrendPoint[];
  currency: string;
  sourceName: string;
};

export default function IncomeTrendChart({
  data,
  currency,
  sourceName,
}: IncomeTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="monthStart"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          ticks={data.map((month) => month.monthStart)}
          tickFormatter={(value) => format(new Date(Number(value)), "MMM")}
          interval="preserveStartEnd"
          axisLine={false}
          tickLine={false}
          tick={{
            fill: "hsl(var(--muted-foreground))",
            fontSize: 10,
          }}
        />
        <YAxis
          domain={[0, "auto"]}
          tickFormatter={(value) => formatCurrency(Number(value), currency)}
          axisLine={false}
          tickLine={false}
          tick={{
            fill: "hsl(var(--muted-foreground))",
            fontSize: 10,
          }}
          width={76}
        />
        <Tooltip
          formatter={(value) => [
            formatCurrency(Number(value), currency),
            sourceName,
          ]}
          labelFormatter={(value) =>
            format(new Date(Number(value)), "MMMM yyyy")
          }
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.75rem",
            color: "hsl(var(--popover-foreground))",
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          itemStyle={{ color: "hsl(var(--income))" }}
        />
        <Area
          type="linear"
          dataKey="amount"
          name={sourceName}
          stroke="hsl(var(--income))"
          fill="hsl(var(--income))"
          fillOpacity={0.14}
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--income))", strokeWidth: 0 }}
          activeDot={{
            r: 5,
            fill: "hsl(var(--background))",
            stroke: "hsl(var(--income))",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}