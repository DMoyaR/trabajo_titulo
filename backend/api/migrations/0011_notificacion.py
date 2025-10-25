import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_propuestatema"),
    ]

    operations = [
        migrations.CreateModel(
            name="Notificacion",
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
                ("mensaje", models.TextField()),
                (
                    "tipo",
                    models.CharField(
                        choices=[("propuesta", "Propuesta"), ("general", "General")],
                        default="general",
                        max_length=40,
                    ),
                ),
                ("leida", models.BooleanField(default=False)),
                ("meta", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "usuario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notificaciones",
                        to="api.usuario",
                    ),
                ),
            ],
            options={
                "db_table": "notificaciones",
                "ordering": ["-created_at"],
            },
        ),
    ]