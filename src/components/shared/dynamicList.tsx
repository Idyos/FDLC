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
    <div className="w-full">
      {/* Primera parte: lista normal */}
      <div className="flex flex-col gap-2">
        {firstPart.map((item, i) => renderItem(item, i))}
      </div>

      {/* Segunda parte: grid */}
      {rest.length > 0 && (
        <div
        
          className="grid grid-cols-[repeat(auto-fit,_minmax(230px,_1fr))] gap-x-7 gap-y-2 w-full"
        >
          {rest.map((item, i) =>
            // 👇 usa renderGridItem si se proporciona, si no, usa el renderItem original
            renderGridItem
              ? renderGridItem(item, breakIndex + i)
              : renderItem(item, breakIndex + i)
          )}
        </div>
      )}
    </div>
  );
}
