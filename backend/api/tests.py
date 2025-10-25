import json

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from .models import PropuestaTema, TemaDisponible, Usuario, Notificacion

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

        response = self.client.get(self.list_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

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
        response = self.client.get(detail_url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["titulo"], "Tema único")


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
        )
        self.url = reverse("detalle-propuesta", args=[self.propuesta.pk])

    def test_crea_notificacion_al_aceptar_propuesta(self):
        payload = {
            "estado": "aceptada",
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

    def test_crea_notificacion_al_rechazar_propuesta(self):
        payload = {
            "estado": "rechazada",
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
            "estado": "rechazada",
            "comentario_decision": "Falta información",
            "docente_id": self.docente.id,
        }

        response = self.client.patch(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notificacion.objects.count(), 0)
