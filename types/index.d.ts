declare namespace Firekylin {
  type AdminFieldType = 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'password' |
    'email' | 'url' | 'radio' | 'checkbox' | 'color' | 'code' | 'hidden';

  interface AdminPanelDefinition {
    id: string;
    title: string;
    icon?: string;
    order?: number;
  }

  interface AdminPageContext {
    ctx: any;
    user: {id: number; name: string; type: number};
    pluginId: string;
  }

  interface AdminPageContent {
    notices?: Array<{type?: 'success' | 'info' | 'warning' | 'error'; message: string}>;
    sections?: AdminPageSection[];
  }

  interface AdminTableAction {
    label: string;
    href?: string;
    action?: string;
    input?: Record<string, unknown>;
    type?: 'default' | 'primary' | 'danger';
    disabled?: boolean;
  }

  interface AdminTableSelectionAction {
    key?: string;
    action: string;
    label?: string;
    input?: Record<string, unknown>;
    type?: 'default' | 'primary' | 'danger';
  }

  type AdminPageSection =
    | {type: 'text'; title?: string; content: string}
    | {type: 'description'; title?: string; columns?: number; items: Array<{label: string; value: unknown}>}
    | {type: 'table'; title?: string; rowKey?: string; pagination?: boolean;
      columns: Array<{key: string; title: string; type?: 'text' | 'actions'}>; rows: any[];
      toolbar?: AdminTableAction[];
      search?: true | {keys?: string[]; placeholder?: string; width?: number};
      selection?: {input?: string; actions: AdminTableSelectionAction[]}}
    | {type: 'stat'; title?: string; columns?: number;
      items: Array<{label: string; value: string | number; prefix?: string; suffix?: string; precision?: number}>}
    | {type: 'list'; title?: string; items: Array<string | {title: string; description?: string}>}
    | {type: 'markdown'; title?: string; content: string}
    | {type: 'image'; title?: string; src: string; alt?: string; width?: string | number}
    | {type: 'progress'; title?: string; percent: number;
      status?: 'normal' | 'exception' | 'active' | 'success'; label?: string}
    | {type: 'empty'; description?: string}
    | {type: 'divider'; title?: string}
    | {type: 'links'; title?: string;
      items: Array<{label: string; href: string; description?: string}>}
    | {type: 'code'; title?: string; content: string; language?: string}
    | {type: 'grid'; columns?: number; items: AdminPageSection[]}
    | {type: 'tabs'; items: Array<{key: string; label: string; sections: AdminPageSection[]}>}
    | {type: 'form'; id: string}
    | {type: 'actions'; ids?: string[]};

  interface AdminPageDefinition {
    id: string;
    panel: string;
    title: string;
    description?: string;
    order?: number;
    /** Set to false to keep the page routable without showing it in the admin sidebar. */
    menu?: boolean;
    load?(context: AdminPageContext): AdminPageContent | Promise<AdminPageContent>;
  }

  interface AdminFormField {
    name: string;
    type?: AdminFieldType;
    label: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    options?: Array<{label: string; value: unknown}>;
    /** Only show and submit this field when another field matches one of these values. */
    visibleWhen?: {field: string; values: unknown[]};
  }

  interface AdminFormDefinition {
    id: string;
    page: string;
    title: string;
    submitLabel?: string;
    fields: AdminFormField[];
    load?(context: AdminPageContext): Record<string, unknown> | Promise<Record<string, unknown>>;
    submit(values: Record<string, unknown>, context: AdminPageContext): unknown | Promise<unknown>;
  }

  interface AdminActionDefinition {
    id: string;
    page: string;
    label: string;
    type?: 'default' | 'primary' | 'danger';
    confirm?: string;
    handler(input: Record<string, unknown>, context: AdminPageContext): unknown | Promise<unknown>;
  }

  interface AdminPluginAPI {
    registerPanel(definition: AdminPanelDefinition): () => boolean;
    registerPage(definition: AdminPageDefinition): () => boolean;
    registerForm(definition: AdminFormDefinition): () => boolean;
    registerAction(definition: AdminActionDefinition): () => boolean;
  }

  interface AIModelDefinition {
    id: string;
    label?: string;
    capabilities?: string[];
  }

  interface AIProviderDefinition {
    id: string;
    label?: string;
    models: AIModelDefinition[];
    configured?(): boolean | Promise<boolean>;
    admin?: {formId: string; testActionId: string};
    generate(request: {provider: string; model: string; messages: Array<{role: string; content: string}>;
      [key: string]: unknown}, context: {signal?: AbortSignal; [key: string]: unknown}): unknown | Promise<unknown>;
  }

  interface AIPluginAPI {
    registerProvider(definition: AIProviderDefinition): () => boolean;
    providers(): Promise<Array<{id: string; label: string; configured?: boolean;
      admin?: {pluginId: string; formId: string; testActionId: string};
      models: Array<AIModelDefinition & {selected: boolean}>}>>;
    select(provider: string, model: string): Promise<{provider: string; model: string}>;
    generate(request: Record<string, unknown>, context?: Record<string, unknown>): Promise<unknown>;
    credentials: {
      get(name: string): Promise<string | undefined>;
      has(name: string): Promise<boolean>;
      set(name: string, value: string): Promise<void>;
      delete(name: string): Promise<void>;
    };
  }

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
    /** Article custom fields, keyed by the name entered in the admin editor. */
    fields: Record<string, string>;
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
    comment(options?: {className?: string; title?: string; loadingText?: string; resourceURL?: string}): string;
  }
}

declare const firekylin: Firekylin.TemplateContext;
