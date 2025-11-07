import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0009_alter_usuario_carrera_solicitudcartapractica"),
    ]

    operations = [
        migrations.CreateModel(
            name="PropuestaTema",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("titulo", models.CharField(max_length=160)),
                ("objetivo", models.CharField(max_length=300)),
                ("descripcion", models.TextField()),
                ("rama", models.CharField(max_length=120)),
                (
                    "estado",
                    models.CharField(
                        choices=[
                            ("pendiente", "Pendiente"),
                            ("aceptada", "Aceptada"),
                            ("rechazada", "Rechazada"),
                        ],
                        default="pendiente",
                        max_length=20,
                    ),
                ),
                ("comentario_decision", models.TextField(blank=True, null=True)),
                ("preferencias_docentes", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "alumno",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="propuestas_tema",
                        to="api.usuario",
                    ),
                ),
                (
                    "docente",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="propuestas_revision",
                        to="api.usuario",
                    ),
                ),
            ],
            options={
                "db_table": "propuestas_tema",
                "ordering": ["-created_at"],
            },
        ),
    ]