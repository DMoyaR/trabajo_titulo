
export const CARRERAS_TEMA = [
  'Química y Farmacia',
  'Ing. Civil Biomédica',
  'Ing. Civil Química',
  'Ing. Civil Matemática',
  'Bachillerato en Ciencias de la Ing.',
  'Dibujante Proyectista',
  'Ing. Civil en Ciencia de Datos',
  'Ing. Civil en Computación mención Informática',
  'Ing. Civil Electrónica',
  'Ing. Civil en Mecánica',
  'Ing. Civil Industrial',
  'Ing. en Biotecnología',
  'Ing. en Geomensura',
  'Ing. en Alimentos',
  'Ing. en Informática',
  'Ing. Industrial',
  'Química Industrial',
  'Ing. Electrónica',
  'Computación',
  'Informática',
  'Industria',
  'Trabajo Social',
  'Mecánica',
]
  .filter((value, index, array) => array.indexOf(value) === index)
  .sort((a, b) => a.localeCompare(b, 'es-CL'));