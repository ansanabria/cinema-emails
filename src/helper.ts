export function getCurrentDate(loc: string): string {
  const [day, month, year] = new Date()
    .toLocaleDateString(loc)
    .split('/')
    .map((arg) => parseInt(arg));
  return new Date(year, month - 1, day).toISOString();
}
