from django.urls import reverse
from django.contrib.auth.models import User, Group
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from .models import Task


class TaskAPITestCase(APITestCase):
    def setUp(self):
        self.list_url = reverse('task-list')

    def test_create_task(self):
        data = {
            'title': 'Test Task',
            'description': 'Test description'
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Task.objects.count(), 1)
        self.assertEqual(Task.objects.get().title, 'Test Task')

    def test_list_tasks(self):
        Task.objects.create(title='Task 1')
        Task.objects.create(title='Task 2')
        response = self.client.get(self.list_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_retrieve_task(self):
        task = Task.objects.create(title='Single Task')
        url = reverse('task-detail', args=[task.id])
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Single Task')


class LoginAPITestCase(APITestCase):
    """Tests for the login endpoint using APIClient."""

    def setUp(self):
        self.client = APIClient()
        self.login_url = '/api/login'

        # Create groups representing user roles
        alumno_group = Group.objects.create(name='alumno')
        docente_group = Group.objects.create(name='docente')
        coordinacion_group = Group.objects.create(name='coordinacion')

        # Create users for each role
        self.alumno = User.objects.create_user(
            username='alumno@example.com',
            email='alumno@example.com',
            password='password'
        )
        self.alumno.groups.add(alumno_group)

        self.docente = User.objects.create_user(
            username='docente@example.com',
            email='docente@example.com',
            password='password'
        )
        self.docente.groups.add(docente_group)

        self.coordinacion = User.objects.create_user(
            username='coordinacion@example.com',
            email='coordinacion@example.com',
            password='password'
        )
        self.coordinacion.groups.add(coordinacion_group)

    def test_login_alumno_success(self):
        payload = {'email': 'alumno@example.com', 'password': 'password'}
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('role'), 'alumno')
        self.assertEqual(response.data.get('url'), '/alumno')

    def test_login_docente_success(self):
        payload = {'email': 'docente@example.com', 'password': 'password'}
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('role'), 'docente')
        self.assertEqual(response.data.get('url'), '/docente')

    def test_login_coordinacion_success(self):
        payload = {'email': 'coordinacion@example.com', 'password': 'password'}
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('role'), 'coordinacion')
        self.assertEqual(response.data.get('url'), '/coordinacion/inicio')

    def test_login_nonexistent_email(self):
        payload = {'email': 'missing@example.com', 'password': 'password'}
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_wrong_password(self):
        payload = {'email': 'alumno@example.com', 'password': 'wrong'}
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)