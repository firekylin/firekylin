declare namespace Firekylin {
  interface CustomParameters {
    limit?: number;
  }

  class CustomWidget extends Widget<WidgetRow, CustomParameters> {
    customMethod(): string;
  }

  interface WidgetRegistry {
    Widget_Custom_Posts: WidgetDefinition<CustomParameters, CustomWidget>;
  }
}

async function checkWidgetTypes(dynamicName: string) {
  const archive = await firekylin.widget('Widget_Archive', {type: 'search'});
  archive.pageUrl(2);
  archive.excerpt(80);
  archive.row.title.toUpperCase();
  archive.row.fields.customKey.toUpperCase();

  const cachedTags = await firekylin.widget('Widget_Metas_Tag_Cloud@sidebar', {
    sort: 'update_time',
    limit: 5,
    ignoreZeroCount: true
  });
  cachedTags.split(1, 5, 10);
  cachedTags.row.pathname.toUpperCase();

  const options = await firekylin.widget('Widget_Options');
  options.themeUrl('res/app.css');
  options.navigation[0].url.toUpperCase();

  const custom = await firekylin.widget('Widget_Custom_Posts', {limit: 3});
  custom.customMethod();

  const dynamic = await firekylin.widget(dynamicName, {anything: true});
  dynamic.have();
  firekylin.widget.destroy('Widget_Archive');
  firekylin.comment({className: 'article-comments', title: '评论', resourceURL: '/assets/waline'});

  // @ts-expect-error invalid archive type
  await firekylin.widget('Widget_Archive', {type: 'invalid'});
  // @ts-expect-error invalid tag sort key
  await firekylin.widget('Widget_Metas_Tag_Cloud', {sort: 'random'});
  // @ts-expect-error Options has no parameters
  await firekylin.widget('Widget_Options', {limit: 1});
  // @ts-expect-error unknown literal names should be caught while dynamic strings remain supported
  await firekylin.widget('Widget_Does_Not_Exist');
  // @ts-expect-error Options does not expose content formatting APIs
  options.excerpt();
}

declare const imageContext: Firekylin.AIProviderContext;
const validatedImage: Firekylin.AIImage = imageContext.images.image({mimeType: 'image/png', data: 'YWJj'});
const imageDataUri: string = imageContext.images.uri(validatedImage);
const referenceImages: Firekylin.AIImage[] = imageContext.images.inputs({images: [validatedImage]}, 1);

const rawStream: Firekylin.AIStreamResult = imageContext.streamResponse(new Response(''), 'chat-completions');
// @ts-expect-error only declared native streaming protocols are supported
imageContext.streamResponse(new Response(''), 'unknown');

const customStream: Firekylin.AIStreamResult = imageContext.streamResponse(new Response(''), {
  format: 'sse', parse(data) {return {text: data, done: true, usage: {tokens: 1}, resultUsage: {total_tokens: 1}};},
  end() {return {done: true};}
});
const customParserSupport: true = imageContext.streamResponse.supportsCustomParser;
imageContext.streamResponse(new Response(''));
// @ts-expect-error protocol-specific names belong to plugins, not core
imageContext.streamResponse(new Response(''), 'anthropic');
// @ts-expect-error async parsers do not own the stream lifecycle
imageContext.streamResponse(new Response(''), {format: 'sse', parse: async () => ({done: true})});

const builtinToolsPage: Firekylin.AdminPageDefinition = {
  id: 'import',
  title: 'Comment import',
  builtinPanel: 'tools'
};
const invalidBuiltinPage: Firekylin.AdminPageDefinition = {
  id: 'invalid',
  title: 'Invalid',
  // @ts-expect-error Unknown built-in panels must be rejected.
  builtinPanel: 'missing'
};
