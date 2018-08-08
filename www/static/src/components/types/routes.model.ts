export interface SideBarItem {
    url: string;
    icon?: string;
    title: string;
    children?: Array<SideBarChildItem>;
    type?: number;
  }

export interface SideBarChildItem {
    url: string;
    title: string;
}