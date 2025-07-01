export const getApiUrl = (path: string) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction
    ? (process.env.NEXT_PUBLIC_API_URL || 'https://mails.worxstream.io')
    : '/api';
  // Remove any leading slashes from the path
  const cleanPath = path.replace(/^\/+/,'');
  // Ensure there's exactly one slash between baseUrl and path
  return `${baseUrl.replace(/\/+$/, '')}/${cleanPath}`;
}; 