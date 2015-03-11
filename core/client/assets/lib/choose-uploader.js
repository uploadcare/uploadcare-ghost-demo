import ghostUploader from './uploader';
import uploadcareUploader from './uploadcare';

var upload;

upload = function (options) {
    if (options.uploadcarePublicKey) return uploadcareUploader.call(this, options);
    return ghostUploader.call(this, options);
};

export default upload;
