from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from .models import TemaDisponible, Usuario


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