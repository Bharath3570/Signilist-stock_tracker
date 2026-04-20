"use client";

import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { Trash } from "lucide-react";

export default function WatchlistTable({ data, onRemove }) {
    return (
        <div className="rounded-xl border p-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>Market Cap</TableHead>
                        <TableHead>P/E</TableHead>
                        <TableHead>Action</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {data.map((stock) => (
                        <TableRow key={stock.symbol}>
                            <TableCell>{stock.company}</TableCell>
                            <TableCell>{stock.symbol}</TableCell>
                            <TableCell>{stock.priceFormatted}</TableCell>

                            <TableCell
                                className={
                                    stock.changePercent >= 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                }
                            >
                                {stock.changeFormatted}
                            </TableCell>

                            <TableCell>{stock.marketCap}</TableCell>
                            <TableCell>{stock.peRatio || "-"}</TableCell>

                            <TableCell>
                                <button
                                    onClick={() => onRemove(stock.symbol)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <Trash size={18} />
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}