import json

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from .models import PropuestaTema, TemaDisponible, Usuario, Notificacion, InscripcionTema


class TemaDisponibleAPITestCase(APITestCase):
    def setUp(self):
        self.list_url = reverse("temas-disponibles")
        self.usuario = Usuario.objects.create(
            nombre_completo="Docente de Prueba",
            correo="docente.prueba@example.com",
            carrera="Computación",
            rut="11111111-1",
            telefono="123456789",
            rol="docente",
            contrasena="segura123",
        )

    def test_create_tema_disponible(self):
        data = {
            "titulo": "Tema de prueba",
            "carrera": "Computación",
            "descripcion": "Descripción de prueba",
            "requisitos": ["Requisito 1"],
            "cupos": 3,
        }

        response = self.client.post(self.list_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TemaDisponible.objects.count(), 1)

        tema = TemaDisponible.objects.get()
        self.assertEqual(tema.titulo, data["titulo"])
        self.assertEqual(tema.carrera, data["carrera"])
        self.assertEqual(tema.descripcion, data["descripcion"])
        self.assertEqual(tema.requisitos, data["requisitos"])
        self.assertEqual(tema.cupos, data["cupos"])
        self.assertEqual(response.data["cuposDisponibles"], data["cupos"])
        self.assertFalse(response.data["tieneCupoPropio"])
        self.assertEqual(response.data["inscripcionesActivas"], [])
        self.assertIsNone(tema.docente_responsable)
        self.assertIsNone(response.data.get("docente_responsable"))
        self.assertIsNone(response.data.get("docenteACargo"))

    def test_create_tema_disponible_with_creator_id(self):
        data = {
            "titulo": "Tema creado con autor",
            "carrera": "Informática",
            "descripcion": "Descripción de prueba",
            "requisitos": ["Requisito 1"],
            "cupos": 2,
            "created_by": self.usuario.pk,
        }

        response = self.client.post(self.list_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get("created_by"), self.usuario.pk)

        creador = response.data.get("creadoPor")
        self.assertIsInstance(creador, dict)
        self.assertEqual(creador.get("nombre"), self.usuario.nombre_completo)
        self.assertEqual(creador.get("rol"), self.usuario.rol)
        self.assertEqual(creador.get("carrera"), self.usuario.carrera)
        self.assertEqual(response.data.get("docente_responsable"), self.usuario.pk)
        docente = response.data.get("docenteACargo")
        self.assertIsInstance(docente, dict)
        self.assertEqual(docente.get("nombre"), self.usuario.nombre_completo)
        self.assertEqual(docente.get("rol"), self.usuario.rol)
        self.assertEqual(docente.get("carrera"), self.usuario.carrera)
        self.assertEqual(response.data.get("inscripcionesActivas"), [])

    def test_create_tema_disponible_registra_propuesta_docente(self):
        data = {
            "titulo": "Tema docente",
            "carrera": "Investigación",
            "descripcion": "Descripción docente",
            "requisitos": ["Requisito 1"],
            "cupos": 4,
            "created_by": self.usuario.pk,
            "objetivo": "Objetivo docente",
        }

        response = self.client.post(self.list_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TemaDisponible.objects.count(), 1)
        self.assertEqual(PropuestaTema.objects.count(), 1)

        propuesta = PropuestaTema.objects.get()
        self.assertIsNone(propuesta.alumno)
        self.assertEqual(propuesta.docente, self.usuario)
        self.assertEqual(propuesta.titulo, data["titulo"])
        self.assertEqual(propuesta.objetivo, data["objetivo"])
        self.assertEqual(propuesta.descripcion, data["descripcion"])
        self.assertEqual(propuesta.rama, data["carrera"])
        self.assertEqual(propuesta.estado, "aceptada")
        self.assertEqual(propuesta.cupos_requeridos, data["cupos"])
        self.assertEqual(propuesta.cupos_maximo_autorizado, data["cupos"])
        self.assertEqual(propuesta.preferencias_docentes, [self.usuario.pk])
        self.assertEqual(propuesta.correos_companeros, [])

        tema = TemaDisponible.objects.get()
        self.assertEqual(tema.propuesta, propuesta)

    def test_create_tema_disponible_rechaza_creador_alumno(self):
        alumno = Usuario.objects.create(
            nombre_completo="Alumno creador",
            correo="alumno.creador@example.com",
            carrera="Computación",
            rut="22222222-2",
            telefono="",
            rol="alumno",
            contrasena="clave",
        )

        data = {
            "titulo": "Tema inválido",
            "carrera": "Computación",
            "descripcion": "Descripción",
            "requisitos": ["Req"],
            "cupos": 1,
            "created_by": alumno.pk,
        }

        response = self.client.post(self.list_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("created_by", response.data)

    def test_create_tema_disponible_asigna_docente_responsable(self):
        docente = Usuario.objects.create(
            nombre_completo="Docente Responsable",
            correo="docente.responsable@example.com",
            carrera="Computación",
            rut="33333333-3",
            telefono="",
            rol="docente",
            contrasena="clave",
        )

        data = {
            "titulo": "Tema con responsable",
            "carrera": "Computación",
            "descripcion": "Descripción",
            "requisitos": ["Req"],
            "cupos": 1,
            "docente_responsable": docente.pk,
        }

        response = self.client.post(self.list_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tema = TemaDisponible.objects.get()
        self.assertEqual(tema.docente_responsable, docente)
        self.assertEqual(response.data.get("docente_responsable"), docente.pk)
        self.assertEqual(response.data.get("docenteACargo", {}).get("nombre"), docente.nombre_completo)

    def test_create_tema_disponible_rechaza_responsable_no_docente(self):
        alumno = Usuario.objects.create(
            nombre_completo="Alumno Responsable",
            correo="alumno.responsable@example.com",
            carrera="Computación",
            rut="44444444-4",
            telefono="",
            rol="alumno",
            contrasena="clave",
        )

        data = {
            "titulo": "Tema inválido",
            "carrera": "Computación",
            "descripcion": "Descripción",
            "requisitos": ["Req"],
            "cupos": 1,
            "docente_responsable": alumno.pk,
        }

        response = self.client.post(self.list_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("docente_responsable", response.data)

    def test_list_temas_disponibles(self):
        TemaDisponible.objects.create(
            titulo="Tema 1",
            carrera="Computación",
            descripcion="Descripción 1",
            requisitos=["Req 1"],
            cupos=2,
            created_by=self.usuario,
        )
        TemaDisponible.objects.create(
            titulo="Tema 2",
            carrera="Informática",
            descripcion="Descripción 2",
            requisitos=["Req 2"],
            cupos=1,
            created_by=self.usuario,
        )

        response = self.client.get(self.list_url, {"usuario": self.usuario.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["titulo"], "Tema 1")
        self.assertTrue(all("cuposDisponibles" in item for item in response.data))
        self.assertTrue(all("inscripcionesActivas" in item for item in response.data))

    def test_propuesta_docente_aceptada_se_convierte_en_tema(self):
        propuesta = PropuestaTema.objects.create(
            alumno=None,
            docente=self.usuario,
            titulo="Tema docente",
            objetivo="Objetivo docente",
            descripcion="Descripción docente",
            rama="Computación",
            estado="aceptada",
            cupos_requeridos=2,
            cupos_maximo_autorizado=3,
        )

        response = self.client.get(self.list_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(TemaDisponible.objects.count(), 1)

        tema = TemaDisponible.objects.get()
        self.assertEqual(tema.propuesta, propuesta)
        self.assertEqual(tema.cupos, 2)
        self.assertEqual(tema.created_by, self.usuario)
        self.assertEqual(tema.docente_responsable, self.usuario)
        self.assertEqual(tema.carrera, "Computación")

    def test_list_temas_disponibles_filtra_por_alumno(self):
        TemaDisponible.objects.create(
            titulo="Tema 1",
            carrera="Computación",
            descripcion="Descripción 1",
            requisitos=["Req 1"],
            cupos=2,
        )
        TemaDisponible.objects.create(
            titulo="Tema 2",
            carrera="Informática",
            descripcion="Descripción 2",
            requisitos=["Req 2"],
            cupos=1,
        )

        alumno = Usuario.objects.create(
            nombre_completo="Alumno",
            correo="alumno@example.com",
            carrera="Computación",
            rut="22222222-2",
            telefono="",
            rol="alumno",
            contrasena="clave",
        )

        response = self.client.get(self.list_url, {"alumno": alumno.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["titulo"], "Tema 1")

    def test_list_temas_disponibles_filtra_normalizando_carrera(self):
        TemaDisponible.objects.create(
            titulo="Tema Ñ",
            carrera="Ingeniería Informática",
            descripcion="Descripción Ñ",
            requisitos=["Req"],
            cupos=2,
        )

        alumno = Usuario.objects.create(
            nombre_completo="Alumno Ñ",
            correo="alumno-tilde@example.com",
            carrera="Ingenieria Informatica",
            rut="22222222-3",
            telefono="",
            rol="alumno",
            contrasena="clave",
        )

        response = self.client.get(self.list_url, {"alumno": alumno.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["titulo"], "Tema Ñ")

    def test_list_temas_disponibles_filtra_por_carrera_query_param(self):
        TemaDisponible.objects.create(
            titulo="Tema carrera",
            carrera="Ingeniería Industrial",
            descripcion="Descripción",
            requisitos=["Req"],
            cupos=2,
        )
        TemaDisponible.objects.create(
            titulo="Tema distinto",
            carrera="Ingeniería Informática",
            descripcion="Descripción",
            requisitos=["Req"],
            cupos=2,
        )

        response = self.client.get(
            self.list_url,
            {"carrera": "Ingenieria Industrial"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["titulo"], "Tema carrera")

    def test_list_temas_disponibles_sin_filtros_entrega_todos(self):
        TemaDisponible.objects.create(
            titulo="Tema carrera",
            carrera="Ingeniería Industrial",
            descripcion="Descripción",
            requisitos=["Req"],
            cupos=2,
        )
        TemaDisponible.objects.create(
            titulo="Tema distinto",
            carrera="Ingeniería Informática",
            descripcion="Descripción",
            requisitos=["Req"],
            cupos=2,
        )

        response = self.client.get(self.list_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_temas_disponibles_alumno_con_carrera_sin_coincidencias_entrega_todos(self):
        TemaDisponible.objects.create(
            titulo="Tema carrera",
            carrera="Ingeniería Industrial",
            descripcion="Descripción",
            requisitos=["Req"],
            cupos=2,
        )
        TemaDisponible.objects.create(
            titulo="Tema distinto",
            carrera="Ingeniería Informática",
            descripcion="Descripción",
            requisitos=["Req"],
            cupos=2,
        )

        alumno = Usuario.objects.create(
            nombre_completo="Alumno sin coincidencias",
            correo="alumno-sin-match@example.com",
            carrera="Mecánica",
            rut="55555555-9",
            telefono="",
            rol="alumno",
            contrasena="clave",
        )

        response = self.client.get(self.list_url, {"alumno": alumno.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_temas_disponibles_alumno_sin_carrera_no_filtra(self):
        TemaDisponible.objects.create(
            titulo="Tema carrera",
            carrera="Ingeniería Industrial",
            descripcion="Descripción",
            requisitos=["Req"],
            cupos=2,
        )
        alumno = Usuario.objects.create(
            nombre_completo="Alumno sin carrera",
            correo="alumno-sin-carrera@example.com",
            carrera=None,
            rut="99999999-9",
            telefono="",
            rol="alumno",
            contrasena="clave",
        )

        response = self.client.get(self.list_url, {"alumno": alumno.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_list_temas_disponibles_usuario_sin_carrera_no_filtra(self):
        TemaDisponible.objects.create(
            titulo="Tema carrera",
            carrera="Ingeniería Industrial",
            descripcion="Descripción",
            requisitos=["Req"],
            cupos=2,
        )
        docente = Usuario.objects.create(
            nombre_completo="Docente sin carrera",
            correo="docente-sin-carrera@example.com",
            carrera=None,
            rut="88888888-8",
            telefono="",
            rol="docente",
            contrasena="clave",
        )

        response = self.client.get(self.list_url, {"usuario": docente.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_retrieve_tema_disponible(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema único",
            carrera="Computación",
            descripcion="Descripción única",
            requisitos=["Req"],
            cupos=1,
            created_by=self.usuario,
        )

        detail_url = reverse("tema-detalle", args=[tema.pk])
        response = self.client.get(detail_url, {"usuario": self.usuario.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["titulo"], "Tema único")
        self.assertIn("inscripcionesActivas", response.data)
        self.assertEqual(response.data["inscripcionesActivas"], [])

    def test_retrieve_tema_disponible_usuario_sin_carrera(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema sin filtro",
            carrera="Computación",
            descripcion="Descripción",
            requisitos=["Req"],
            cupos=1,
        )

        usuario = Usuario.objects.create(
            nombre_completo="Usuario sin carrera",
            correo="usuario-sin-carrera@example.com",
            carrera=None,
            rut="77777777-7",
            telefono="",
            rol="docente",
            contrasena="clave",
        )

        detail_url = reverse("tema-detalle", args=[tema.pk])
        response = self.client.get(detail_url, {"usuario": usuario.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["titulo"], "Tema sin filtro")
        self.assertIn("inscripcionesActivas", response.data)

    def test_retrieve_tema_disponible_usuario_carrera_distinta_permitido(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema restringido",
            carrera="Computación",
            descripcion="Descripción",
            requisitos=["Req"],
            cupos=1,
            created_by=self.usuario,
        )

        otro = Usuario.objects.create(
            nombre_completo="Docente 2",
            correo="docente2@example.com",
            carrera="Informática",
            rut="44444444-4",
            telefono="",
            rol="docente",
            contrasena="segura",
        )

        detail_url = reverse("tema-detalle", args=[tema.pk])
        response = self.client.get(detail_url, {"usuario": otro.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["titulo"], "Tema restringido")
        self.assertIn("inscripcionesActivas", response.data)

    def test_retrieve_tema_disponible_con_parametro_carrera_invalido(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema restringido",
            carrera="Computación",
            descripcion="Descripción",
            requisitos=["Req"],
            cupos=1,
            created_by=self.usuario,
        )

        response = self.client.get(
            reverse("tema-detalle", args=[tema.pk]),
            {"carrera": "Industria"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_tema_disponible_incluye_inscripciones_activas(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema con reservas",
            carrera="Computación",
            descripcion="Descripción",
            requisitos=["Req"],
            cupos=2,
            created_by=self.usuario,
        )
        alumno = Usuario.objects.create(
            nombre_completo="Alumno inscrito",
            correo="alumno.inscrito@example.com",
            carrera="Computación",
            rut="99999999-9",
            telefono="",
            rol="alumno",
            contrasena="clave",
        )
        InscripcionTema.objects.create(tema=tema, alumno=alumno)

        detail_url = reverse("tema-detalle", args=[tema.pk])
        response = self.client.get(detail_url, {"usuario": self.usuario.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        inscritos = response.data.get("inscripcionesActivas", [])
        self.assertEqual(len(inscritos), 1)
        self.assertEqual(inscritos[0]["id"], alumno.id)
        self.assertEqual(inscritos[0]["nombre"], alumno.nombre_completo)

    def test_reservar_tema_descuenta_cupo(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema", carrera="Computación", descripcion="Desc", requisitos=["Req"], cupos=2
        )
        alumno = Usuario.objects.create(
            nombre_completo="Alumno", correo="alumno@example.com", carrera="Computación", rut="22222222-2",
            telefono="", rol="alumno", contrasena="clave"
        )

        url = reverse("tema-reservar", args=[tema.pk])
        response = self.client.post(url, {"alumno": alumno.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["cuposDisponibles"], 1)
        self.assertTrue(response.data["tieneCupoPropio"])
        self.assertEqual(len(response.data["inscripcionesActivas"]), 1)
        self.assertEqual(response.data["inscripcionesActivas"][0]["id"], alumno.id)
        self.assertTrue(response.data["inscripcionesActivas"][0]["esResponsable"])

    def test_reservar_tema_otro_carrera_permitido(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema",
            carrera="Computación",
            descripcion="Desc",
            requisitos=["Req"],
            cupos=2,
        )
        alumno = Usuario.objects.create(
            nombre_completo="Alumno",
            correo="alumno@example.com",
            carrera="Informática",
            rut="55555555-5",
            telefono="",
            rol="alumno",
            contrasena="clave",
        )

        url = reverse("tema-reservar", args=[tema.pk])
        response = self.client.post(url, {"alumno": alumno.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["cuposDisponibles"], 1)
        self.assertTrue(response.data["tieneCupoPropio"])
        self.assertEqual(len(response.data["inscripcionesActivas"]), 1)
        self.assertEqual(response.data["inscripcionesActivas"][0]["id"], alumno.id)
        self.assertTrue(response.data["inscripcionesActivas"][0]["esResponsable"])

    def test_reservar_tema_equivalencia_carrera(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema",
            carrera="Ing. Civil en Computación mención Informática",
            descripcion="Desc",
            requisitos=["Req"],
            cupos=2,
        )
        alumno = Usuario.objects.create(
            nombre_completo="Alumno",
            correo="alumno@example.com",
            carrera="Ingeniería en Informática",
            rut="66666666-6",
            telefono="",
            rol="alumno",
            contrasena="clave",
        )

        url = reverse("tema-reservar", args=[tema.pk])
        response = self.client.post(url, {"alumno": alumno.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["cuposDisponibles"], 1)
        self.assertTrue(response.data["tieneCupoPropio"])

    def test_no_permite_reservar_sin_cupos(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema", carrera="Computación", descripcion="Desc", requisitos=["Req"], cupos=1
        )
        alumno = Usuario.objects.create(
            nombre_completo="Alumno", correo="alumno@example.com", carrera="Computación", rut="22222222-2",
            telefono="", rol="alumno", contrasena="clave"
        )
        otro = Usuario.objects.create(
            nombre_completo="Otro", correo="otro@example.com", carrera="Computación", rut="33333333-3",
            telefono="", rol="alumno", contrasena="clave"
        )
        InscripcionTema.objects.create(tema=tema, alumno=alumno)

        url = reverse("tema-reservar", args=[tema.pk])
        response = self.client.post(url, {"alumno": otro.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_listado_informa_cupo_propio(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema", carrera="Computación", descripcion="Desc", requisitos=["Req"], cupos=2
        )
        alumno = Usuario.objects.create(
            nombre_completo="Alumno", correo="alumno@example.com", carrera="Computación", rut="22222222-2",
            telefono="", rol="alumno", contrasena="clave"
        )
        InscripcionTema.objects.create(tema=tema, alumno=alumno)

        response = self.client.get(self.list_url, {"alumno": alumno.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data[0]["tieneCupoPropio"])

    def test_listado_filtra_carrera_equivalente(self):
        tema_match = TemaDisponible.objects.create(
            titulo="Tema Computación",
            carrera="Ing. Civil en Computación mención Informática",
            descripcion="Desc",
            requisitos=["Req"],
            cupos=2,
        )
        TemaDisponible.objects.create(
            titulo="Tema Industrial",
            carrera="Ingeniería Industrial",
            descripcion="Desc",
            requisitos=["Req"],
            cupos=2,
        )

        response = self.client.get(self.list_url, {"carrera": "Ingeniería en Informática"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], tema_match.id)

    def test_asignar_companeros_registra_estudiantes(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema grupal", carrera="Computación", descripcion="Desc", requisitos=["Req"], cupos=3
        )
        alumno = Usuario.objects.create(
            nombre_completo="Alumno", correo="alumno@example.com", carrera="Computación", rut="22222222-2",
            telefono="", rol="alumno", contrasena="clave"
        )
        companero1 = Usuario.objects.create(
            nombre_completo="Compañero 1", correo="c1@example.com", carrera="Computación", rut="33333333-3",
            telefono="", rol="alumno", contrasena="clave"
        )
        companero2 = Usuario.objects.create(
            nombre_completo="Compañero 2", correo="c2@example.com", carrera="Computación", rut="44444444-4",
            telefono="", rol="alumno", contrasena="clave"
        )

        url = reverse("tema-companeros", args=[tema.pk])
        self.client.post(reverse("tema-reservar", args=[tema.pk]), {"alumno": alumno.pk}, format="json")

        payload = {"alumno": alumno.pk, "correos": [companero1.correo, companero2.correo]}
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["inscripcionesActivas"]), 3)
        correos = {item["correo"] for item in response.data["inscripcionesActivas"]}
        self.assertSetEqual(correos, {alumno.correo, companero1.correo, companero2.correo})
        tema.refresh_from_db()
        self.assertEqual(tema.cupos_disponibles, 0)

    def test_asignar_companeros_requiere_correos_validos(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema", carrera="Computación", descripcion="Desc", requisitos=["Req"], cupos=2
        )
        alumno = Usuario.objects.create(
            nombre_completo="Alumno", correo="alumno@example.com", carrera="Computación", rut="22222222-2",
            telefono="", rol="alumno", contrasena="clave"
        )
        InscripcionTema.objects.create(tema=tema, alumno=alumno, es_responsable=True)

        url = reverse("tema-companeros", args=[tema.pk])
        response = self.client.post(url, {"alumno": alumno.pk, "correos": ["no-existe@example.com"]}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("errores", response.data)
        self.assertIn("no-existe@example.com", response.data["errores"])

    def test_asignar_companeros_no_permite_exceder_cupos(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema", carrera="Computación", descripcion="Desc", requisitos=["Req"], cupos=2
        )
        alumno = Usuario.objects.create(
            nombre_completo="Alumno", correo="alumno@example.com", carrera="Computación", rut="22222222-2",
            telefono="", rol="alumno", contrasena="clave"
        )
        companero1 = Usuario.objects.create(
            nombre_completo="Compañero 1", correo="c1@example.com", carrera="Computación", rut="33333333-3",
            telefono="", rol="alumno", contrasena="clave"
        )
        companero2 = Usuario.objects.create(
            nombre_completo="Compañero 2", correo="c2@example.com", carrera="Computación", rut="44444444-4",
            telefono="", rol="alumno", contrasena="clave"
        )
        InscripcionTema.objects.create(tema=tema, alumno=alumno, es_responsable=True)

        url = reverse("tema-companeros", args=[tema.pk])
        response = self.client.post(
            url,
            {"alumno": alumno.pk, "correos": [companero1.correo, companero2.correo]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_asignar_companeros_restringe_a_responsable(self):
        tema = TemaDisponible.objects.create(
            titulo="Tema", carrera="Computación", descripcion="Desc", requisitos=["Req"], cupos=3
        )
        responsable = Usuario.objects.create(
            nombre_completo="Responsable", correo="owner@example.com", carrera="Computación", rut="55555555-5",
            telefono="", rol="alumno", contrasena="clave"
        )
        otro = Usuario.objects.create(
            nombre_completo="Otro", correo="otro@example.com", carrera="Computación", rut="66666666-6",
            telefono="", rol="alumno", contrasena="clave"
        )
        InscripcionTema.objects.create(tema=tema, alumno=responsable, es_responsable=True)
        InscripcionTema.objects.create(tema=tema, alumno=otro, es_responsable=False)

        url = reverse("tema-companeros", args=[tema.pk])
        response = self.client.post(url, {"alumno": otro.pk, "correos": []}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)


class LoginAPITestCase(APITestCase):
    """Tests for the login endpoint using APIClient."""

    def setUp(self):
        self.client = APIClient()
        self.login_url = "/api/login"

        # Create users for each role
        self.alumno = Usuario.objects.create(
            nombre_completo="Alumno",
            correo="alumno@example.com",
            carrera="Computación",
            rut="1",
            telefono="1",
            rol="alumno",
            contrasena="password",
        )

        self.docente = Usuario.objects.create(
            nombre_completo="Docente",
            correo="docente@example.com",
            carrera="Computación",
            rut="2",
            telefono="2",
            rol="docente",
            contrasena="password",
        )

        self.coordinador = Usuario.objects.create(
            nombre_completo="Coordinador",
            correo="coordinador@example.com",
            carrera="Computación",
            rut="3",
            telefono="3",
            rol="coordinador",
            contrasena="password",
        )

    def test_login_alumno_success(self):
        payload = {"email": "alumno@example.com", "password": "password"}
        response = self.client.post(self.login_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("status"), "success")
        self.assertEqual(response.data.get("rol"), "alumno")
        self.assertEqual(
            response.data.get("redirect_url"),
            "http://localhost:4200/alumno/dashboard",
        )

    def test_login_docente_success(self):
        payload = {"email": "docente@example.com", "password": "password"}
        response = self.client.post(self.login_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("rol"), "docente")
        self.assertEqual(
            response.data.get("redirect_url"),
            "http://localhost:4200/docente/dashboard",
        )

    def test_login_coordinador_success(self):
        payload = {"email": "coordinador@example.com", "password": "password"}
        response = self.client.post(self.login_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("rol"), "coordinador")
        self.assertEqual(
            response.data.get("redirect_url"),
            "http://localhost:4200/coordinacion/inicio",
        )

    def test_login_nonexistent_email(self):
        payload = {"email": "missing@example.com", "password": "password"}
        response = self.client.post(self.login_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_wrong_password(self):
        payload = {"email": "alumno@example.com", "password": "wrong"}
        response = self.client.post(self.login_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PropuestaTemaListViewTests(APITestCase):
    def setUp(self):
        self.url = reverse("propuestas")
        self.alumno = Usuario.objects.create(
            nombre_completo="Alumno Uno",
            correo="alumno1@example.com",
            carrera="Computación",
            rut="10",
            telefono="123",
            rol="alumno",
            contrasena="password",
        )
        self.docente_principal = Usuario.objects.create(
            nombre_completo="Docente Principal",
            correo="docente1@example.com",
            carrera="Computación",
            rut="20",
            telefono="456",
            rol="docente",
            contrasena="password",
        )
        self.docente_aux = Usuario.objects.create(
            nombre_completo="Docente Aux",
            correo="docente2@example.com",
            carrera="Computación",
            rut="30",
            telefono="789",
            rol="docente",
            contrasena="password",
        )

    def test_docente_recibe_propuestas_directas_y_preferencias_en_listas(self):
        directa = PropuestaTema.objects.create(
            alumno=self.alumno,
            docente=self.docente_principal,
            titulo="Propuesta directa",
            objetivo="Objetivo",
            descripcion="Descripcion",
            rama="Software",
        )
        preferida = PropuestaTema.objects.create(
            alumno=self.alumno,
            titulo="Propuesta preferencia",
            objetivo="Objetivo",
            descripcion="Descripcion",
            rama="Datos",
            preferencias_docentes=[self.docente_principal.id, self.docente_aux.id],
        )

        response = self.client.get(self.url, {"docente": self.docente_principal.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {item["id"] for item in response.data}
        self.assertIn(directa.id, ids)
        self.assertIn(preferida.id, ids)

    def test_docente_recibe_preferencias_serializadas_como_dict(self):
        preferida = PropuestaTema.objects.create(
            alumno=self.alumno,
            titulo="Preferida dict",
            objetivo="Objetivo",
            descripcion="Descripcion",
            rama="IA",
            preferencias_docentes=[{"id": self.docente_principal.id}],
        )

        response = self.client.get(self.url, {"docente": self.docente_principal.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {item["id"] for item in response.data}
        self.assertIn(preferida.id, ids)

    def test_docente_recibe_preferencias_serializadas_como_texto(self):
        preferida = PropuestaTema.objects.create(
            alumno=self.alumno,
            titulo="Preferida texto",
            objetivo="Objetivo",
            descripcion="Descripcion",
            rama="Redes",
            preferencias_docentes=json.dumps([{ "id": self.docente_principal.id }]),
        )

        response = self.client.get(self.url, {"docente": self.docente_principal.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {item["id"] for item in response.data}
        self.assertIn(preferida.id, ids)


class PropuestaTemaDecisionNotificationTests(APITestCase):
    def setUp(self):
        self.alumno = Usuario.objects.create(
            nombre_completo="Alumno Prueba",
            correo="alumno.prueba@example.com",
            carrera="Computación",
            rut="50",
            telefono="1234567",
            rol="alumno",
            contrasena="password",
        )
        self.docente = Usuario.objects.create(
            nombre_completo="Docente Revisor",
            correo="docente.revisor@example.com",
            carrera="Computación",
            rut="60",
            telefono="7654321",
            rol="docente",
            contrasena="password",
        )
        self.propuesta = PropuestaTema.objects.create(
            alumno=self.alumno,
            docente=self.docente,
            titulo="Sistema de gestión",
            objetivo="Validar flujos",
            descripcion="Descripción de prueba",
            rama="Desarrollo",
            cupos_requeridos=3,
            correos_companeros=["companero1@example.com", "companero2@example.com"],
        )
        self.url = reverse("detalle-propuesta", args=[self.propuesta.pk])

    def autorizar_cupos(self, cupos: int | None = None, comentario: str = "Autorizado"):
        payload = {
            "accion": "autorizar",
            "comentario_decision": comentario,
            "docente_id": self.docente.id,
            "cupos_autorizados": cupos or self.propuesta.cupos_requeridos,
        }

        response = self.client.patch(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.propuesta.refresh_from_db()
        self.assertEqual(self.propuesta.estado, "pendiente_aprobacion")

    def test_crea_notificacion_al_aceptar_propuesta(self):
        self.autorizar_cupos()
        Notificacion.objects.all().delete()

        payload = {
            "accion": "aprobar_final",
            "comentario_decision": "Felicitaciones",
            "docente_id": self.docente.id,
        }

        response = self.client.patch(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notificacion.objects.count(), 1)
        notif = Notificacion.objects.get()
        self.assertEqual(notif.usuario, self.alumno)
        self.assertEqual(notif.meta.get("estado"), "aceptada")
        self.assertIn("aceptada", notif.titulo.lower())

    def test_notifica_al_autorizar_cupos(self):
        self.autorizar_cupos()

        notifs = Notificacion.objects.filter(usuario=self.alumno)
        self.assertEqual(notifs.count(), 1)
        notif = notifs.get()
        self.assertEqual(notif.meta.get("estado"), "pendiente_aprobacion")
        self.assertIn("autoriz", notif.titulo.lower())

    def test_crea_notificacion_al_rechazar_propuesta(self):
        payload = {
            "accion": "rechazar",
            "comentario_decision": "Se requiere más detalle",
            "docente_id": self.docente.id,
        }

        response = self.client.patch(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notificacion.objects.count(), 1)
        notif = Notificacion.objects.get()
        self.assertEqual(notif.meta.get("estado"), "rechazada")
        self.assertIn("rechazada", notif.titulo.lower())
        self.assertIn("se requiere", notif.mensaje.lower())

    def test_no_duplica_notificacion_si_estado_no_cambia(self):
        self.propuesta.estado = "rechazada"
        self.propuesta.save(update_fields=["estado"])

        payload = {
            "accion": "rechazar",
            "comentario_decision": "Falta información",
            "docente_id": self.docente.id,
        }

        response = self.client.patch(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notificacion.objects.count(), 0)

    def test_crea_tema_y_cupos_al_aceptar_propuesta(self):
        companero1 = Usuario.objects.create(
            nombre_completo="Compañero Uno",
            correo="companero1@example.com",
            carrera="Computación",
            rol="alumno",
            contrasena="pass",
        )
        Usuario.objects.create(
            nombre_completo="Compañero Dos",
            correo="companero2@example.com",
            carrera="Computación",
            rol="alumno",
            contrasena="pass",
        )

        self.autorizar_cupos()

        payload = {
            "accion": "aprobar_final",
            "comentario_decision": "Vamos adelante",
            "docente_id": self.docente.id,
        }

        response = self.client.patch(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(TemaDisponible.objects.count(), 1)
        tema = TemaDisponible.objects.get()
        self.assertEqual(tema.cupos, 3)
        self.assertEqual(tema.created_by, self.alumno)
        self.assertEqual(tema.docente_responsable, self.docente)

        inscripciones = InscripcionTema.objects.filter(tema=tema, activo=True)
        self.assertEqual(inscripciones.count(), 3)
        responsables = inscripciones.filter(alumno=self.alumno, es_responsable=True)
        self.assertTrue(responsables.exists())
        correos = {inscripcion.alumno.correo for inscripcion in inscripciones}
        self.assertIn(self.alumno.correo, correos)
        self.assertIn(companero1.correo, correos)
        self.assertEqual(tema.cupos_disponibles, 0)

    def test_solicitar_ajuste_envia_notificacion(self):
        payload = {
            "accion": "solicitar_ajuste",
            "comentario_decision": "Solo puedo aceptar 2 integrantes",
            "docente_id": self.docente.id,
            "cupos_autorizados": 2,
        }

        response = self.client.patch(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.propuesta.refresh_from_db()
        self.assertEqual(self.propuesta.estado, "pendiente_ajuste")
        self.assertEqual(self.propuesta.cupos_maximo_autorizado, 2)
        self.assertEqual(Notificacion.objects.count(), 1)
        notif = Notificacion.objects.get()
        self.assertEqual(notif.usuario, self.alumno)
        self.assertEqual(notif.meta.get("cupos_maximo_autorizado"), 2)

    def test_solicitar_ajuste_guarda_comentario(self):
        payload = {
            "accion": "solicitar_ajuste",
            "comentario_decision": "  Solo puedo aceptar 2 integrantes  ",
            "docente_id": self.docente.id,
            "cupos_autorizados": 2,
        }

        response = self.client.patch(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.propuesta.refresh_from_db()
        self.assertEqual(
            self.propuesta.comentario_decision,
            "Solo puedo aceptar 2 integrantes",
        )
        self.assertEqual(
            response.data.get("comentario_decision"),
            "Solo puedo aceptar 2 integrantes",
        )

    def test_alumno_confirma_cupos_notifica_docente(self):
        self.client.patch(
            self.url,
            {
                "accion": "solicitar_ajuste",
                "comentario_decision": "Solo puedo aceptar 2",
                "docente_id": self.docente.id,
                "cupos_autorizados": 2,
            },
            format="json",
        )
        self.propuesta.refresh_from_db()
        Notificacion.objects.all().delete()

        payload = {
            "accion": "confirmar_cupos",
            "cupos_requeridos": 2,
            "correos_companeros": ["companero1@example.com"],
        }

        response = self.client.patch(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.propuesta.refresh_from_db()
        self.assertEqual(self.propuesta.estado, "pendiente_aprobacion")
        self.assertEqual(self.propuesta.cupos_requeridos, 2)
        self.assertEqual(len(self.propuesta.correos_companeros), 1)
        self.assertEqual(Notificacion.objects.count(), 1)
        notif = Notificacion.objects.get()
        self.assertEqual(notif.usuario, self.docente)
        self.assertEqual(notif.meta.get("estado"), "pendiente_aprobacion")

    def test_aprobar_final_falla_si_supera_cupos_autorizados(self):
        self.client.patch(
            self.url,
            {
                "accion": "solicitar_ajuste",
                "comentario_decision": "Solo 2",
                "docente_id": self.docente.id,
                "cupos_autorizados": 2,
            },
            format="json",
        )
        self.propuesta.refresh_from_db()

        payload = {
            "accion": "aprobar_final",
            "docente_id": self.docente.id,
        }

        response = self.client.patch(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.propuesta.refresh_from_db()
        self.assertEqual(self.propuesta.estado, "pendiente_ajuste")


class ReservaTemaNotificationTests(APITestCase):
    def setUp(self):
        self.docente = Usuario.objects.create(
            nombre_completo="Docente Responsable",
            correo="docente.responsable@example.com",
            carrera="Computación",
            rut="70",
            telefono="555-1111",
            rol="docente",
            contrasena="password",
        )
        self.alumno = Usuario.objects.create(
            nombre_completo="Alumno Interesado",
            correo="alumno.interesado@example.com",
            carrera="Computación",
            rut="80",
            telefono="555-2222",
            rol="alumno",
            contrasena="password",
        )
        self.tema = TemaDisponible.objects.create(
            titulo="Análisis de datos",
            carrera="Computación",
            descripcion="Descripción",
            requisitos=["Python"],
            cupos=2,
            created_by=self.docente,
        )
        self.url = reverse("tema-reservar", args=[self.tema.pk])

    def test_notifica_docente_y_alumno_al_reservar(self):
        response = self.client.post(self.url, {"alumno": self.alumno.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notificacion.objects.count(), 2)

        docente_notif = Notificacion.objects.get(usuario=self.docente)
        self.assertEqual(docente_notif.tipo, "tema")
        self.assertEqual(docente_notif.meta.get("evento"), "reserva_tema")
        self.assertEqual(docente_notif.meta.get("alumno_id"), self.alumno.id)
        inscripcion = self.tema.inscripciones.get(alumno=self.alumno)
        self.assertEqual(docente_notif.meta.get("inscripcion_id"), inscripcion.id)

        alumno_notif = Notificacion.objects.get(usuario=self.alumno)
        self.assertEqual(alumno_notif.tipo, "inscripcion")
        self.assertEqual(alumno_notif.meta.get("evento"), "reserva_tema")
        self.assertIn("registrada", alumno_notif.titulo.lower())

    def test_notifica_cupos_completados(self):
        tema = TemaDisponible.objects.create(
            titulo="Robótica",
            carrera="Computación",
            descripcion="",
            requisitos=[],
            cupos=1,
            created_by=self.docente,
        )
        url = reverse("tema-reservar", args=[tema.pk])

        response = self.client.post(url, {"alumno": self.alumno.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        docente_notifs = Notificacion.objects.filter(usuario=self.docente)
        self.assertEqual(docente_notifs.count(), 2)
        eventos_docente = {n.meta.get("evento") for n in docente_notifs}
        self.assertEqual(eventos_docente, {"reserva_tema", "cupos_completados"})

        alumno_notifs = Notificacion.objects.filter(usuario=self.alumno)
        self.assertEqual(alumno_notifs.count(), 2)
        eventos_alumno = {n.meta.get("evento") for n in alumno_notifs}
        self.assertEqual(eventos_alumno, {"reserva_tema", "cupos_completados"})

    def test_notifica_docente_responsable_creado_por_alumno(self):
        tema = TemaDisponible.objects.create(
            titulo="Minería de datos",
            carrera="Computación",
            descripcion="",
            requisitos=[],
            cupos=1,
            created_by=self.alumno,
            docente_responsable=self.docente,
        )
        url = reverse("tema-reservar", args=[tema.pk])

        response = self.client.post(url, {"alumno": self.alumno.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        docente_notifs = Notificacion.objects.filter(
            usuario=self.docente,
            meta__tema_id=tema.id,
        )
        self.assertEqual(docente_notifs.count(), 1)
        docente_notif = docente_notifs.get()
        self.assertEqual(docente_notif.meta.get("evento"), "reserva_tema")


class TemaDisponibleFinalizacionNotificationTests(APITestCase):
    def setUp(self):
        self.docente = Usuario.objects.create(
            nombre_completo="Docente Finalizador",
            correo="docente.finalizador@example.com",
            carrera="Computación",
            rut="90",
            telefono="555-3333",
            rol="docente",
            contrasena="password",
        )
        self.alumno1 = Usuario.objects.create(
            nombre_completo="Alumno Uno",
            correo="alumno.uno@example.com",
            carrera="Computación",
            rut="91",
            telefono="555-4444",
            rol="alumno",
            contrasena="password",
        )
        self.alumno2 = Usuario.objects.create(
            nombre_completo="Alumno Dos",
            correo="alumno.dos@example.com",
            carrera="Computación",
            rut="92",
            telefono="555-5555",
            rol="alumno",
            contrasena="password",
        )
        self.tema = TemaDisponible.objects.create(
            titulo="Sistemas distribuidos",
            carrera="Computación",
            descripcion="",
            requisitos=[],
            cupos=3,
            created_by=self.docente,
        )
        InscripcionTema.objects.create(tema=self.tema, alumno=self.alumno1)
        InscripcionTema.objects.create(tema=self.tema, alumno=self.alumno2)
        self.url = reverse("tema-detalle", args=[self.tema.pk])

    def test_notifica_al_cerrar_tema(self):
        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        destinatarios = {notif.usuario_id for notif in Notificacion.objects.all()}
        self.assertSetEqual(
            destinatarios,
            {self.docente.id, self.alumno1.id, self.alumno2.id},
        )
        eventos = {notif.meta.get("evento") for notif in Notificacion.objects.all()}
        self.assertEqual(eventos, {"tema_finalizado"})