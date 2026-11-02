declare module '@hiveio/hive-js';
declare module 'valid-url';
declare module '@hiveio/hive-js/lib/auth/memo';
declare module '@hiveio/hive-js/lib/auth';

declare module '*.svg' {
  import React = require('react');

  export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}
