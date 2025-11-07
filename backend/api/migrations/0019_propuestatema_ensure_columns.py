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


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_propuestatema_cupos_maximo_autorizado_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(sql, reverse_sql=migrations.RunSQL.noop)
                for sql in SQL_COMMANDS
            ],
            state_operations=[],
        )
    ]