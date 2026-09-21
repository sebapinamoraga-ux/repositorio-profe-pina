import { mascotGallerySchema } from '@aula/content-model';
import rawMascotGallery from '../../../../content/galleries/mascot-presence.json';

export const mascotGallery = mascotGallerySchema.parse(rawMascotGallery);
