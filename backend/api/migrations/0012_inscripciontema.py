import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0011_notificacion"),
    ]

    operations = [
        migrations.CreateModel(
            name="InscripcionTema",
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
                ("activo", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "alumno",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="inscripciones_tema",
                        to="api.usuario",
                    ),
                ),
                (
                    "tema",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="inscripciones",
                        to="api.temadisponible",
                    ),
                ),
            ],
            options={
                "db_table": "inscripciones_tema",
                "unique_together": {("tema", "alumno")},
            },
        ),
    ]