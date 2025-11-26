export function navigateWithQuery(
  navigate: (path: string) => void,
  basePath: string,
  params: Record<string, string | number | boolean>
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    query.set(key, String(value));
  });

  navigate(`${basePath}?${query.toString()}`);
}