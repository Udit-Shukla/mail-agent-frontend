export const getApiUrl = (path: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  // Remove any leading slashes from the path
  const cleanPath = path.replace(/^\/+/,'');
  // Ensure there's exactly one slash between baseUrl and path
  return `${baseUrl.replace(/\/+$/, '')}/${cleanPath}`;
}; 