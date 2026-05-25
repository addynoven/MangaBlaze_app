import type { LazyExoticComponent, ReactElement } from "react";

export type Route = {
  key: string;
  path: string;
  component: LazyExoticComponent<<T>(props: T) => ReactElement>;
  authority: string[];
};

export type Routes = Route[];
