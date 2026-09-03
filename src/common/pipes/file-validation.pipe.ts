import { ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';

const IMAGE_TYPES = /(jpg|jpeg|png|gif|webp)$/;
const DOCUMENT_TYPES = /(jpg|jpeg|png|gif|webp|pdf)$/;
const SIGNATURE_TYPES = /(jpg|jpeg|png|webp)$/;

export const avatarFilePipe = new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
    new FileTypeValidator({ fileType: IMAGE_TYPES }),
  ],
  fileIsRequired: true,
});

export const identityDocumentFilePipe = new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
    new FileTypeValidator({ fileType: DOCUMENT_TYPES }),
  ],
  fileIsRequired: true,
});

export const signatureFilePipe = new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
    new FileTypeValidator({ fileType: SIGNATURE_TYPES }),
  ],
  fileIsRequired: true,
});
