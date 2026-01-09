from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0039_practicafirmacoordinador_url_firma_digital_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="evaluacionentregaalumno",
            name="comentario_docente",
            field=models.TextField(blank=True, null=True),
        ),
    ]