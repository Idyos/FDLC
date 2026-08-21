import React from "react";

interface DynamicListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  renderGridItem?: (item: T, index: number) => React.ReactNode;
  breakIndex?: number;
  columns?: number;
}

export default function DynamicList<T>({ items, renderItem, renderGridItem, breakIndex = 10 }: DynamicListProps<T>) {
  if (!items || items.length === 0) return null;

  const firstPart = items.slice(0, breakIndex);
  const rest = items.slice(breakIndex);

  return (
    <div className="w-full md">
      {/* Primera parte: lista normal */}
      <div className="flex flex-col gap-3 md:gap-6">
        {firstPart.map((item, i) => renderItem(item, i))}
      </div>

      {/* Segunda parte: grid */}
      {rest.length > 0 && (
        <div
          className="grid md:grid-cols-[repeat(auto-fit,_minmax(300px,_1fr))] grid-cols-[repeat(auto-fit,_minmax(180px,_1fr))] gap-x-3 gap-y-3 mt-3 md:gap-x-6 md:gap-y-6 md:mt-6 w-full "
        >
          {rest.map((item, i) =>
            renderGridItem
              ? renderGridItem(item, breakIndex + i)
              : renderItem(item, breakIndex + i)
          )}
        </div>
      )}
    </div>
  );
}
