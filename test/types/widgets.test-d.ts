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
