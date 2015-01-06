import uploader from 'ghost/assets/lib/choose-uploader';

var Markdown = Ember.Component.extend({
    didInsertElement: function () {
        this.set('scrollWrapper', this.$().closest('.entry-preview-content'));
    },

    adjustScrollPosition: function () {
        var scrollWrapper = this.get('scrollWrapper'),
            scrollPosition = this.get('scrollPosition');

        scrollWrapper.scrollTop(scrollPosition);
    }.observes('scrollPosition'),

    // fire off 'enable' API function from uploadManager
    // might need to make sure markdown has been processed first
    reInitDropzones: function () {
        function handleDropzoneEvents() {
            var dropzones = $('.js-drop-zone');

            uploader.call(dropzones, $.extend({
                editor: true,
            }, this.get('config')));

            dropzones.on('uploadstart', Ember.run.bind(this, 'sendAction', 'uploadStarted'));
            dropzones.on('uploadfailure', Ember.run.bind(this, 'sendAction', 'uploadFinished'));
            dropzones.on('uploadsuccess', Ember.run.bind(this, 'sendAction', 'uploadFinished'));
            dropzones.on('uploadsuccess', Ember.run.bind(this, 'sendAction', 'uploadSuccess'));
        }

        Ember.run.scheduleOnce('afterRender', this, handleDropzoneEvents);
    }.observes('markdown')
});

export default Markdown;
