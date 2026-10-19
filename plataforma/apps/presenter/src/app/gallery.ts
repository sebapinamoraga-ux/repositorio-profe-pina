import { mascotGallerySchema } from '@aula/content-model';
import rawMascotGallery from '../../../../../contenido/comun/galeria/plantillas-mascota.json';

export const mascotGallery = mascotGallerySchema.parse(rawMascotGallery);
