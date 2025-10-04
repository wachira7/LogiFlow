declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '@/globals.css';
declare module './globals.css';