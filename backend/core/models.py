from django.db import models


class TimeStampedModel(models.Model):
    """Adds created_at / updated_at to any model. Abstract: creates no table."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
