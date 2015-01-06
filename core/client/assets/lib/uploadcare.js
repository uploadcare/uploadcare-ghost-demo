var UploadUi,
    UploadcareUrl,
    OPERATIONS,
    upload;


/*
 * Mapping of Uploadcare CDN URL operations
 * to transform the original image.
 *   command: The command to be applied
 *   params: Parameters to the command
 *   find: Command (with parameters) to search in the URL to determine whether the command is applied.
 *   drop: Commands to be dropped when applying this command
 */
OPERATIONS = {
    'gray': {
        command: 'grayscale',
        find: 'grayscale',
        drop: ['grayscale'],
    },
    'invert': {
        command: 'invert',
        find: 'invert',
        drop: ['invert'],
    },
    'sharp': {
        command: 'sharp',
        params: ['10'],
        find: 'sharp',
        drop: ['sharp', 'blur'],
    },
    'blur': {
        command: 'blur',
        params: ['50'],
        find: 'blur',
        drop: ['sharp', 'blur'],
    },
    'rot90': {
        command: 'rotate',
        params: ['90'],
        find: 'rotate/90',
        drop: ['rotate'],
    },
    'rot180': {
        command: 'rotate',
        params: ['180'],
        find: 'rotate/180',
        drop: ['rotate'],
    },
    'rot270': {
        command: 'rotate',
        params: ['270'],
        find: 'rotate/270',
        drop: ['rotate'],
    },
    'mirror': {
        command: 'mirror',
        find: 'mirror',
        drop: ['mirror'],
    },
    'flip': {
        command: 'flip',
        find: 'flip',
        drop: ['flip'],
    },
    '480': {
        command: 'preview',
        params: ['480x240'],
        find: 'preview/480x240',
        drop: ['preview'],
    },
    '600': {
        command: 'preview',
        params: ['600x480'],
        find: 'preview/600x480',
        drop: ['preview'],
    },
    '800': {
        command: 'preview',
        params: ['800x600'],
        find: 'preview/800x600',
        drop: ['preview'],
    },
    '1200': {
        command: 'preview',
        params: ['1200x800'],
        find: 'preview/1200x800',
        drop: ['preview'],
    },
}


/*
 * Uploadcare URL analyzer and constructor
 */
var UploadcareUrl = function(expr) {

    /* Constants */
    var _p = function(i) { return '[0-9a-f]{' + i + '}' };
    var UUID_RX = [_p(8), _p(4), _p(4), _p(4), _p(12)].join('-');
    var DEFAULT_ROOT = 'http://www.ucarecdn.com';

    // Parse the URL expression
    var rx = new RegExp('^(https?:\\/\\/[\\w.:]+\\/)(' + UUID_RX + ')\\/(.*?)([^\\/]*)$', 'g');
    var values = rx.exec(expr);

    // Break down the URL to components
    if (values) {
        this.root = values[1] || DEFAULT_ROOT;
        this.uuid = values[2];
        this.cmds = values[3];
        this.file = values[4];
    } else {
        this.root = DEFAULT_ROOT;
        this.uuid = this.cmds = this.file = '';
    }

    // Pop crop operation
    var rx = /^(-\/crop\/[^-]+\/)(.*)$/g;
    values = rx.exec(this.cmds);
    if (values) {
        this.crop = values[1];
        this.cmds = values[2];
    } else {
        this.crop = '';
    }

    $.extend(this, {
        _op_rx : function(operation) {
            return new RegExp('(-\/' + operation + '\/([^-]*?\/)?)(?=-\/|[^\/]*$)', 'g');
        },
        find: function(operation) {
            return this._op_rx(operation).test(this.cmds);
        },
        drop: function(operations) {
            for (var i=0; i<operations.length; i++) {
                this.cmds = this.cmds.replace(this._op_rx(operations[i]), '');
            };
        },
        add: function(operation, params) {
            this.cmds = this.cmds + '-/' + operation + '/';
            if (params) this.cmds = this.cmds + params.join('/') + '/';
        },
        compile: function() {
            if (!this.uuid) return '';
            return this.root + this.uuid + '/' + this.crop + this.cmds + this.file;
        },
    });
};


