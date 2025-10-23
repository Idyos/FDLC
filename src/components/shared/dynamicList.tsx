import React from "react";

interface DynamicListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  breakIndex?: number;
  columns?: number;
}

export default function DynamicList<T>({items, renderItem, breakIndex = 10, columns = 3}: DynamicListProps<T>) {
    if (!items || items.length === 0) return null;

    const firstPart = items.slice(0, breakIndex);
    const rest = items.slice(breakIndex);

  return (
    <div className="w-full">
      {/* Primera parte: lista normal */}
      <div className="flex flex-col gap-2">
        {firstPart.map((item, i) => renderItem(item, i))}
      </div>

      {/* Segunda parte: grid */}
      {rest.length > 0 && (
        <div
          className={`mt-6 grid gap-3`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {rest.map((item, i) => renderItem(item, breakIndex + i))}
        </div>
      )}
    </div>
  );
}
