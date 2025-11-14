from django.db import migrations


SQL_COMMANDS = [
    """
    ALTER TABLE propuestas_tema
    ADD COLUMN IF NOT EXISTS cupos_requeridos integer NOT NULL DEFAULT 1
    """,
    """
    ALTER TABLE propuestas_tema
    ADD COLUMN IF NOT EXISTS correos_companeros jsonb NOT NULL DEFAULT '[]'::jsonb
    """,
    """
    ALTER TABLE propuestas_tema
    ADD COLUMN IF NOT EXISTS cupos_maximo_autorizado integer
    """,
]


def ensure_columns(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    for sql in SQL_COMMANDS:
        schema_editor.execute(sql)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_propuestatema_cupos_maximo_autorizado_and_more"),
    ]

    operations = [
        migrations.RunPython(ensure_columns, migrations.RunPython.noop)
    ]