UploadUi = function ($dropzone, settings) {
    var $cancel = '<a class="image-cancel js-cancel" title="DEL"><span class="hidden">DEL</span></a>',
        $widget = '<input type="hidden" role="uploadcare-uploader" data-images-only="true"'
                + ' data-crop data-tabs="file camera url facebook gdrive dropbox instagram flickr"'
                + ' data-public-key="' + settings.uploadcarePublicKey + '"'
                + ' data-autostore="true"></input>',
        $cmds   = '<div class="edit-buttons bottom-left">',
        $resize = '<div class="edit-buttons bottom-right">';

    // Command buttons and Resize buttons
    var btn = function(fn, title) {
        return '<a class="image image-' + fn + ' js-' + fn + '" title="' + title + '">'
               + '<span class="hidden">' + title + '</span></a>';
    };
    $cmds = $cmds
            + btn('gray', 'Grayscale') + '&nbsp;'
            + btn('invert', 'Invert') + '&nbsp;'
            + btn('sharp', 'Sharpen') + '&nbsp;'
            + btn('blur', 'Blur') + '<br/>'
            + btn('rot90', 'Rotate 90&deg;') + '&nbsp;'
            + btn('rot180', 'Rotate 180&deg;') + '&nbsp;'
            + btn('rot270', 'Rotate 270&deg;') + '&nbsp;'
            + btn('mirror', 'Mirror') + '&nbsp;'
            + btn('flip', 'Flip')
            + '</div>';
    $resize = $resize
            + btn('480', 'Fit into 480x240 px') + '&nbsp;'
            + btn('600', 'Fit into 600x480 px') + '<br/> '
            + btn('800', 'Fit into 800x600 px') + '&nbsp;'
            + btn('1200', 'Fit into 1200x800 px')
            + '</div>';

    $.extend(this, {

        bindFileUpload: function () {
            var self = this;

            $dropzone.append($widget);
            var input = $dropzone.find('[role=uploadcare-uploader]');
            uploadcare.Widget(input).onUploadComplete(function(fileInfo) {
                $dropzone.trigger('uploadsuccess', fileInfo.cdnUrl || 'http://');
            });
        },

        initWithUploadcare: function () {
            var self = this;

            // This is the start point if no image exists
            $dropzone.find('img.js-upload-target').css({display: 'none'});
            $dropzone.find('div.description').show();
            $dropzone.removeClass('pre-image-uploader image-uploader-url').addClass('image-uploader');
            this.bindFileUpload();
        },

        initWithImage: function (src) {
            var self = this;

            // This is the start point if an image already exists
            $dropzone.removeClass('image-uploader image-uploader-url').addClass('pre-image-uploader');
            $dropzone.find('div.description').hide();
            $dropzone.find('img.js-upload-target').show();

            $dropzone.append($cancel);
            $dropzone.find('.js-cancel').on('click', self.reset);

            var urlBuilder = new UploadcareUrl(src);

            if (urlBuilder.uuid) {
                $dropzone.append($cmds);
                $dropzone.append($resize);
                self.bindOperations(urlBuilder);
            }
        },

        bindOperations: function (urlBuilder) {
            $.each(OPERATIONS, function(key, value) {
                var itm = $dropzone.find('.js-' + key);
                var isActive = urlBuilder.find(value.find);
                if (isActive) itm.addClass('active');
                itm.on('click', function() {
                    urlBuilder.drop(value.drop);
                    if (!isActive) {
                        urlBuilder.add(value.command, value.params);
                    };

                    var url = urlBuilder.compile();
                    var trigger = function() {
                        $dropzone.trigger('uploadsuccess', url || 'http://');
                        $dropzone.removeClass('loading');
                    }
                    if (url) {
                        var img = new Image();
                        img.src = url;
                        img.onload = trigger;
                        if (!img.complete) $dropzone.addClass('loading');
                    } else trigger();
                });
            });
        },

        init: function () {
            var imageTarget = $dropzone.find('img.js-upload-target');
            var src = imageTarget.attr('src');
            // First check if field image is defined by checking for js-upload-target class
            if (!imageTarget[0]) {
                // This ensures there is an image we can hook into to display uploaded image
                $dropzone.prepend('<img class="js-upload-target" style="display: none"  src="" />');
            }
            if (src === '' || src === undefined) {
                this.initWithUploadcare();
            } else {
                this.initWithImage(src);
            }
        },

        reset: function () {
            $dropzone.find('img.js-upload-target').attr({src: ''});
            $dropzone.find('div.description').show();
            $dropzone.trigger('imagecleared');
            $dropzone.delay(2500).animate({opacity: 100}, 1000, function () {
                this.init();
            });

            $dropzone.trigger('uploadsuccess', 'http://');
            this.initWithUploadcare();
        }
    });
};

upload = function (options) {
    var settings = $.extend({}, options);

    return this.each(function () {
        var $dropzone = $(this),
            ui;

        ui = new UploadUi($dropzone, settings);
        this.uploaderUi = ui;
        ui.init();
    });
};

export default upload;
