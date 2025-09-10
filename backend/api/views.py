from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Task
from .serializers import TaskSerializer


REDIRECTS = {
    "alumno": "http://localhost:4200/alumno/dashboard",
    "docente": "http://localhost:4200/docente/dashboard",
    "coordinador": "http://localhost:4200/coordinacion/inicio",
}


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer


@api_view(["POST"])
def login_view(request):
    role = request.data.get("role")
    redirect_url = REDIRECTS.get(role)
    return Response({"redirect": redirect_url})