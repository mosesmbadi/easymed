from django.db import models
from django.utils.translation import gettext_lazy as _

# Create your models here.

class Permission(models.Model):
    name = models.CharField(_("name"), max_length=255)

    def __str__(self) -> str:
        return self.name


class Group(models.Model):
    name = models.CharField(_("name"), max_length=150, unique=True)
    permissions = models.ManyToManyField(
        Permission,
        verbose_name=_("permissions"),
        blank=True,
    )

    def __str__(self) -> str:
        return self.name

