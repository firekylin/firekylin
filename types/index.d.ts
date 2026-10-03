declare namespace Firekylin {
  interface WidgetRow {
    [key: string]: any;
  }

  type WidgetParameters = Record<string, unknown>;
  type EmptyWidgetParameters = Record<string, never>;

  interface FieldAccessor<Value, Arguments extends unknown[] = []> {
    (...args: Arguments): Value;
    val(): Value;
  }

  class Widget<Row extends WidgetRow = WidgetRow, Parameters extends object = WidgetParameters> {
    readonly controller: any;
    readonly ctx: any;
    readonly parameter: Parameters;
    stack: Row[];
    row: Row;
    sequence: number;
    length: number;

    init(): void | Promise<void>;
    execute(): void | Promise<void>;
    model(name: string): any;
    fieldAccessor<Value = any, Arguments extends unknown[] = []>(
      name: keyof Row & string,
      formatter?: (value: any, ...args: Arguments) => Value
    ): FieldAccessor<Value, Arguments>;
    push(value: Row): Row;
    pushAll(values: Row[]): void;
    next(): Row | false;
    have(): boolean;
    alt(...values: any[]): any;
    altBy(current: number, ...values: any[]): any;
    toColumn(): Row;
    toColumn<Keys extends keyof Row>(column: Keys[]): Pick<Row, Keys>;
    toColumn<Key extends keyof Row>(column: Key): Row[Key];
    toArray(): Row[];
    toArray<Keys extends keyof Row>(column: Keys[]): Array<Pick<Row, Keys>>;
    toArray<Key extends keyof Row>(column: Key): Array<Row[Key]>;
    template(template: string): string;
    parse(template: string): string;
  }

  interface MetaRow extends WidgetRow {
    id: number;
    name: string;
    pathname: string;
    count?: number;
    create_time?: string | number | Date;
    update_time?: string | number | Date;
  }

  interface ContentRelation extends WidgetRow {
    id?: number;
    name?: string;
    title?: string;
    pathname: string;
  }

  interface ContentAuthor extends WidgetRow {
    id?: number;
    name?: string;
    display_name?: string;
  }

  interface ContentRow extends WidgetRow {
    id: number;
    title: string;
    pathname: string;
    type?: number | 'post' | 'page';
    content?: string;
    summary?: string;
    markdown_content?: string;
    create_time?: string | number | Date;
    update_time?: string | number | Date;
    comment_num?: number;
    options?: WidgetRow;
    featuredImage?: string;
    cate?: MetaRow[];
    tag?: MetaRow[];
    user?: ContentAuthor;
    prev?: ContentRelation;
    next?: ContentRelation;
    allow_comment?: boolean;
    allow_feed?: boolean;
  }

  class ContentsWidget<
    Row extends ContentRow = ContentRow,
    Parameters extends object = WidgetParameters
  > extends Widget<Row, Parameters> {
    readonly title: FieldAccessor<string, [length?: number, trim?: string]>;
    readonly permalink: string;
    readonly url: string;
    readonly content: FieldAccessor<string>;
    date(format?: string): string;
    excerpt(length?: number, trim?: string): string;
    commentsNum(...formats: string[]): string;
    category(split?: string, link?: boolean, defaultValue?: string): string;
    tags(split?: string, link?: boolean, defaultValue?: string): string;
    author(item?: string): string;
    allow(...permissions: string[]): boolean;
  }

  class MetasWidget<
    Row extends MetaRow = MetaRow,
    Parameters extends object = WidgetParameters
  > extends Widget<Row, Parameters> {
    readonly metaType: string;
    readonly title: FieldAccessor<string>;
    readonly theId: string;
    readonly permalink: string;
    readonly url: string;
  }

  interface Pagination extends WidgetRow {
    currentPage: number;
    totalPages: number;
    pageSize?: number;
    count?: number;
  }

  interface NavigationItem extends WidgetRow {
    label?: string;
    title?: string;
    url: string;
  }

  interface SiteOptionsRow extends WidgetRow {
    title: string;
    description?: string;
    keywords?: string;
    site_url?: string;
    siteUrl: string;
    theme: string;
    favicon_url?: string;
    logo_url?: string;
    navigation: NavigationItem[];
    themeConfig: WidgetRow;
    comment?: WidgetRow;
  }

  interface ArchiveParameters {
    type?: 'index' | 'post' | 'page' | 'archive' | 'search';
  }

  class ArchiveWidget extends ContentsWidget<ContentRow, ArchiveParameters> {
    archiveType: NonNullable<ArchiveParameters['type']>;
    pagination: Pagination | null;
    archiveTitle: string;
    archiveSlug: string;
    grouped: Record<string, ContentRow[]>;
    keyword: string;
    pageUrl(page: number): string;
    is(type: 'index' | 'post' | 'page' | 'archive' | 'search' | 'tag' | 'category' | 'cate' | 'author'): boolean;
  }

  interface RecentPostsParameters {
    pageSize?: number;
  }

  interface TagCloudParameters {
    sort?: 'name' | 'pathname' | 'count' | 'update_time';
    desc?: boolean;
    limit?: number;
    ignoreZeroCount?: boolean;
  }

  class TagCloudWidget extends MetasWidget<MetaRow, TagCloudParameters> {
    split(...sizes: number[]): number;
  }

  class OptionsWidget extends Widget<SiteOptionsRow> {
    readonly title: FieldAccessor<string>;
    readonly description: FieldAccessor<string>;
    readonly keywords: FieldAccessor<string>;
    readonly navigation: NavigationItem[];
    readonly themeConfig: WidgetRow;
    readonly siteUrl: string;
    themeUrl(pathname?: string): string;
  }

  interface WidgetDefinition<Parameters extends object, Instance extends Widget<any, any>> {
    params: Parameters;
    instance: Instance;
  }

  /** Extend this interface in a project declaration file to type custom Widgets. */
  interface WidgetRegistry {
    Widget_Archive: WidgetDefinition<ArchiveParameters, ArchiveWidget>;
    Widget_Options: WidgetDefinition<EmptyWidgetParameters, OptionsWidget>;
    Widget_Contents_Post_Recent: WidgetDefinition<RecentPostsParameters, ContentsWidget<ContentRow, RecentPostsParameters>>;
    Widget_Metas_Category_List: WidgetDefinition<EmptyWidgetParameters, MetasWidget>;
    Widget_Metas_Tag_Cloud: WidgetDefinition<TagCloudParameters, TagCloudWidget>;
  }

  type RegisteredWidgetName = keyof WidgetRegistry & string;
  type WidgetName = RegisteredWidgetName | `${RegisteredWidgetName}@${string}`;
  type BaseWidgetName<Name extends string> = Name extends `${infer Base}@${string}` ? Base : Name;
  type WidgetParams<Name extends string> = BaseWidgetName<Name> extends keyof WidgetRegistry
    ? WidgetRegistry[BaseWidgetName<Name>]['params']
    : WidgetParameters;
  type WidgetInstance<Name extends string> = BaseWidgetName<Name> extends keyof WidgetRegistry
    ? WidgetRegistry[BaseWidgetName<Name>]['instance']
    : Widget;

  interface WidgetFunction {
    <Name extends string>(
      name: Name & (string extends Name ? Name : Name extends WidgetName ? Name : never),
      params?: WidgetParams<Name>
    ): Promise<WidgetInstance<Name>>;
    destroy(name?: string): void;
  }

  interface TemplateContext {
    [key: string]: any;
    widget: WidgetFunction;
  }
}

declare const firekylin: Firekylin.TemplateContext;
