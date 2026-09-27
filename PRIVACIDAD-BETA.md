# Aviso de privacidad — borrador para beta

**Estado:** borrador operativo; no publicar como política definitiva hasta completar la identidad del editor y la revisión jurídica.  
**Última actualización:** 26 de septiembre de 2026.

## Responsable

- Nombre legal: **pendiente**.
- País/domicilio: **pendiente**.
- Contacto de privacidad/soporte: **pendiente**.

## Resumen

Noditos es una aplicación local-first. Los mapas se guardan en el almacenamiento del perfil del navegador. El editor no recibe automáticamente esos mapas porque Noditos no incluye cuentas ni sincronización propia. Algunas funciones iniciadas por el usuario sí contactan servicios externos.

## Datos almacenados localmente

- mapas, nodos, notas, metadatos, papelera e historial;
- imágenes incrustadas;
- preferencias y configuración no secreta;
- registro técnico local `Noditos-servidor.log` con hora, método y ruta solicitada.

Estos datos permanecen hasta que el usuario los borra, elimina los datos del navegador o reemplaza el perfil. Exportar y verificar backups es responsabilidad compartida del usuario.

## Inteligencia artificial

La IA es opcional. Gemini usa un proxy local: la clave se mantiene sólo en memoria hasta detener Noditos y no se persiste en `localStorage` o `sessionStorage`. Los demás proveedores están pendientes de migración y no deben usarse con información sensible durante la beta.

Cuando el usuario envía una solicitud, se transmite al proveedor elegido:

- el mensaje;
- el modelo;
- el contexto seleccionado: ninguno, nodo, rama o mapa completo;
- instrucciones técnicas necesarias para responder.

El proveedor puede aplicar sus propias condiciones, conservación, ubicación y costes. No se deben enviar secretos ni datos personales de terceros sin autorización. La IA puede equivocarse. Las acciones estructuradas se muestran antes de aplicarse.

## Recursos y enlaces externos

Las fuentes principales están incluidas localmente. Una imagen añadida por URL contacta al servidor indicado, que puede recibir IP y datos técnicos. Los enlaces portables contienen el mapa codificado, no cifrado; quien obtenga el enlace puede leerlo.

## Backups y exportaciones

Los archivos exportados quedan bajo control del usuario y pueden contener todo el contenido seleccionado. Deben almacenarse y compartirse de manera segura.

## Derechos y contacto

Los datos exclusivamente locales deben gestionarse desde el mismo perfil del navegador. Para consultas recibidas por soporte o reportes de seguridad se informará el canal y los derechos aplicables cuando se complete la identidad del responsable.

## Menores y usos excluidos

La beta se dirige a personas adultas y no está diseñada para decisiones médicas, jurídicas, financieras, laborales ni otras decisiones de alto impacto.
