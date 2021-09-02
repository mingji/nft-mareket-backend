import { HttpException, HttpStatus } from '@nestjs/common';

export const imageFileFilter = (req, file, callback) => {
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (
        !allowedMimeTypes.includes(file.mimetype) ||
        !file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)
    ) {
        return callback(
            new HttpException(
                'Only image files are allowed!',
                HttpStatus.BAD_REQUEST,
            ),
            false,
        );
    }
    callback(null, true);
};

export const animationFileFilter = (req, file, callback) => {
    const allowedMimeTypes = [
        'model/gltf+json',
        'model/gltf-binary',
        'video/webm',
        'audio/wav',
        'audio/x-wav',
        'application/ogg',
        'audio/ogg',
        'video/ogg',
        'audio/mp3',
        'audio/mpeg',
        'video/mp4',
        'video/x-m4v'
    ];
    if (
        !allowedMimeTypes.includes(file.mimetype) ||
        !file.originalname.toLowerCase().match(/\.(gltf|glb|webm|wav|oga|mp3|mp4|m4v|ogv|ogg)$/)
    ) {
        return callback(
            new HttpException(
                'Only animation files are allowed!',
                HttpStatus.BAD_REQUEST,
            ),
            false,
        );
    }
    callback(null, true);
};