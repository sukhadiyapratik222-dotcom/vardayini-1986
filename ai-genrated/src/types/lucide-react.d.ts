declare module 'lucide-react' {
  import * as React from 'react';

  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    strokeWidth?: number | string;
    color?: string;
    className?: string;
  }

  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >;

  export const ChevronUp: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const Check: LucideIcon;
  export const X: LucideIcon;
  export const Menu: LucideIcon;
  export const Search: LucideIcon;

  const icons: { [key: string]: LucideIcon };
  export default icons;
}
