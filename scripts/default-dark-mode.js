/* global hexo */
// Runs before the theme's appearance.js, which reads this key to apply the visitor's choice.
hexo.extend.injector.register('head_begin', `<script>
try {
  if (!localStorage.getItem('icarus:appearance')) localStorage.setItem('icarus:appearance', 'dark');
} catch (e) {}
</script>`);
